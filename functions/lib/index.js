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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propagateUserProfileToStories = exports.initiateHostedCreditPurchase = exports.redeemPromoCode = exports.processPayPalSubscription = exports.grantMonthlyFreeCredits = exports.sendTipToWriter = exports.deductCreditsForRead = exports.createPayPalOrder = exports.processPayPalOneTimePayment = exports.downloadStoryPdf = exports.generateWithImagen = exports.generateWithGemini = exports.removeIndexOnDelete = exports.indexAssetOnFinalize = exports.incrementCommentCount = exports.createuserprofile = exports.generateNarratumImage = exports.deductCreditsForCreation = void 0;
// functions/src/index.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
/* ──────────────────────────────────────────────────────────────────
   Feature modules
   ────────────────────────────────────────────────────────────────── */
const imageGeneration_1 = require("./imageGeneration");
Object.defineProperty(exports, "generateNarratumImage", { enumerable: true, get: function () { return imageGeneration_1.generateNarratumImage; } });
const authTriggers_1 = require("./authTriggers");
Object.defineProperty(exports, "createuserprofile", { enumerable: true, get: function () { return authTriggers_1.createuserprofile; } });
const commentCounter_1 = require("./commentCounter");
Object.defineProperty(exports, "incrementCommentCount", { enumerable: true, get: function () { return commentCounter_1.incrementCommentCount; } });
const assetsIndex_1 = require("./assetsIndex");
Object.defineProperty(exports, "indexAssetOnFinalize", { enumerable: true, get: function () { return assetsIndex_1.indexAssetOnFinalize; } });
Object.defineProperty(exports, "removeIndexOnDelete", { enumerable: true, get: function () { return assetsIndex_1.removeIndexOnDelete; } });
// HTTP v2 image generators
const smartGenerateImage_1 = require("./smartGenerateImage");
Object.defineProperty(exports, "generateWithGemini", { enumerable: true, get: function () { return smartGenerateImage_1.generateWithGemini; } });
Object.defineProperty(exports, "generateWithImagen", { enumerable: true, get: function () { return smartGenerateImage_1.generateWithImagen; } });
// PDF generator (HTTP)
const downloadStoryPdf_1 = require("./downloadStoryPdf");
Object.defineProperty(exports, "downloadStoryPdf", { enumerable: true, get: function () { return downloadStoryPdf_1.downloadStoryPdf; } });
// Credits & payments (callables + helpers)
const credits_1 = require("./credits");
Object.defineProperty(exports, "processPayPalOneTimePayment", { enumerable: true, get: function () { return credits_1.processPayPalOneTimePayment; } });
Object.defineProperty(exports, "deductCreditsForRead", { enumerable: true, get: function () { return credits_1.deductCreditsForRead; } });
Object.defineProperty(exports, "sendTipToWriter", { enumerable: true, get: function () { return credits_1.sendTipToWriter; } });
Object.defineProperty(exports, "grantMonthlyFreeCredits", { enumerable: true, get: function () { return credits_1.grantMonthlyFreeCredits; } });
Object.defineProperty(exports, "processPayPalSubscription", { enumerable: true, get: function () { return credits_1.processPayPalSubscription; } });
// Promo Codes / Hosted Payments
const promoCodes_1 = require("./promoCodes");
Object.defineProperty(exports, "redeemPromoCode", { enumerable: true, get: function () { return promoCodes_1.redeemPromoCode; } });
const hostedPayments_1 = require("./hostedPayments");
Object.defineProperty(exports, "initiateHostedCreditPurchase", { enumerable: true, get: function () { return hostedPayments_1.initiateHostedCreditPurchase; } });
const createPayPalOrder_1 = require("./createPayPalOrder");
Object.defineProperty(exports, "createPayPalOrder", { enumerable: true, get: function () { return createPayPalOrder_1.createPayPalOrder; } });
const CREATION_COSTS = {
    basic: 5,
    premium: 10,
    convai: 15,
};
exports.deductCreditsForCreation = functions
    .region('us-central1')
    .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid) {
        throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
    }
    const storyType = (data?.storyType || '');
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
                throw new functions.https.HttpsError('failed-precondition', `Not enough credits. Need ${cost}, have ${current}.`);
            }
            tx.update(userRef, {
                credits: current - cost,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                lastCreationType: storyType,
            });
            return current - cost;
        });
        return { success: true, message: 'ok', remainingCredits: remaining };
    }
    catch (err) {
        if (err instanceof functions.https.HttpsError)
            throw err;
        console.error('[deductCreditsForCreation] failed:', err);
        throw new functions.https.HttpsError('internal', 'Could not deduct credits.');
    }
});
// Keep these named re-exports
var propagateUserProfile_1 = require("./propagateUserProfile");
Object.defineProperty(exports, "propagateUserProfileToStories", { enumerable: true, get: function () { return propagateUserProfile_1.propagateUserProfileToStories; } });
// Webhooks / HTTP utilities (distinct names, no collision with callables)
__exportStar(require("./paypalWebhook"), exports);
__exportStar(require("./hostedPayments"), exports);
// Subscription utilities (free plan, get status, cancel)
__exportStar(require("./subscriptions"), exports);
//# sourceMappingURL=index.js.map