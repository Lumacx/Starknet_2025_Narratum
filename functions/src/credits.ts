// functions/src/credits.ts
import * as functions from 'firebase-functions';
import cors from 'cors';
import { db, adminAuth, FieldValue, Timestamp } from './firebaseAdmin';
import { verifyPayPalOrder } from './utils/paypal';

/* ────────────────────────────────────────────────────────────
   Constants
   ──────────────────────────────────────────────────────────── */
const NARRATUM_ADMIN_UID = 'bOKyhlO8sofk5O4dGRTZAIfdYSx2';

const CREDIT_SPLIT_CONFIG = {
  read:    { AI_STORAGE: 0.10, APP_CUT: 0.10, ROYALTY: 0.60, REFERRAL: 0.20 },
  create:  { AI_STORAGE: 0.35, APP_CUT: 0.25, ROYALTY: 0.00, REFERRAL: 0.40 },
} as const;

/* ────────────────────────────────────────────────────────────
   Helpers
   ──────────────────────────────────────────────────────────── */
type JsonObject = Record<string, unknown>;
function hasStringMessage(x: unknown): x is { message: string } {
  return typeof x === 'object' && x !== null && 'message' in x && typeof (x as JsonObject).message === 'string';
}
function extractMessage(x: unknown, fallback: string) {
  if (typeof x === 'string') return x;
  if (hasStringMessage(x)) return x.message;
  try { return JSON.stringify(x); } catch { return fallback; }
}

/* ────────────────────────────────────────────────────────────
   1) HTTP onRequest — PayPal one-time payments (with CORS)
   ──────────────────────────────────────────────────────────── */
const corsHandler = cors({ origin: true, credentials: true });

export const processPayPalPayment = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
      if (req.method !== 'POST')    { res.status(405).send('Method Not Allowed'); return; }

      try {
        const { orderId, userId, amount } = req.body as { orderId?: string; userId?: string; amount?: number };
        if (!orderId || !userId || typeof amount !== 'number' || amount <= 0) {
          res.status(400).send('Invalid request: orderId, userId, and positive amount are required.'); return;
        }

        const orderDetails = await verifyPayPalOrder(orderId);
        if (!orderDetails || orderDetails.status !== 'COMPLETED') {
          console.error('PayPal order not completed:', orderDetails);
          res.status(400).send('PayPal order not completed or invalid.'); return;
        }

        const purchaseUnit = orderDetails.purchase_units?.[0];
        const paypalAmount = purchaseUnit?.amount?.value ? parseFloat(purchaseUnit.amount.value) : 0;
        const userRef = db.collection('users').doc(userId);

        await db.runTransaction(async (transaction) => {
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

          const currentCredits = (userDoc.data()?.credits || 0) as number;
          transaction.update(userRef, { credits: currentCredits + amount });

          const txRef = userRef.collection('transactions').doc();
          transaction.set(txRef, {
            type: 'purchase',
            creditsDelta: amount,
            amountUsd: paypalAmount,
            timestamp: FieldValue.serverTimestamp(),
            description: `Purchased ${amount} credits via PayPal (Order ID: ${orderId})`,
            paypalOrderId: orderId,
            status: 'confirmed',
          });
        });

        res.status(200).send('Credits added successfully.');
      } catch (error) {
        console.error('Error processing PayPal payment:', error);
        if (error instanceof functions.https.HttpsError) {
          res.status(error.code === 'not-found' ? 404 : 500).send(error.message);
        } else {
          res.status(500).send('Internal Server Error');
        }
      }
    });
  });

/* ────────────────────────────────────────────────────────────
   2) Callable — Deduct credits for reading a story (with preflight)
   Charging model:
     - Pay-per-open: story.type === 'convai' OR story.isPremium === true
     - One-time:     everything else (lifetime access after first charge)
   Tracks purchases in users/{uid}/purchases/{storyId}
   ──────────────────────────────────────────────────────────── */
type DeductInput = { storyId: string; checkOnly?: boolean };
type DeductResult = {
  success: boolean;
  storyId: string;
  chargingModel: 'one-time' | 'pay-per-open';
  price: number;
  alreadyOwned: boolean;
  needsPayment: boolean;
  charged?: number;
  remainingCredits: number;
};

