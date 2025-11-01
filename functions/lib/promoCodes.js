"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.redeemPromoCode = void 0;
//functions/src/promoCodes.ts
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./firebaseAdmin");
exports.redeemPromoCode = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
    }
    const userId = context.auth.uid;
    const { promoCode } = data;
    if (typeof promoCode !== 'string' || promoCode.trim() === '') {
        throw new functions.https.HttpsError('invalid-argument', 'A valid promo code is required.');
    }
    const promoCodeRef = firebaseAdmin_1.db.collection('promoCodes').doc(promoCode.toUpperCase());
    const userRef = firebaseAdmin_1.db.collection('users').doc(userId);
    try {
        const result = await firebaseAdmin_1.db.runTransaction(async (transaction) => {
            const promoDoc = await transaction.get(promoCodeRef);
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User profile not found.');
            }
            if (!promoDoc.exists || !promoDoc.data()?.isActive) {
                throw new functions.https.HttpsError('not-found', 'Invalid or inactive promo code.');
            }
            const promoData = promoDoc.data();
            const creditsToGrant = promoData?.credits || 0;
            const maxUsesPerUser = promoData?.maxUsesPerUser;
            const globalMaxUses = promoData?.globalMaxUses;
            const expirationDate = promoData?.expirationDate;
            const usedBy = promoData?.usedBy || [];
            const timesUsed = promoData?.timesUsed || 0;
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
            const currentCredits = (userDoc.data()?.credits || 0);
            transaction.update(userRef, { credits: currentCredits + creditsToGrant });
            // Record the transaction for the user
            const userTransactionRef = userRef.collection('transactions').doc();
            transaction.set(userTransactionRef, {
                type: 'promo_code_redeemed',
                creditsDelta: creditsToGrant,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Redeemed promo code: ${promoCode}`,
                promoCode: promoCode,
                status: 'confirmed',
            });
            // Update the promo code's usage information
            transaction.update(promoCodeRef, {
                usedBy: firebaseAdmin_1.FieldValue.arrayUnion(userId),
                timesUsed: firebaseAdmin_1.FieldValue.increment(1),
            });
            return { success: true, message: `${creditsToGrant} credits added successfully!` };
        });
        return { success: true, message: result.message };
    }
    catch (error) {
        console.error('Error redeeming promo code:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to redeem promo code.', error.message);
    }
});
//# sourceMappingURL=promoCodes.js.map