/* eslint-disable no-console */
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { db, adminAuth, FieldValue } from './firebaseAdmin';
import {
  getPayPalSubscriptionDetails,
  cancelPayPalSubscriptionApi,
} from './utils/paypal';

if (admin.apps.length === 0) admin.initializeApp();

type Frequency = 'weekly' | 'monthly';

type ActivateFreeReq = {
  userId: string;
  planKey: string;             // e.g. "sub_mo_og_free"
  frequency: Frequency;
  credits: number;             // how many free credits to grant immediately
  referredBy?: string;
  promoCode?: string;
};
type ActivateFreeRes = { success: boolean; message?: string };

export const activateFreePlan = functions
  .region('us-central1')
  .https.onCall(async (data: ActivateFreeReq, context): Promise<ActivateFreeRes> => {
    const callerUid = context.auth?.uid;
    if (!callerUid) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const { userId, planKey, frequency, credits, referredBy } = (data || {}) as ActivateFreeReq;
    if (!userId || callerUid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Caller must match userId.');
    }
    if (!planKey || !frequency || typeof credits !== 'number' || credits < 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing/invalid free plan data.');
    }

    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

      const currentCredits = Number(snap.data()?.credits || 0) || 0;

      tx.set(
        userRef,
        {
          credits: currentCredits + credits,
          // mark “free plan”
          subscriptionStatus: 'free',
          planKey,
          planName: 'OG Free',
          billingCycle: frequency,
          subscriptionActivatedAt: FieldValue.serverTimestamp(),
          lastSubscriptionUpdate: FieldValue.serverTimestamp(),
          referredBy: referredBy || snap.data()?.referredBy || null,
          // kill any lingering PayPal reference
          paypalSubscriptionId: admin.firestore.FieldValue.delete(),
          paypalSubscriptionDetails: admin.firestore.FieldValue.delete(),
        },
        { merge: true }
      );

      // transaction log
      tx.set(userRef.collection('transactions').doc(), {
        type: 'free_plan_activation',
        creditsDelta: credits,
        timestamp: FieldValue.serverTimestamp(),
        description: `Activated OG Free (${frequency}).`,
        status: 'confirmed',
      });
    });

    return { success: true, message: 'Free plan activated.' };
  });

type GetStatusReq = { userId: string };
type GetStatusRes = {
  kind: 'none' | 'free' | 'paid';
  planKey?: string;
  planName?: string;
  frequency?: Frequency;
  paypalSubscriptionId?: string;
  status?: 'ACTIVE' | 'CANCELLED' | 'SUSPENDED' | 'PENDING' | 'UNKNOWN';
  renewsAt?: string;
};

export const getSubscriptionStatus = functions
  .region('us-central1')
  .https.onCall(async (data: GetStatusReq, context): Promise<GetStatusRes> => {
    const callerUid = context.auth?.uid;
    if (!callerUid) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { userId } = (data || {}) as GetStatusReq;
    if (!userId || userId !== callerUid) {
      throw new functions.https.HttpsError('permission-denied', 'Caller must match userId.');
    }

    const userRef = db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) return { kind: 'none' };

    const u = snap.data() || {};
    const planKey = u.planKey as string | undefined;
    const planName = u.planName as string | undefined;
    const frequency =
      (u.billingCycle as Frequency | undefined) ||
      (u.billing_cycle as Frequency | undefined);

    // If PayPal sub id exists, verify current status with PayPal
    const paypalSubscriptionId = u.paypalSubscriptionId as string | undefined;

    if (paypalSubscriptionId) {
      try {
        const details = await getPayPalSubscriptionDetails(paypalSubscriptionId);
        const status = (details?.status as GetStatusRes['status']) || 'UNKNOWN';
        const renewsAt =
          (details as any)?.billing_info?.next_billing_time ||
          (details as any)?.billing_info?.next_billing_date ||
          undefined;

        return {
          kind: status === 'ACTIVE' ? 'paid' : 'paid',
          planKey,
          planName,
          frequency,
          paypalSubscriptionId,
          status,
          renewsAt,
        };
      } catch (e) {
        functions.logger.warn('getSubscriptionStatus: PayPal lookup failed; falling back to Firestore only.', e);
        // fall through to Firestore-only logic
      }
    }

    // Firestore-only inference
    const statusText = (u.subscriptionStatus || '').toString().toLowerCase();
    if (statusText === 'free') {
      return { kind: 'free', planKey, planName, frequency, status: 'UNKNOWN' };
    }
    if (paypalSubscriptionId) {
      // We have a PayPal sub id but couldn’t fetch details → still “paid”, unknown status
      return { kind: 'paid', planKey, planName, frequency, paypalSubscriptionId, status: 'UNKNOWN' };
    }
    return { kind: 'none' };
  });

type CancelReq = { userId: string; paypalSubscriptionId: string; reason?: string };
type CancelRes = { success: boolean };

export const cancelPayPalSubscription = functions
  .region('us-central1')
  .https.onCall(async (data: CancelReq, context): Promise<CancelRes> => {
    const callerUid = context.auth?.uid;
    if (!callerUid) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const { userId, paypalSubscriptionId, reason } = (data || {}) as CancelReq;
    if (!userId || callerUid !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Caller must match userId.');
    }
    if (!paypalSubscriptionId) {
      throw new functions.https.HttpsError('invalid-argument', 'paypalSubscriptionId is required.');
    }

    // Verify user owns this subscription
    const userRef = db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');
    const currentSubId = (snap.data()?.paypalSubscriptionId || '').toString();
    if (!currentSubId || currentSubId !== paypalSubscriptionId) {
      throw new functions.https.HttpsError('failed-precondition', 'No matching active subscription for this user.');
    }

    // Call PayPal
    await cancelPayPalSubscriptionApi(paypalSubscriptionId, reason || 'User requested cancellation');

    // Update Firestore
    await userRef.set(
      {
        subscriptionStatus: 'cancelled',
        subscriptionCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSubscriptionUpdate: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true };
  });
