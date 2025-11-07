// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

/* ──────────────────────────────────────────────────────────────────
   Feature modules
   ────────────────────────────────────────────────────────────────── */
import { generateNarratumImage } from './imageGeneration';
import { createuserprofile } from './authTriggers';
import { incrementCommentCount } from './commentCounter';
import { indexAssetOnFinalize, removeIndexOnDelete } from './assetsIndex';
import { suggestScene } from './sceneSuggestions';
import { describeImage } from './describeImage';

// HTTP v2 image generators
import { generateWithGemini, generateWithImagen } from './smartGenerateImage';

// PDF generator (HTTP)
import { downloadStoryPdf } from './downloadStoryPdf';

// Credits & payments (callables + helpers)
import {
  processPayPalOneTimePayment,   // callable
  deductCreditsForRead,          // callable
  sendTipToWriter,               // callable
  grantMonthlyFreeCredits,       // scheduled
  processPayPalSubscription,     // callable (SUBSCRIPTIONS – from credits.ts)
} from './credits';

// Promo Codes / Hosted Payments
import { redeemPromoCode } from './promoCodes';
import { initiateHostedCreditPurchase } from './hostedPayments';
import { createPayPalOrder } from './createPayPalOrder';

/* ──────────────────────────────────────────────────────────────────
   Creation credit deduction (callable)
   ────────────────────────────────────────────────────────────────── */
type StoryType = 'basic' | 'premium' | 'convai';
const CREATION_COSTS: Record<StoryType, number> = {
  basic: 5,
  premium: 10,
  convai: 15,
};

export const deductCreditsForCreation = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }

    const storyType = (data?.storyType || '') as StoryType;
    const cost = CREATION_COSTS[storyType];
    if (!cost) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid storyType.');
    }

    const userRef = admin.firestore().collection('users').doc(uid);

    try {
      const remaining = await admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const current = Number(snap.get('credits') ?? 0);

        if (current < cost) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            `Not enough credits. Need ${cost}, have ${current}.`
          );
        }

        tx.update(userRef, {
          credits: current - cost,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastCreationType: storyType,
        });

        return current - cost;
      });

      return { success: true, message: 'ok', remainingCredits: remaining };
    } catch (err: any) {
      if (err instanceof functions.https.HttpsError) throw err;
      console.error('[deductCreditsForCreation] failed:', err);
      throw new functions.https.HttpsError('internal', 'Could not deduct credits.');
    }
  });

/* ──────────────────────────────────────────────────────────────────
   Export surface
   ────────────────────────────────────────────────────────────────── */
export {
  // General features
  generateNarratumImage,
  createuserprofile,
  incrementCommentCount,
  indexAssetOnFinalize,
  removeIndexOnDelete,
  generateWithGemini,
  generateWithImagen,
  downloadStoryPdf,
  suggestScene,
  describeImage,

  // Payments / credits
  processPayPalOneTimePayment,
  createPayPalOrder,
  deductCreditsForRead,
  sendTipToWriter,
  grantMonthlyFreeCredits,
  processPayPalSubscription,

  // Promo codes & hosted flows
  redeemPromoCode,
  initiateHostedCreditPurchase,
};

// Keep these named re-exports
export { propagateUserProfileToStories } from './propagateUserProfile';

// Webhooks / HTTP utilities (distinct names, no collision with callables)
export * from './paypalWebhook';
export * from './hostedPayments';

// Subscription utilities (free plan, get status, cancel)
export * from './subscriptions';
