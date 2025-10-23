/* eslint-disable no-console */

// ────────────────────────────────────────────────────────────
// Gen-1 Firebase Functions imports
// ────────────────────────────────────────────────────────────
import * as functions from 'firebase-functions';
import { db, adminAuth, FieldValue, Timestamp } from './firebaseAdmin';
import { getPayPalOrderDetails } from './utils/paypal'; // still used by other flows if you keep it
import { getPayPalSubscriptionDetails } from './utils/paypal';

// ✅ Re-export the single source of truth for the callable:
export { processPayPalOneTimePayment } from './processPayPalOneTimePayment';

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────
const REGION = 'us-central1';
const NARRATUM_ADMIN_UID = 'bOKyhlO8sofk5O4dGRTZAIfdYSx2';


const ALLOWLIST = new Set<string>([
  'https://storyreader.narratum.app',
  'https://narratum.app',
  'https://www.narratum.app',
  'http://localhost:3000',
]);

const CREDIT_SPLIT_CONFIG = {
  read:   { AI_STORAGE: 0.10, APP_CUT: 0.10, ROYALTY: 0.60, REFERRAL: 0.20 },
  create: { AI_STORAGE: 0.35, APP_CUT: 0.25, ROYALTY: 0.00, REFERRAL: 0.40 },
} as const;

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
type JsonObject = Record<string, unknown>;
function hasStringMessage(x: unknown): x is { message: string } {
  return typeof x === 'object' && x !== null && 'message' in x && typeof (x as JsonObject).message === 'string';
}
function extractMessage(x: unknown, fallback: string) {
  if (typeof x === 'string') return x;
  if (hasStringMessage(x)) return x.message;
  try { return JSON.stringify(x); } catch { return fallback; }
}

type ChargingModel = 'one-time' | 'pay-per-open';

function resolveStoryPricing(story: any): { cost: number; charging: ChargingModel } {
  const typeRaw =
    (story?.type ?? story?.storyType ?? story?.metadata?.storyType ?? '').toString().toLowerCase();
  const planRaw =
    (story?.plan ?? story?.creatorPlan ?? story?.metadata?.plan ?? '').toString().toLowerCase();

  const isConvai =
    !!story?.elevenlabsAgentId ||
    !!story?.elevenLabsAgentId ||
    !!story?.voiceAgentId ||
    !!story?.agentId ||
    !!story?.metadata?.elevenlabsAgentId ||
    !!story?.metadata?.voiceAgentId;

  const isPremiumFlag = Boolean(story?.isPremium);

  let bucket: 'basic' | 'premium' | 'convai' = 'basic';
  if (isConvai || planRaw === 'convai' || typeRaw === 'convai') bucket = 'convai';
  else if (
    ['premium', 'paid', 'pro'].includes(planRaw) ||
    typeRaw === 'premium' ||
    isPremiumFlag
  ) bucket = 'premium';

  const cost = bucket === 'convai' ? 15 : bucket === 'premium' ? 5 : 1;
  const charging: ChargingModel = (bucket === 'convai' || isPremiumFlag) ? 'pay-per-open' : 'one-time';
  return { cost, charging };
}

