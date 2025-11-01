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
exports.initiateHostedCreditPurchase = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
const creditPackages = [
    { id: 'pkg_tester', tier: 'Tester', credits: 25, value: 5.0, paypalHostedButtonId: 'V2D9DHV8DQVCE' },
    { id: 'pkg_reader', tier: 'Reader', credits: 75, value: 15.0, paypalHostedButtonId: 'CQ33GPF5623DU' },
    { id: 'pkg_writer', tier: 'Writer', credits: 125, value: 25.0, paypalHostedButtonId: '3YUKSD6AU4JH4', popular: true },
    { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0, paypalHostedButtonId: 'FRNPD2T8EBFVW' },
];
/**
 * Initiates a one-time credit purchase using PayPal Hosted Buttons.
 * This callable function creates a pending record in Firestore to link the purchase to a user.
 * The actual credit granting will happen via a PayPal webhook upon payment completion.
 */
// …unchanged imports…
exports.initiateHostedCreditPurchase = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to initiate a purchase.');
    }
    const userId = context.auth.uid;
    const { creditPackageId } = data; // <— keep this name
    if (!creditPackageId)
        throw new functions.https.HttpsError('invalid-argument', 'Missing creditPackageId.');
    const selectedPackage = creditPackages.find(pkg => pkg.id === creditPackageId);
    if (!selectedPackage)
        throw new functions.https.HttpsError('not-found', 'Credit package not found.');
    const pendingRef = await db.collection('pendingHostedCreditPurchases').add({
        userId,
        creditPackageId: selectedPackage.id,
        paypalHostedButtonId: selectedPackage.paypalHostedButtonId,
        expectedCredits: selectedPackage.credits,
        expectedValue: selectedPackage.value,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    functions.logger.info(`Pending hosted credit purchase for user ${userId}, package ${creditPackageId}. Pending ID: ${pendingRef.id}`);
    return { success: true, pendingPurchaseId: pendingRef.id };
});
//# sourceMappingURL=hostedPayments.js.map