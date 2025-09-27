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
exports.paypalWebhook = void 0;
// functions/src/paypalWebhook.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// import { getPayPalAccessToken } from './utils/paypal'; // for real signature verification later
// Ensure Admin is initialized (cold starts)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Firestore
const db = admin.firestore();
const creditPackages = [
    { id: 'pkg_tester', tier: 'Tester', credits: 25, value: 5.0, paypalHostedButtonId: 'V2D9DHV8DQVCE' },
    { id: 'pkg_reader', tier: 'Reader', credits: 75, value: 15.0, paypalHostedButtonId: 'CQ33GPF5623DU' },
    { id: 'pkg_writer', tier: 'Writer', credits: 125, value: 25.0, paypalHostedButtonId: '3YUKSD6AU4JH4', popular: true },
    { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0, paypalHostedButtonId: 'FRNPD2T8EBFVW' },
];
/** Helper: Determines the user's new tier based on their total credits. */
function determineUserTier(totalCredits) {
    // This logic should match your application's tier definitions.
    // For example:
    if (totalCredits >= 250)
        return 'Creator';
    if (totalCredits >= 125)
        return 'Writer';
    if (totalCredits >= 75)
        return 'Reader';
    if (totalCredits >= 25)
        return 'Tester';
    return null; // Or a default tier if credits are below the lowest package
}
/** Helper: credit user & complete pending doc inside a single transaction */
async function creditAndCompletePending(opts) {
    const { pendingDocRef, userId, creditsToAdd, paypalOrderId } = opts;
    await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
            throw new Error(`User with ID ${userId} not found.`);
        }
        const currentCredits = Number(userSnap.data()?.credits ?? 0);
        const newCredits = currentCredits + creditsToAdd;
        const newTier = determineUserTier(newCredits);
        tx.update(userRef, {
            credits: newCredits,
            lastPayPalPayment: admin.firestore.FieldValue.serverTimestamp(),
        });
        tx.update(pendingDocRef, {
            status: 'completed',
            paypalOrderId,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update Firebase Authentication custom claims
        if (newTier) {
            await admin.auth().setCustomUserClaims(userId, { tier: newTier });
            functions.logger.info(`Updated custom claims for user ${userId}: tier=${newTier}`);
        }
        else {
            functions.logger.warn(`No tier determined for user ${userId} with ${newCredits} credits.`);
        }
        functions.logger.info(`User ${userId} credited with ${creditsToAdd} → total ${newCredits}. Pending ${pendingDocRef.id} completed.`);
    });
}
exports.paypalWebhook = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const webhookEvent = req.body;
    functions.logger.info('Received PayPal webhook event:', webhookEvent);
    // 1) Verify webhook (placeholder – implement verify-webhook-signature in prod)
    try {
        functions.logger.warn('PayPal webhook verification is not fully implemented. Add verify-webhook-signature in production.');
        // Example headers you will need in a real verification:
        // paypal-transmission-id / paypal-transmission-time / paypal-transmission-sig /
        // paypal-cert-url / paypal-auth-algo
        // const accessToken = await getPayPalAccessToken();
        // await verifyWithPayPal(...);
    }
    catch (error) {
        functions.logger.error('Webhook verification failed:', error);
        res.status(400).send(`Webhook verification failed: ${error.message}`);
        return;
    }
    // 2) Process event types we care about
    if (webhookEvent?.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
        functions.logger.info(`Acknowledging event type: ${webhookEvent?.event_type}`);
        res.status(200).send(`Acknowledged event type: ${webhookEvent?.event_type}`);
        return;
    }
    // --- Extract core fields safely ---
    const capture = webhookEvent.resource;
    const orderId = capture?.supplementary_data?.related_resources?.[0]?.order?.id ||
        capture?.supplementary_data?.related_ids?.order_id ||
        capture?.id ||
        'N/A';
    const amount = Number(capture?.amount?.value ?? 0);
    const currency = capture?.amount?.currency_code ?? 'USD';
    // If the Hosted Button was invoked with &custom=<pendingPurchaseId>, PayPal echoes it back:
    const pendingIdFromCustom = webhookEvent?.resource?.custom_id ||
        webhookEvent?.resource?.custom ||
        webhookEvent?.custom_id ||
        webhookEvent?.custom;
    functions.logger.info(`PAYMENT.CAPTURE.COMPLETED orderId=${orderId} amount=${amount} ${currency} custom=${pendingIdFromCustom || 'none'}`);
    try {
        // 2a) Preferred path: resolve pending by custom/pendingPurchaseId
        if (pendingIdFromCustom) {
            const pendingRef = db.collection('pendingHostedCreditPurchases').doc(pendingIdFromCustom);
            const pendingSnap = await pendingRef.get();
            if (pendingSnap.exists) {
                const p = pendingSnap.data();
                if (p?.status === 'completed') {
                    // Idempotency: already processed
                    res.status(200).send('Already processed.');
                    return;
                }
                const userId = p?.userId;
                const creditsToAdd = Number(p?.expectedCredits ?? 0);
                if (!userId) {
                    functions.logger.error(`Pending ${pendingIdFromCustom} missing userId.`);
                    res.status(500).send('Error: Pending purchase missing user ID.');
                    return;
                }
                await creditAndCompletePending({
                    pendingDocRef: pendingRef,
                    userId,
                    creditsToAdd,
                    paypalOrderId: orderId,
                });
                res.status(200).send('Webhook processed via custom pendingPurchaseId.');
                return;
            }
            // If custom doesn’t point to a doc (e.g., manual test), fall through to amount+button matching.
            functions.logger.warn(`No pending doc found for custom=${pendingIdFromCustom}; falling back to amount+button match.`);
        }
        // 2b) Fallback: match by (amount + hostedButtonId + status=pending) oldest first
        const matchedPackage = creditPackages.find((pkg) => pkg.value === amount);
        if (!matchedPackage) {
            functions.logger.warn(`No matching credit package for amount: ${amount}.`);
            res.status(200).send('Acknowledged, no matching package.');
            return;
        }
        const pendingQuery = db
            .collection('pendingHostedCreditPurchases')
            .where('expectedValue', '==', amount)
            .where('paypalHostedButtonId', '==', matchedPackage.paypalHostedButtonId)
            .where('status', '==', 'pending')
            .orderBy('createdAt', 'asc')
            .limit(1);
        const pendingSnapshot = await pendingQuery.get();
        if (pendingSnapshot.empty) {
            functions.logger.warn(`No pending purchase found for amount ${amount} and button ${matchedPackage.paypalHostedButtonId}.`);
            res.status(200).send('Acknowledged, no pending purchase found.');
            return;
        }
        const pendingDoc = pendingSnapshot.docs[0];
        const pendingPurchase = pendingDoc.data();
        const userId = pendingPurchase.userId;
        const creditsToAdd = Number(pendingPurchase.expectedCredits ?? 0);
        if (!userId) {
            functions.logger.error(`Pending purchase ${pendingDoc.id} has no userId. Cannot grant credits.`);
            res.status(500).send('Error: Pending purchase missing user ID.');
            return;
        }
        await creditAndCompletePending({
            pendingDocRef: pendingDoc.ref,
            userId,
            creditsToAdd,
            paypalOrderId: orderId,
        });
        res.status(200).send('Webhook received and processed.');
        return;
    }
    catch (error) {
        functions.logger.error('Error processing payment capture webhook:', error);
        res.status(500).send('Error processing webhook.');
        return;
    }
});
//# sourceMappingURL=paypalWebhook.js.map