// CORS
function applyCors(res: functions.Response, origin?: string | null) {
  const o = origin ?? '';
  if (ALLOWLIST.has(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ────────────────────────────────────────────────────────────
// (1) REMOVED HERE — processPayPalOneTimePayment lives in its own file
//     and is re-exported above to avoid duplicate symbols.
// ────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────
/** 2) Shared core for “deduct credits for read” */
// ────────────────────────────────────────────────────────────
type DeductInput = { storyId: string; checkOnly?: boolean };
type DeductResult = {
  success: boolean;
  storyId: string;
  chargingModel: ChargingModel;
  price: number;
  alreadyOwned: boolean;
  needsPayment: boolean;
  charged?: number;
  remainingCredits: number;
};

async function performDeductCreditsForRead(
  uid: string,
  { storyId, checkOnly }: DeductInput
): Promise<DeductResult> {
  const storyRef    = db.collection('stories').doc(storyId);
  const readerRef   = db.collection('users').doc(uid);
  const adminRef    = db.collection('users').doc(NARRATUM_ADMIN_UID);
  const purchaseRef = readerRef.collection('purchases').doc(storyId);

  return await db.runTransaction(async (tx) => {
    const [storyDoc, readerDoc, adminDoc, priorPurchaseDoc] = await Promise.all([
      tx.get(storyRef),
      tx.get(readerRef),
      tx.get(adminRef),
      tx.get(purchaseRef),
    ]);

    if (!storyDoc.exists)  throw new functions.https.HttpsError('not-found', 'Story not found.');
    if (!readerDoc.exists) throw new functions.https.HttpsError('not-found', 'Reader user not found.');
    if (!adminDoc.exists)  throw new functions.https.HttpsError('not-found', `Admin user ${NARRATUM_ADMIN_UID} not found.`);

    const story = storyDoc.data() || {};
    const { cost, charging } = resolveStoryPricing(story);

    const alreadyOwned = charging === 'one-time' && priorPurchaseDoc.exists;
    const needsPayment = charging === 'pay-per-open' ? true : !alreadyOwned;
    const currentCredits = Number(readerDoc.data()?.credits || 0) || 0;

    if (checkOnly) {
      return {
        success: true,
        storyId,
        chargingModel: charging,
        price: needsPayment ? cost : 0,
        alreadyOwned,
        needsPayment,
        remainingCredits: currentCredits,
      };
    }

    if (!needsPayment) {
      tx.set(readerRef.collection('reads').doc(), {
        type: 'access',
        storyId,
        timestamp: FieldValue.serverTimestamp(),
        description: `Accessed already-owned story "${story.title || storyId}".`,
      });
      return {
        success: true,
        storyId,
        chargingModel: 'one-time',
        price: 0,
        alreadyOwned: true,
        needsPayment: false,
        charged: 0,
        remainingCredits: currentCredits,
      };
    }

    if (currentCredits < cost) {
      throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.', {
        remainingCredits: currentCredits,
      });
    }

    // Optional referrer
    const referrerUid = readerDoc.data()?.referredBy as string | undefined;
    const referrerRef = referrerUid ? db.collection('users').doc(referrerUid) : null;
    const referrerDoc = referrerRef ? await tx.get(referrerRef) : null;

    // Deduct
    tx.update(readerRef, { credits: currentCredits - cost });
    tx.set(readerRef.collection('transactions').doc(), {
      type: 'read',
      creditsDelta: -cost,
      storyId,
      timestamp: FieldValue.serverTimestamp(),
      description: `Deducted ${cost} credits for reading "${story.title || storyId}".`,
      status: 'confirmed',
      chargingModel: charging,
    });

    // Mark purchase for one-time
    if (charging === 'one-time') {
      tx.set(purchaseRef, {
        storyId,
        purchasedAt: FieldValue.serverTimestamp(),
        pricePaid: cost,
        lifetimeAccess: true,
        storyTitle: story.title || null,
        storyType: story?.type ?? null,
      });
    }

    // Split distribution
    const split = CREDIT_SPLIT_CONFIG.read;
    let distributed = 0;

    const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
    const appCutAmount    = Math.floor(cost * split.APP_CUT);
    const adminTotal      = aiStorageAmount + appCutAmount;

    if (adminTotal > 0) {
      tx.update(adminRef, { credits: (Number(adminDoc.data()?.credits || 0) || 0) + adminTotal });
      tx.set(adminRef.collection('transactions').doc(), {
        type: 'profit',
        creditsDelta: adminTotal,
        timestamp: FieldValue.serverTimestamp(),
        description: `AI+Storage (${aiStorageAmount}) + App Cut (${appCutAmount}) from read by ${uid} (story ${storyId}).`,
        sourceUid: uid,
        storyId,
        status: 'confirmed',
      });
      distributed += adminTotal;
    }

    const ownerUid = (story.ownerUid || story.ownerId || story.creatorUid || story.userId) as string | undefined;
    if (ownerUid && ownerUid !== uid) {
      const royaltyAmount = Math.floor(cost * split.ROYALTY);
      if (royaltyAmount > 0) {
        const ownerRef = db.collection('users').doc(ownerUid);
        const ownerDoc = await tx.get(ownerRef);
        if (ownerDoc.exists) {
          tx.update(ownerRef, { credits: (Number(ownerDoc.data()?.credits || 0) || 0) + royaltyAmount });
          tx.set(ownerRef.collection('transactions').doc(), {
            type: 'profit',
            creditsDelta: royaltyAmount,
            timestamp: FieldValue.serverTimestamp(),
            description: `Royalty from ${uid} for story "${story.title || storyId}".`,
            sourceUid: uid,
            storyId,
            status: 'confirmed',
          });
          distributed += royaltyAmount;
        }
      }
    }

    const referralAmount = Math.floor(cost * split.REFERRAL);
    if (referralAmount > 0) {
      if (referrerUid && referrerDoc?.exists && referrerUid !== uid) {
        tx.update(referrerRef!, { credits: (Number(referrerDoc.data()?.credits || 0) || 0) + referralAmount });
        tx.set(referrerRef!.collection('transactions').doc(), {
          type: 'profit',
          creditsDelta: referralAmount,
          timestamp: FieldValue.serverTimestamp(),
          description: `Referral earnings from ${uid} reading story ${storyId}.`,
          sourceUid: uid,
          storyId,
          status: 'confirmed',
        });
        distributed += referralAmount;
      } else {
        const adminCurrent = (Number(adminDoc.data()?.credits || 0) || 0);
        tx.update(adminRef, { credits: adminCurrent + referralAmount });
        tx.set(adminRef.collection('transactions').doc(), {
          type: 'profit',
          creditsDelta: referralAmount,
          timestamp: FieldValue.serverTimestamp(),
          description: `Referral fallback from ${uid} reading ${storyId}.`,
          sourceUid: uid,
          storyId,
          status: 'confirmed',
        });
        distributed += referralAmount;
      }
    }

    // Remainder (floor rounding)
    const remainder = cost - distributed;
    if (remainder > 0) {
      const adminCurrent = (Number(adminDoc.data()?.credits || 0) || 0);
      tx.update(adminRef, { credits: adminCurrent + remainder });
      tx.set(adminRef.collection('transactions').doc(), {
        type: 'profit',
        creditsDelta: remainder,
        timestamp: FieldValue.serverTimestamp(),
        description: `Rounding adjustment from ${uid} reading ${storyId}.`,
        sourceUid: uid,
        storyId,
        status: 'confirmed',
      });
    }

    return {
      success: true,
      storyId,
      chargingModel: charging,
      price: cost,
      alreadyOwned: false,
      needsPayment: true,
      charged: cost,
      remainingCredits: currentCredits - cost,
    };
  });
}

// ────────────────────────────────────────────────────────────
/** 2A) Callable — Deduct credits for reading (preferred) */
// ────────────────────────────────────────────────────────────
export const deductCreditsForRead = functions
  .region(REGION)
  .https.onCall(async (data: DeductInput, context): Promise<DeductResult> => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    try {
      if (!data?.storyId) throw new functions.https.HttpsError('invalid-argument', 'Story ID is required.');
      return await performDeductCreditsForRead(uid, data);
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('deductCreditsForRead (callable) unexpected error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to deduct credits for read.', extractMessage(error, 'Unknown error'));
    }
  });

