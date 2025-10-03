// functions/src/index.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Ensure Admin is initialized exactly once
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

// HTTP v2 image generators
import { generateWithGemini, generateWithImagen } from './smartGenerateImage';

// PDF generator (HTTP)
import { downloadStoryPdf } from './downloadStoryPdf';

// Credit System (NOTE: do NOT import `deductCreditsForCreation` here)
import {
  processPayPalOneTimePayment, // Renamed from processPayPalPayment
  deductCreditsForRead,
  sendTipToWriter,
  grantMonthlyFreeCredits,
  processPayPalSubscription,
} from './credits';

// Promo Codes / Hosted Payments
import { redeemPromoCode } from './promoCodes';
import { initiateHostedCreditPurchase } from './hostedPayments';

/* ──────────────────────────────────────────────────────────────────
   Callable: deductCreditsForCreation  (NO CORS NEEDED)
   - Replaces any previous HTTP onRequest version.
   - Frontend calls via httpsCallable('deductCreditsForCreation', { storyType })
   - Returns: { success, message, remainingCredits }
   ────────────────────────────────────────────────────────────────── */

type StoryType = 'basic' | 'premium' | 'convai'; // short | novela | campaign
const CREATION_COSTS: Record<StoryType, number> = {
  basic: 5,     // short
  premium: 10,  // novela
  convai: 15,   // campaign
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

    const userRef = admin.firestore().collection('users').doc(uid); // adjust path if needed

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
   Named exports (no wildcard export from ./credits — avoid duplicate exports)
   ────────────────────────────────────────────────────────────────── */
export {
  generateNarratumImage,
  createuserprofile,
  incrementCommentCount,
  indexAssetOnFinalize,
  removeIndexOnDelete,
  generateWithGemini,
  generateWithImagen,
  downloadStoryPdf,
  // Credits (creation deduction is the callable above)
  processPayPalOneTimePayment, // Renamed from processPayPalPayment
  deductCreditsForRead,
  sendTipToWriter,
  grantMonthlyFreeCredits,
  processPayPalSubscription,
  // Promo Codes
  redeemPromoCode,
  // Hosted Payments
  initiateHostedCreditPurchase,
};

export { propagateUserProfileToStories } from './propagateUserProfile';

// Keep these, but DO NOT re-export everything from './credits'
export * from './paypalWebhook';
export * from './hostedPayments';
export * from './subscriptions';
// NOTE:
// - Ensure `./credits.ts` does NOT export a symbol named `deductCreditsForCreation`.
//   If you keep a legacy HTTP version for testing, rename it (e.g. `deductCreditsForCreationHttp`).