export const deductCreditsForRead = functions
  .region('us-central1')
  .https.onCall(async (data: DeductInput, context): Promise<DeductResult> => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const readerUid = context.auth.uid;
    const { storyId, checkOnly } = (data || {}) as DeductInput;
    if (!storyId) throw new functions.https.HttpsError('invalid-argument', 'Story ID is required.');

    try {
      const storyRef    = db.collection('stories').doc(storyId);
      const readerRef   = db.collection('users').doc(readerUid);
      const adminRef    = db.collection('users').doc(NARRATUM_ADMIN_UID);
      const purchaseRef = readerRef.collection('purchases').doc(storyId);

      const result = await db.runTransaction(async (transaction) => {
        const [storyDoc, readerDoc, adminDoc, priorPurchaseDoc] = await Promise.all([
          transaction.get(storyRef),
          transaction.get(readerRef),
          transaction.get(adminRef),
          transaction.get(purchaseRef),
        ]);

        if (!storyDoc.exists) throw new functions.https.HttpsError('not-found', 'Story not found.');
        if (!readerDoc.exists) throw new functions.https.HttpsError('not-found', 'Reader user not found.');
        if (!adminDoc.exists)  throw new functions.https.HttpsError('not-found', `Admin user ${NARRATUM_ADMIN_UID} not found.`);

        const story = storyDoc.data() || {};
        const storyType = (story.type as string) || 'basic';
        const isPremiumFlag = !!story.isPremium;

        // ── Price table
        let cost = 0;
        switch (storyType) {
          case 'basic':   cost = 1;  break;
          case 'premium': cost = 5;  break;
          case 'convai':  cost = 15; break;
          default:        cost = 1;
        }

        // ── Charging model
        const isPayPerOpen = storyType === 'convai' || isPremiumFlag === true;

        // ── Ownership check (for one-time model)
        const alreadyOwned = !isPayPerOpen && priorPurchaseDoc.exists;
        const needsPayment = isPayPerOpen ? true : !alreadyOwned;
        const price = needsPayment ? cost : 0;

        const currentCredits = (readerDoc.data()?.credits || 0) as number;

        // Pure preflight
        if (checkOnly) {
          return {
            success: true,
            storyId,
            chargingModel: isPayPerOpen ? 'pay-per-open' : 'one-time',
            price,
            alreadyOwned,
            needsPayment,
            remainingCredits: currentCredits,
          } as DeductResult;
        }

        // If no payment needed (owned one-time content), just log access
        if (!needsPayment) {
          transaction.set(readerRef.collection('reads').doc(), {
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
          } as DeductResult;
        }

        // Enough credits?
        if (currentCredits < cost) {
          throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.', { remainingCredits: currentCredits });
        }

        // Optional referrer
        const referrerUid = readerDoc.data()?.referredBy as string | undefined;
        const referrerRef = referrerUid ? db.collection('users').doc(referrerUid) : null;
        const referrerDoc = referrerRef ? await transaction.get(referrerRef) : null;

        // ── Deduct
        transaction.update(readerRef, { credits: currentCredits - cost });
        transaction.set(readerRef.collection('transactions').doc(), {
          type: 'read',
          creditsDelta: -cost,
          storyId,
          timestamp: FieldValue.serverTimestamp(),
          description: `Deducted ${cost} credits for reading "${story.title || storyId}".`,
          status: 'confirmed',
          chargingModel: isPayPerOpen ? 'pay-per-open' : 'one-time',
        });

        // ── Mark purchase for one-time model
        if (!isPayPerOpen) {
          transaction.set(purchaseRef, {
            storyId,
            purchasedAt: FieldValue.serverTimestamp(),
            pricePaid: cost,
            lifetimeAccess: true,
            storyTitle: story.title || null,
            storyType,
          });
        }

        // ── Split distribution
        const split = CREDIT_SPLIT_CONFIG.read;
        let distributed = 0;

        const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
        const appCutAmount    = Math.floor(cost * split.APP_CUT);
        const adminTotal      = aiStorageAmount + appCutAmount;

        if (adminTotal > 0) {
          transaction.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
          transaction.set(adminRef.collection('transactions').doc(), {
            type: 'profit',
            creditsDelta: adminTotal,
            timestamp: FieldValue.serverTimestamp(),
            description: `AI+Storage (${aiStorageAmount}) + App Cut (${appCutAmount}) from read by ${readerUid} (story ${storyId}).`,
            sourceUid: readerUid,
            storyId,
            status: 'confirmed',
          });
          distributed += adminTotal;
        }

        const ownerUid = story.ownerUid as string | undefined;
        if (ownerUid && ownerUid !== readerUid) {
          const royaltyAmount = Math.floor(cost * split.ROYALTY);
          if (royaltyAmount > 0) {
            const ownerRef = db.collection('users').doc(ownerUid);
            const ownerDoc = await transaction.get(ownerRef);
            if (ownerDoc.exists) {
              transaction.update(ownerRef, { credits: (ownerDoc.data()?.credits || 0) + royaltyAmount });
              transaction.set(ownerRef.collection('transactions').doc(), {
                type: 'profit',
                creditsDelta: royaltyAmount,
                timestamp: FieldValue.serverTimestamp(),
                description: `Royalty from ${readerUid} for story "${story.title || storyId}".`,
                sourceUid: readerUid,
                storyId,
                status: 'confirmed',
              });
              distributed += royaltyAmount;
            }
          }
        }

        const referralAmount = Math.floor(cost * split.REFERRAL);
        if (referralAmount > 0) {
          if (referrerUid && referrerDoc?.exists && referrerUid !== readerUid) {
            transaction.update(referrerRef!, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
            transaction.set(referrerRef!.collection('transactions').doc(), {
              type: 'profit',
              creditsDelta: referralAmount,
              timestamp: FieldValue.serverTimestamp(),
              description: `Referral earnings from ${readerUid} reading story ${storyId}.`,
              sourceUid: readerUid,
              storyId,
              status: 'confirmed',
            });
            distributed += referralAmount;
          } else {
            const adminCurrent = (adminDoc.data()?.credits || 0) as number;
            transaction.update(adminRef, { credits: adminCurrent + referralAmount });
            transaction.set(adminRef.collection('transactions').doc(), {
              type: 'profit',
              creditsDelta: referralAmount,
              timestamp: FieldValue.serverTimestamp(),
              description: `Referral fallback from ${readerUid} reading story ${storyId}.`,
              sourceUid: readerUid,
              storyId,
              status: 'confirmed',
            });
            distributed += referralAmount;
          }
        }

        // Remainder due to floors
        const remainder = cost - distributed;
        if (remainder > 0) {
          const adminCurrent = (adminDoc.data()?.credits || 0) as number;
          transaction.update(adminRef, { credits: adminCurrent + remainder });
          transaction.set(adminRef.collection('transactions').doc(), {
            type: 'profit',
            creditsDelta: remainder,
            timestamp: FieldValue.serverTimestamp(),
            description: `Rounding adjustment from ${readerUid} reading ${storyId}.`,
            sourceUid: readerUid,
            storyId,
            status: 'confirmed',
          });
        }

        return {
          success: true,
          storyId,
          chargingModel: isPayPerOpen ? 'pay-per-open' : 'one-time',
          price: cost,
          alreadyOwned: false,
          needsPayment: true,
          charged: cost,
          remainingCredits: currentCredits - cost,
        } as DeductResult;
      });

      return result;
    } catch (error: any) {
      console.error('Error deducting credits for read:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to deduct credits for read.', error?.message);
    }
  });

/* ────────────────────────────────────────────────────────────
   3) Callable — Deduct credits for story creation
   (unchanged logic)
   ──────────────────────────────────────────────────────────── */
export const deductCreditsForCreation = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const creatorUid = context.auth.uid;
    const { storyType } = (data || {}) as { storyType?: 'basic' | 'premium' | 'convai' };
    if (!storyType || !['basic', 'premium', 'convai'].includes(storyType)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid story type.');
    }

    try {
      const creatorRef = db.collection('users').doc(creatorUid);
      const adminRef   = db.collection('users').doc(NARRATUM_ADMIN_UID);

      const result = await db.runTransaction(async (transaction) => {
        const [creatorDoc, adminDoc] = await Promise.all([
          transaction.get(creatorRef),
          transaction.get(adminRef),
        ]);

        if (!creatorDoc.exists) throw new functions.https.HttpsError('not-found', 'Creator user not found.');
        if (!adminDoc.exists)   throw new functions.https.HttpsError('not-found', `Admin user ${NARRATUM_ADMIN_UID} not found.`);

        let cost = 0;
        switch (storyType) {
          case 'basic':   cost = 5;  break;
          case 'premium': cost = 10; break;
          case 'convai':  cost = 15; break;
          default:        cost = 5;
        }

        const creatorCredits = (creatorDoc.data()?.credits || 0) as number;
        if (creatorCredits < cost) {
          throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.', { remainingCredits: creatorCredits });
        }

        const referrerUid = creatorDoc.data()?.referredBy as string | undefined;
        const referrerRef = referrerUid ? db.collection('users').doc(referrerUid) : null;
        const referrerDoc = referrerRef ? await transaction.get(referrerRef) : null;

        transaction.update(creatorRef, { credits: creatorCredits - cost });
        transaction.set(creatorRef.collection('transactions').doc(), {
          type: 'create',
          creditsDelta: -cost,
          timestamp: FieldValue.serverTimestamp(),
          description: `Deducted ${cost} credits for creating a ${storyType} story.`,
          storyType,
          status: 'confirmed',
        });

        const split = CREDIT_SPLIT_CONFIG.create;
        let distributed = 0;

        const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
        const appCutAmount    = Math.floor(cost * split.APP_CUT);
        const adminTotal      = aiStorageAmount + appCutAmount;

        if (adminTotal > 0) {
          transaction.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
          transaction.set(adminRef.collection('transactions').doc(), {
            type: 'profit',
            creditsDelta: adminTotal,
            timestamp: FieldValue.serverTimestamp(),
            description: `AI+Storage (${aiStorageAmount}) + App Cut (${appCutAmount}) from ${creatorUid} creating ${storyType}.`,
            sourceUid: creatorUid,
            storyType,
            status: 'confirmed',
          });
          distributed += adminTotal;
        }

        const referralAmount = Math.floor(cost * split.REFERRAL);
        if (referralAmount > 0) {
          if (referrerUid && referrerDoc?.exists && referrerUid !== creatorUid) {
            transaction.update(referrerRef!, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
            transaction.set(referrerRef!.collection('transactions').doc(), {
              type: 'profit',
              creditsDelta: referralAmount,
              timestamp: FieldValue.serverTimestamp(),
              description: `Referral earnings from ${creatorUid} creating ${storyType}.`,
              sourceUid: creatorUid,
              storyType,
              status: 'confirmed',
            });
            distributed += referralAmount;
          } else {
            const adminCurrent = (adminDoc.data()?.credits || 0) as number;
            transaction.update(adminRef, { credits: adminCurrent + referralAmount });
            transaction.set(adminRef.collection('transactions').doc(), {
              type: 'profit',
              creditsDelta: referralAmount,
              timestamp: FieldValue.serverTimestamp(),
              description: `Referral fallback from ${creatorUid} creating ${storyType}.`,
              sourceUid: creatorUid,
              storyType,
              status: 'confirmed',
            });
            distributed += referralAmount;
          }
        }

        const remainder = cost - distributed;
        if (remainder > 0) {
          const adminCurrent = (adminDoc.data()?.credits || 0) as number;
          transaction.update(adminRef, { credits: adminCurrent + remainder });
          transaction.set(adminRef.collection('transactions').doc(), {
            type: 'profit',
            creditsDelta: remainder,
            timestamp: FieldValue.serverTimestamp(),
            description: `Rounding adjustment from ${creatorUid} creating ${storyType}.`,
            sourceUid: creatorUid,
            storyType,
            status: 'confirmed',
          });
        }

        return { success: true, message: 'Credits deducted & distributed.', remainingCredits: creatorCredits - cost };
      });

      return result;
    } catch (error: any) {
      console.error('Error deducting credits for creation:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to deduct credits for creation.', error?.message);
    }
  });