// ────────────────────────────────────────────────────────────
/** 2B) HTTP mirror — Deduct credits for reading with CORS */
// ────────────────────────────────────────────────────────────
export const deductCreditsForReadHttp = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    applyCors(res, req.headers.origin as string | undefined);

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      const authHeader = (req.headers.authorization || '').toString();
      const m = authHeader.match(/^Bearer\s+(.+)$/i);
      if (!m) {
        res.status(401).json({ error: 'Missing Authorization bearer token.' });
        return;
      }

      const decoded = await adminAuth.verifyIdToken(m[1]);
      const uid = decoded.uid;
      const body = req.body as DeductInput;
      if (!body?.storyId) {
        res.status(400).json({ error: 'Story ID is required.' });
        return;
      }

      const out = await performDeductCreditsForRead(uid, body);
      res.status(200).json(out);
      return;
    } catch (error: any) {
      console.error('deductCreditsForRead (HTTP) error:', error);
      if (error instanceof functions.https.HttpsError) {
        const code =
          (error as any).code === 'not-found' ? 404 :
          (error as any).code === 'failed-precondition' ? 412 :
          (error as any).code === 'unauthenticated' ? 401 : 400;
        res.status(code).json({ error: error.message, details: (error as any).details ?? undefined });
        return;
      }
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
  });

