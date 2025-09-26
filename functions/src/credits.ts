// functions/src/credits.ts
/* eslint-disable no-console */

// ────────────────────────────────────────────────────────────
// Gen-1 Firebase Functions imports
// ────────────────────────────────────────────────────────────
import * as functions from 'firebase-functions';
import cors from 'cors';
import { db, adminAuth, FieldValue, Timestamp } from './firebaseAdmin';
import { verifyPayPalOrder } from './utils/paypal';

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────
const REGION = 'us-central1';
const NARRATUM_ADMIN_UID = 'bOKyhlO8sofk5O4dGRTZAIfdYSx2';

const ALLOWED_ORIGINS = new Set<string>([
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

// Keep this *narrow* so TS won’t widen to string.
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
  else if (['premium', 'paid', 'pro'].includes(planRaw) || typeRaw === 'premium' || isPremiumFlag) bucket = 'premium';

  const cost = bucket === 'convai' ? 15 : bucket === 'premium' ? 5 : 1;
  const charging: ChargingModel = (bucket === 'convai' || isPremiumFlag) ? 'pay-per-open' : 'one-time';
  return { cost, charging };
}

// ────────────────────────────────────────────────────────────
// 1) HTTP (Gen-1) — PayPal one-time payment with CORS
// ────────────────────────────────────────────────────────────
const corsHandler = cors({ origin: true, credentials: true });

export const processPayPalPayment = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    const origin = req.headers.origin ?? '';
    if (ALLOWED_ORIGINS.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    corsHandler(req as any, res as any, async () => {
      if (req.method === 'OPTIONS') return res.status(204).send('');
      if (req.method !== 'POST')   return res.status(405).send('Method Not Allowed');

      try {
        const { orderId, userId, amount } = req.body as { orderId?: string; userId?: string; amount?: number };
        if (!orderId || !userId || typeof amount !== 'number' || amount <= 0) {
          return res.status(400).send('Invalid request: orderId, userId, and positive amount are required.');
        }

        const orderDetails = await verifyPayPalOrder(orderId);
        if (!orderDetails || orderDetails.status !== 'COMPLETED') {
          console.error('PayPal order not completed:', orderDetails);
          return res.status(400).send('PayPal order not completed or invalid.');
        }

        const purchaseUnit = orderDetails.purchase_units?.[0];
        const paypalAmount = purchaseUnit?.amount?.value ? parseFloat(purchaseUnit.amount.value) : 0;
        const userRef = db.collection('users').doc(userId);

        await db.runTransaction(async (tx) => {
          const userDoc = await tx.get(userRef);
          if (!userDoc.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

          const currentCredits = (userDoc.data()?.credits || 0) as number;
          tx.update(userRef, { credits: currentCredits + amount });

          const txRef = userRef.collection('transactions').doc();
          tx.set(txRef, {
            type: 'purchase',
            creditsDelta: amount,
            amountUsd: paypalAmount,
            timestamp: FieldValue.serverTimestamp(),
            description: `Purchased ${amount} credits via PayPal (Order ID: ${orderId})`,
            paypalOrderId: orderId,
            status: 'confirmed',
          });
        });

        return res.status(200).send('Credits added successfully.');
      } catch (err) {
        console.error('Error processing PayPal payment:', err);
        const msg = err instanceof functions.https.HttpsError ? err.message : 'Internal Server Error';
        return res
          .status(err instanceof functions.https.HttpsError && (err as any).code === 'not-found' ? 404 : 500)
          .send(msg);
      }
    });
  });

// ────────────────────────────────────────────────────────────
// 2) Callable (Gen-1) — Deduct credits for reading (with preflight)
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

export const deductCreditsForRead = functions
  .region(REGION)
  .https.onCall(async (data: DeductInput, context): Promise<DeductResult> => {
    const uid = context.auth?.uid;
    if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const { storyId, checkOnly } = (data || {}) as DeductInput;
    if (!storyId) throw new functions.https.HttpsError('invalid-argument', 'Story ID is required.');

    try {
      const storyRef    = db.collection('stories').doc(storyId);
      const readerRef   = db.collection('users').doc(uid);
      const adminRef    = db.collection('users').doc(NARRATUM_ADMIN_UID);
      const purchaseRef = readerRef.collection('purchases').doc(storyId);

      const result = await db.runTransaction(async (tx) => {
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
        const { cost, charging } = resolveStoryPricing(story); // <- ChargingModel (union), not string

        const alreadyOwned = charging === 'one-time' && priorPurchaseDoc.exists;
        const needsPayment = charging === 'pay-per-open' ? true : !alreadyOwned;
        const currentCredits = (readerDoc.data()?.credits || 0) as number;

        // Preflight only
        if (checkOnly) {
          const out: DeductResult = {
            success: true,
            storyId,
            chargingModel: charging,
            price: needsPayment ? cost : 0,
            alreadyOwned,
            needsPayment,
            remainingCredits: currentCredits,
          };
          return out;
        }

        // No charge if already owned (one-time)
        if (!needsPayment) {
          tx.set(readerRef.collection('reads').doc(), {
            type: 'access',
            storyId,
            timestamp: FieldValue.serverTimestamp(),
            description: `Accessed already-owned story "${story.title || storyId}".`,
          });
          const out: DeductResult = {
            success: true,
            storyId,
            chargingModel: 'one-time',
            price: 0,
            alreadyOwned: true,
            needsPayment: false,
            charged: 0,
            remainingCredits: currentCredits,
          };
          return out;
        }

        // Funds check
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

        // Mark purchase for one-time model
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
          tx.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
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
              tx.update(ownerRef, { credits: (ownerDoc.data()?.credits || 0) + royaltyAmount });
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
            tx.update(referrerRef!, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
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
            const adminCurrent = (adminDoc.data()?.credits || 0) as number;
            tx.update(adminRef, { credits: adminCurrent + referralAmount });
            tx.set(adminRef.collection('transactions').doc(), {
              type: 'profit',
              creditsDelta: referralAmount,
              timestamp: FieldValue.serverTimestamp(),
              description: `Referral fallback from ${uid} reading story ${storyId}.`,
              sourceUid: uid,
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

        const out: DeductResult = {
          success: true,
          storyId,
          chargingModel: charging,
          price: cost,
          alreadyOwned: false,
          needsPayment: true,
          charged: cost,
          remainingCredits: currentCredits - cost,
        };
        return out;
      });

      return result;
    } catch (error: any) {
      console.error('Error deducting credits for read:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to deduct credits for read.', error?.message);
    }
  });

// ────────────────────────────────────────────────────────────
/** 3) Callable (Gen-1) — Deduct credits for creation */
// ────────────────────────────────────────────────────────────
type CreateReq = { storyType?: 'basic' | 'premium' | 'convai' };
type CreateRes = { success: boolean; message: string; remainingCredits: number };

export const deductCreditsForCreation = functions
  .region(REGION)
  .https.onCall(async (data: CreateReq, context): Promise<CreateRes> => {
    const creatorUid = context.auth?.uid;
    if (!creatorUid) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const { storyType } = (data || {}) as CreateReq;
    if (!storyType || !['basic', 'premium', 'convai'].includes(storyType)) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid story type.');
    }

    try {
      const creatorRef = db.collection('users').doc(creatorUid);
      const adminRef   = db.collection('users').doc(NARRATUM_ADMIN_UID);

      const result = await db.runTransaction(async (tx) => {
        const [creatorDoc, adminDoc] = await Promise.all([tx.get(creatorRef), tx.get(adminRef)]);
        if (!creatorDoc.exists) throw new functions.https.HttpsError('not-found', 'Creator user not found.');
        if (!adminDoc.exists)   throw new functions.https.HttpsError('not-found', `Admin user ${NARRATUM_ADMIN_UID} not found.`);

        const cost = storyType === 'convai' ? 15 : storyType === 'premium' ? 10 : 5;

        const creatorCredits = (creatorDoc.data()?.credits || 0) as number;
        if (creatorCredits < cost) {
          throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.', {
            remainingCredits: creatorCredits,
          });
        }

        const referrerUid = creatorDoc.data()?.referredBy as string | undefined;
        const referrerRef = referrerUid ? db.collection('users').doc(referrerUid) : null;
        const referrerDoc = referrerRef ? await tx.get(referrerRef) : null;

        tx.update(creatorRef, { credits: creatorCredits - cost });
        tx.set(creatorRef.collection('transactions').doc(), {
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
          tx.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
          tx.set(adminRef.collection('transactions').doc(), {
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
            tx.update(referrerRef!, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
            tx.set(referrerRef!.collection('transactions').doc(), {
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
            tx.update(adminRef, { credits: adminCurrent + referralAmount });
            tx.set(adminRef.collection('transactions').doc(), {
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
          tx.update(adminRef, { credits: adminCurrent + remainder });
          tx.set(adminRef.collection('transactions').doc(), {
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

// ────────────────────────────────────────────────────────────
/** 4) Callable (Gen-1) — Send a tip */
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

        const senderCredits = (senderDoc.data()?.credits || 0) as number;
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

        const targetCredits = (targetDoc.data()?.credits || 0) as number;
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
      console.error('Error sending tip:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to send tip.', error?.message);
    }
  });

// ────────────────────────────────────────────────────────────
/** 5) Callable (Gen-1) — Process PayPal subscription via Next API */
// ────────────────────────────────────────────────────────────
type SubReq = {
  subscriptionID?: string;
  planId?: string;
  frequency?: 'weekly' | 'monthly';
  price?: number;
  credits?: number;
  referredBy?: string;
};
type SubRes = { success: boolean; message?: string; subscriptionId?: string; payerId?: string };

export const processPayPalSubscription = functions
  .region(REGION)
  .https.onCall(async (data: SubReq, context): Promise<SubRes> => {
    const userId = context.auth?.uid;
    if (!userId) throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');

    const { subscriptionID, planId, frequency, price, credits, referredBy } = (data || {}) as SubReq;

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
      return body as SubRes;
    } catch (error: any) {
      console.error('Error processing PayPal subscription:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'Failed to process PayPal subscription.', error?.message ?? 'Unknown error');
    }
  });

// ────────────────────────────────────────────────────────────
/** 6) Scheduled (Gen-1) — Monthly free credits (2:00 AM CR, 1st) */
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

              const currentCredits = (userDoc.data()?.credits || 0) as number;
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