/* ────────────────────────────────────────────────────────────
   4) Callable — Send a tip to a writer
   ──────────────────────────────────────────────────────────── */
export const sendTipToWriter = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const senderUid = context.auth.uid;
    const { targetUid, amount } = (data || {}) as { targetUid?: string; amount?: number };
    if (!targetUid || typeof amount !== 'number' || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Target UID and positive amount are required.');
    }
    if (senderUid === targetUid) throw new functions.https.HttpsError('invalid-argument', 'Cannot tip yourself.');

    try {
      const senderRef = db.collection('users').doc(senderUid);
      const targetRef = db.collection('users').doc(targetUid);

      const result = await db.runTransaction(async (transaction) => {
        const [senderDoc, targetDoc] = await Promise.all([
          transaction.get(senderRef),
          transaction.get(targetRef),
        ]);

        if (!senderDoc.exists) throw new functions.https.HttpsError('not-found', 'Sender not found.');
        if (!targetDoc.exists) throw new functions.https.HttpsError('not-found', 'Target not found.');

        const senderCredits = (senderDoc.data()?.credits || 0) as number;
        if (senderCredits < amount) throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.');

        transaction.update(senderRef, { credits: senderCredits - amount });
        transaction.set(senderRef.collection('transactions').doc(), {
          type: 'tip_given',
          creditsDelta: -amount,
          targetUid,
          timestamp: FieldValue.serverTimestamp(),
          description: `Sent ${amount} credits as a tip to ${targetDoc.data()?.displayName || targetUid}.`,
          status: 'confirmed',
        });

        const targetCredits = (targetDoc.data()?.credits || 0) as number;
        transaction.update(targetRef, { credits: targetCredits + amount });
        transaction.set(targetRef.collection('transactions').doc(), {
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
      console.error('Error sending tip:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to send tip.', error?.message);
    }
  });

/* ────────────────────────────────────────────────────────────
   5) Callable — Process PayPal subscriptions (proxy to Next API)
   ──────────────────────────────────────────────────────────── */
export const processPayPalSubscription = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const userId = context.auth.uid;
    const { subscriptionID, planId, frequency, price, credits, referredBy } = (data || {}) as {
      subscriptionID?: string;
      planId?: string;
      frequency?: 'weekly' | 'monthly';
      price?: number;
      credits?: number;
      referredBy?: string;
    };

    if (!planId || !frequency || typeof price !== 'number' || price <= 0 || typeof credits !== 'number' || credits <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid subscription details.');
    }

    try {
      const verifySubscriptionUrl = process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api/paypal-verify-subscription`
        : 'http://localhost:3000/api/paypal-verify-subscription';

      const firebaseAuthToken = await adminAuth.createCustomToken(userId);

      const resp = await fetch(verifySubscriptionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseAuthToken}` },
        body: JSON.stringify({ subscriptionID, planName: planId, billingCycle: frequency, price, credits, referredBy }),
      });

      const body: unknown = await resp.json();
      if (!resp.ok) {
        const msg = extractMessage(body, `Upstream error ${resp.status}`);
        throw new functions.https.HttpsError('unknown', msg);
      }
      return body as { success: boolean; message?: string; subscriptionId?: string; payerId?: string };
    } catch (error: any) {
      console.error('Error processing PayPal subscription:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to process PayPal subscription.', error?.message ?? 'Unknown error');
    }
  });

/* ────────────────────────────────────────────────────────────
   6) Scheduled — Monthly free credits (2:00 AM CR, 1st)
   ──────────────────────────────────────────────────────────── */
export const grantMonthlyFreeCredits = functions
  .region('us-central1')
  .pubsub
  .schedule('0 2 1 * *') // 2:00 AM on the 1st of each month
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

      snapshot.forEach((doc) => {
        const userData = doc.data();
        const lastGrantTimestamp = userData?.lastMonthlyCreditGrant as Timestamp | undefined;

        const shouldGrant =
          !lastGrantTimestamp ||
          lastGrantTimestamp.toDate().getMonth() !== currentMonth ||
          lastGrantTimestamp.toDate().getFullYear() !== currentYear;

        if (shouldGrant) {
          const userRef = doc.ref;
          updates.push(
            db.runTransaction(async (transaction) => {
              const userDoc = await transaction.get(userRef);
              if (!userDoc.exists) return;

              const currentCredits = (userDoc.data()?.credits || 0) as number;
              transaction.update(userRef, {
                credits: currentCredits + freeCreditsAmount,
                lastMonthlyCreditGrant: now,
              });

              transaction.set(userRef.collection('transactions').doc(), {
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