// ────────────────────────────────────────────────────────────
/** 4) Callable — Send a tip */
// ────────────────────────────────────────────────────────────
type TipReq = { targetUid?: string; amount?: number };
type TipRes = { success: boolean; message?: string };

export const sendTipToWriter = functions
  .region(REGION)
  .https.onCall(async (data: TipReq, context): Promise<TipRes> => {
    const senderUid = context.auth?.uid;
    if (!senderUid) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const { targetUid, amount } = (data || {}) as TipReq;
    if (!targetUid || typeof amount !== 'number' || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Target UID and positive amount are required.');
    }
    if (senderUid === targetUid) throw new functions.https.HttpsError('invalid-argument', 'Cannot tip yourself.');

    try {
      const senderRef = db.collection('users').doc(senderUid);
      const targetRef = db.collection('users').doc(targetUid);

      const result = await db.runTransaction(async (tx) => {
        const [senderDoc, targetDoc] = await Promise.all([tx.get(senderRef), tx.get(targetRef)]);
        if (!senderDoc.exists) throw new functions.https.HttpsError('not-found', 'Sender not found.');
        if (!targetDoc.exists) throw new functions.https.HttpsError('not-found', 'Target not found.');

        const senderCredits = Number(senderDoc.data()?.credits || 0) || 0;
        if (senderCredits < amount) throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.');

        tx.update(senderRef, { credits: senderCredits - amount });
        tx.set(senderRef.collection('transactions').doc(), {
          type: 'tip_given',
          creditsDelta: -amount,
          targetUid,
          timestamp: FieldValue.serverTimestamp(),
          description: `Sent ${amount} credits as a tip to ${targetDoc.data()?.displayName || targetUid}.`,
          status: 'confirmed',
        });

        const targetCredits = Number(targetDoc.data()?.credits || 0) || 0;
        tx.update(targetRef, { credits: targetCredits + amount });
        tx.set(targetRef.collection('transactions').doc(), {
          type: 'tip_received',
          creditsDelta: amount,
          sourceUid: senderUid,
          timestamp: FieldValue.serverTimestamp(),
          description: `Received ${amount} credits as a tip from ${senderDoc.data()?.displayName || senderUid}.`,
          status: 'confirmed',
        });

        return { success: true, message: 'Tip sent.' };
      });

      return result;
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) throw error;
      console.error('sendTipToWriter unexpected error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to send tip.', extractMessage(error, 'Unknown error'));
    }
  });

// ────────────────────────────────────────────────────────────
/** 5) Callable — Process PayPal subscription (via Next API) */
// ────────────────────────────────────────────────────────────
type SubReq = {
  subscriptionID?: string;
  planId?: string;                             // your plan label/name (optional but helpful)
  frequency?: 'weekly' | 'monthly';
  price?: number;                              // USD
  credits?: number;                            // credits per cycle
  referredBy?: string;
};
type SubRes = { success: boolean; message?: string; status?: string; subscriptionId?: string };

