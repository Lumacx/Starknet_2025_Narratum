import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

export const redeemPromoCode = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const userId = context.auth.uid;
  const { promoCode } = data;

  if (typeof promoCode !== 'string' || promoCode.trim() === '') {
    throw new functions.https.HttpsError('invalid-argument', 'A valid promo code is required.');
  }

  const promoCodeRef = db.collection('promoCodes').doc(promoCode.toUpperCase());
  const userRef = db.collection('users').doc(userId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const promoDoc = await transaction.get(promoCodeRef);
      const userDoc = await transaction.get(userRef);

      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found.');
      }

      if (!promoDoc.exists || !promoDoc.data()?.isActive) {
        throw new functions.https.HttpsError('not-found', 'Invalid or inactive promo code.');
      }

      const promoData = promoDoc.data();
      const creditsToGrant = promoData?.credits as number || 0;
      const maxUsesPerUser = promoData?.maxUsesPerUser as number | undefined;
      const globalMaxUses = promoData?.globalMaxUses as number | undefined;
      const expirationDate = promoData?.expirationDate as admin.firestore.Timestamp | undefined;
      const usedBy: string[] = promoData?.usedBy || [];
      const timesUsed: number = promoData?.timesUsed || 0;

      // Check expiration
      if (expirationDate && expirationDate.toDate() < new Date()) {
        throw new functions.https.HttpsError('unavailable', 'This promo code has expired.');
      }

      // Check per-user usage limit
      if (maxUsesPerUser !== undefined) {
        const userUses = usedBy.filter(uid => uid === userId).length;
        if (userUses >= maxUsesPerUser) {
          throw new functions.https.HttpsError('already-exists', 'You have already redeemed this promo code the maximum number of times.');
        }
      }

      // Check global usage limit
      if (globalMaxUses !== undefined && timesUsed >= globalMaxUses) {
          throw new functions.https.HttpsError('resource-exhausted', 'This promo code has reached its maximum redemption limit.');
      }

      // Grant credits to the user
      const currentCredits = (userDoc.data()?.credits || 0) as number;
      transaction.update(userRef, { credits: currentCredits + creditsToGrant });

      // Record the transaction for the user
      const userTransactionRef = userRef.collection('transactions').doc();
      transaction.set(userTransactionRef, {
        type: 'promo_code_redeemed',
        creditsDelta: creditsToGrant,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Redeemed promo code: ${promoCode}`,
        promoCode: promoCode,
        status: 'confirmed',
      });

      // Update the promo code's usage information
      transaction.update(promoCodeRef, {
        usedBy: admin.firestore.FieldValue.arrayUnion(userId),
        timesUsed: admin.firestore.FieldValue.increment(1),
      });

      return { success: true, message: `${creditsToGrant} credits added successfully!` };
    });

    return { success: true, message: result.message };

  } catch (error: any) {
    console.error('Error redeeming promo code:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to redeem promo code.', error.message);
  }
});