export const processPayPalSubscription = functions
  .region(REGION)
  .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] }) // ensure tokens are available
  .https.onCall(async (raw: SubReq, context): Promise<SubRes> => {
    const userId = context.auth?.uid;
    if (!userId) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const { subscriptionID, planId, frequency, price, credits, referredBy } = raw || {};
    if (!subscriptionID || !frequency || !price || !credits) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Missing required fields: subscriptionID, frequency, price, credits.'
      );
    }

    try {
      // 1) Pull the latest state from PayPal
      const sub = await getPayPalSubscriptionDetails(subscriptionID);
      if (!sub) throw new functions.https.HttpsError('not-found', 'Subscription not found at PayPal.');

      const status = sub.status; // APPROVAL_PENDING | APPROVED | ACTIVE | SUSPENDED | CANCELLED | EXPIRED
      const isActiveish = status === 'ACTIVE' || status === 'APPROVED'; // some merchants see APPROVED briefly before ACTIVE

      // 2) Store/Update subscription doc (used by webhook later)
      const subRef = db.collection('paypalSubscriptions').doc(subscriptionID);
      await subRef.set(
        {
          userId,
          planId: planId || sub.plan_id || null,
          frequency,
          price,
          creditsPerCycle: credits,
          status,
          referredBy: referredBy || null,
          lastSyncedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // 3) If active right now, credit immediately and mark user’s subscription
      if (isActiveish) {
        await db.runTransaction(async (tx) => {
          const userRef = db.collection('users').doc(userId);
          const snap = await tx.get(userRef);
          if (!snap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

          // Check for existing initial credit transaction to prevent double-crediting
          // ✅ Build query from db, then read it via tx.get(query)
          const txCol = db.collection('users').doc(userId).collection('transactions');
          const q = txCol
            .where('type', '==', 'subscription_initial')
            .where('paypalSubscriptionId', '==', subscriptionID)
            .limit(1);

          const existingTransactionSnap = await tx.get(q);

          if (!existingTransactionSnap.empty) {
            functions.logger.info(`Initial credit for subscription ${subscriptionID} already granted to user ${userId}. Skipping.`);
            return; // Exit transaction if already credited
          }

          const currentCredits = Number(snap.data()?.credits || 0) || 0;
          tx.update(userRef, {
            credits: currentCredits + credits,
            subscription: {
              subscriptionId: subscriptionID,
              planId: planId || sub.plan_id || null,
              frequency,
              price,
              creditsPerCycle: credits,
              status,
              lastPaymentAt: FieldValue.serverTimestamp(),
            },
          });

          tx.set(userRef.collection('transactions').doc(), {
            type: 'subscription_initial',
            creditsDelta: credits,
            amountUsd: price,
            paypalSubscriptionId: subscriptionID,
            status: 'confirmed',
            timestamp: FieldValue.serverTimestamp(),
            description: `Initial subscription credit (${frequency}).`,
          });
        });
      }

      return {
        success: true,
        status,
        subscriptionId: subscriptionID,
        message: isActiveish
          ? 'Subscription verified and credited.'
          : `Subscription recorded (status: ${status}). Will credit on activation webhook.`
      };
    } catch (err: any) {
      functions.logger.error('processPayPalSubscription error:', err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError('internal', err?.message || 'Unknown error');
    }
  });

// ────────────────────────────────────────────────────────────
/** 6) Scheduled — Monthly free credits (2:00 AM CR, 1st) */
// ────────────────────────────────────────────────────────────
export const grantMonthlyFreeCredits = functions
  .region(REGION) 
  .pubsub.schedule('0 2 1 * *') // 2:00 AM on the 1st of each month
  .timeZone('America/Costa_Rica')
  .onRun(async () => {
    const usersRef = db.collection('users');
    const freeCreditsAmount = 25;

    const now = Timestamp.now();
    const current = now.toDate();
    const currentMonth = current.getMonth();
    const currentYear  = current.getFullYear();

    try {
      const snapshot = await usersRef.get();
      const updates: Promise<unknown>[] = [];

      snapshot.forEach((docSnap) => {
        const userData = docSnap.data();
        const lastGrantTimestamp = userData?.lastMonthlyCreditGrant as Timestamp | undefined;

        const shouldGrant =
          !lastGrantTimestamp ||
          lastGrantTimestamp.toDate().getMonth() !== currentMonth ||
          lastGrantTimestamp.toDate().getFullYear() !== currentYear;

        if (shouldGrant) {
          const userRef = docSnap.ref;
          updates.push(
            db.runTransaction(async (tx) => {
              const userDoc = await tx.get(userRef);
              if (!userDoc.exists) return;

              const currentCredits = Number(userDoc.data()?.credits || 0) || 0;
              tx.update(userRef, {
                credits: currentCredits + freeCreditsAmount,
                lastMonthlyCreditGrant: now,
              });

              tx.set(userRef.collection('transactions').doc(), {
                type: 'free_monthly_grant',
                creditsDelta: freeCreditsAmount,
                timestamp: now,
                description: `Received ${freeCreditsAmount} free monthly credits.`,
                status: 'confirmed',
              });
            })
          );
        }
      });

      await Promise.all(updates);
      console.log('Monthly free credits granted to eligible users.');
      return null;
    } catch (error) {
      console.error('Error granting monthly free credits:', error);
      throw new functions.https.HttpsError('internal', 'Failed to grant monthly free credits.', (error as Error).message);
    }
  });