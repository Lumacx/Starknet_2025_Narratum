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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const paypal_1 = require("./utils/paypal");
// Ensure Admin is initialized (cold starts)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
// Firestore
const db = admin.firestore();
// This data should ideally be fetched from a central configuration or database
// to ensure consistency across frontend and backend.
const creditPackages = [
    { id: 'pkg_tester', tier: 'Tester', credits: 25, value: 5.0, paypalHostedButtonId: 'V2D9DHV8DQVCE' },
    { id: 'pkg_reader', tier: 'Reader', credits: 75, value: 15.0, paypalHostedButtonId: 'CQ33GPF5623DU' },
    { id: 'pkg_writer', tier: 'Writer', credits: 125, value: 25.0, paypalHostedButtonId: '3YUKSD6AU4JH4', popular: true },
    { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0, paypalHostedButtonId: 'FRNPD2T8EBFVW' },
];
/** Helper: Determines the user's new tier based on their total credits. */
function determineUserTier(totalCredits) {
    if (totalCredits >= 250)
        return 'Creator';
    if (totalCredits >= 125)
        return 'Writer';
    if (totalCredits >= 75)
        return 'Reader';
    if (totalCredits >= 25)
        return 'Tester';
    return null;
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
    const webhookId = webhookEvent?.id;
    if (!webhookId) {
        functions.logger.error('Received PayPal webhook event without an ID.', webhookEvent);
        res.status(400).send('Webhook event missing ID.');
        return;
    }
    functions.logger.info(`Received PayPal webhook event ${webhookId}:`, webhookEvent.event_type);
    // 1. Webhook Verification
    try {
        const headers = req.headers;
        const isVerified = await (0, paypal_1.verifyPayPalWebhookSignature)(headers, webhookEvent);
        if (!isVerified) {
            functions.logger.warn(`PayPal webhook signature verification failed for event ${webhookId}.`);
            res.status(403).send('Webhook signature verification failed.');
            return;
        }
        functions.logger.info(`PayPal webhook signature verified for event ${webhookId}.`);
    }
    catch (error) {
        functions.logger.error(`Error during webhook verification for event ${webhookId}:`, error);
        res.status(500).send(`Error verifying webhook: ${error.message}`);
        return;
    }
    // 2. Idempotency Check
    const processedEventsRef = db.collection('processedWebhookEvents');
    const processedDocRef = processedEventsRef.doc(webhookId);
    try {
        const processedSnap = await processedDocRef.get();
        if (processedSnap.exists) {
            functions.logger.info(`Webhook event ${webhookId} already processed. Skipping.`);
            res.status(200).send('Already processed.');
            return;
        }
        // Mark as processed before handling to prevent race conditions
        await processedDocRef.set({ timestamp: admin.firestore.FieldValue.serverTimestamp(), eventType: webhookEvent.event_type });
    }
    catch (error) {
        functions.logger.error(`Error with idempotency check for event ${webhookId}:`, error);
        res.status(500).send(`Error with idempotency check: ${error.message}`);
        return;
    }
    // 3. Process event types
    const eventType = webhookEvent.event_type;
    const resource = webhookEvent.resource;
    const userIdFromCustomId = resource?.custom_id || resource?.supplementary_data?.custom_id;
    try {
        switch (eventType) {
            case 'PAYMENT.CAPTURE.COMPLETED': {
                const orderId = resource?.supplementary_data?.related_resources?.[0]?.order?.id ||
                    resource?.supplementary_data?.related_ids?.order_id ||
                    resource?.id ||
                    'N/A';
                const amount = Number(resource?.amount?.value ?? 0);
                const currency = resource?.amount?.currency_code ?? 'USD';
                const paypalCaptureId = resource?.id;
                // If the Hosted Button was invoked with &custom=<pendingPurchaseId>, PayPal echoes it back:
                const pendingIdFromCustom = userIdFromCustomId; // Using custom_id from resource
                functions.logger.info(`PAYMENT.CAPTURE.COMPLETED orderId=${orderId} amount=${amount} ${currency} custom=${pendingIdFromCustom || 'none'}`);
                // 3a) Preferred path: resolve pending by custom/pendingPurchaseId
                if (pendingIdFromCustom) {
                    const pendingRef = db.collection('pendingHostedCreditPurchases').doc(pendingIdFromCustom);
                    const pendingSnap = await pendingRef.get();
                    if (pendingSnap.exists) {
                        const p = pendingSnap.data();
                        if (p?.status === 'completed') {
                            // This specific pending doc was already completed (additional idempotency check)
                            functions.logger.info(`Pending doc ${pendingIdFromCustom} already completed. Skipping credit.`);
                            res.status(200).send('Acknowledged, pending purchase already completed.');
                            return;
                        }
                        const userId = p?.userId;
                        const creditsToAdd = Number(p?.expectedCredits ?? 0);
                        const referredBy = p?.referredBy;
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
                        // Also record in creditTransactions for a full history
                        const transactionRef = db.collection('creditTransactions').doc();
                        await transactionRef.set({
                            userId: userId,
                            type: 'one-time-purchase',
                            packageId: p.packageId || 'N/A', // Fixed: Use p.packageId
                            creditsGranted: creditsToAdd,
                            pricePaid: p.expectedValue || 0, // Ensure pricePaid is number, default to 0
                            currency: currency,
                            orderId: orderId,
                            paypalCaptureId: paypalCaptureId,
                            referredBy: referredBy || null,
                            timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        });
                        res.status(200).send('Webhook processed via custom pendingPurchaseId.');
                        return;
                    }
                    functions.logger.warn(`No pending doc found for custom=${pendingIdFromCustom}; falling back to amount+button match.`);
                }
                // 3b) Fallback: match by (amount + hostedButtonId + status=pending) oldest first
                // This path is less reliable and should be a last resort.
                const matchedPackage = creditPackages.find((pkg) => pkg.value === amount);
                if (!matchedPackage) {
                    functions.logger.warn(`No matching credit package for amount: ${amount}.`);
                    res.status(200).send('Acknowledged, no matching package.');
                    return;
                }
                const pendingQuery = db
                    .collection('pendingHostedCreditPurchases')
                    .where('expectedValue', '==', amount)
                    .where('paypalHostedButtonId', '==', matchedPackage.paypalHostedButtonId) // Fixed: Typo here
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
                const referredBy = pendingPurchase.referredBy;
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
                // Also record in creditTransactions for a full history
                const transactionRef = db.collection('creditTransactions').doc();
                await transactionRef.set({
                    userId: userId,
                    type: 'one-time-purchase',
                    packageId: matchedPackage.id || 'N/A', // Fixed: Use matchedPackage.id
                    creditsGranted: creditsToAdd,
                    pricePaid: pendingPurchase.expectedValue || 0, // Ensure pricePaid is number, default to 0
                    currency: currency,
                    orderId: orderId,
                    paypalCaptureId: paypalCaptureId,
                    referredBy: referredBy || null,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                });
                res.status(200).send('Webhook received and processed (fallback).');
                return;
            }
            case 'BILLING.SUBSCRIPTION.ACTIVATED':
            case 'BILLING.SUBSCRIPTION.RENEWED': {
                const subscriptionId = resource.id;
                const payerId = resource.subscriber?.payer_id; // PayPal Payer ID
                const userId = userIdFromCustomId; // Expecting userId here from custom_id
                const status = resource.status;
                const planId = resource.plan_id;
                if (!userId) {
                    functions.logger.warn(`Could not find user ID for subscription ${subscriptionId} (event: ${eventType}).`);
                    res.status(400).send('Missing user ID for subscription event.');
                    return;
                }
                const userRef = db.collection('users').doc(userId);
                await userRef.set({
                    subscriptionStatus: 'active',
                    paypalSubscriptionId: subscriptionId,
                    planName: planId, // Or a more user-friendly name if you map it
                    billingCycle: resource.billing_info?.cycle_executions?.[0]?.tenure_type || resource.billing_info?.frequency?.interval_unit,
                    paypalSubscriptionDetails: resource,
                    subscriptionActivatedAt: admin.firestore.FieldValue.serverTimestamp(), // Update on activation/renewal
                    lastWebhookUpdate: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                functions.logger.info(`User ${userId} subscription ${eventType.toLowerCase()} via webhook.`);
                res.status(200).send('Subscription event processed.');
                return;
            }
            case 'BILLING.SUBSCRIPTION.CANCELLED':
            case 'BILLING.SUBSCRIPTION.SUSPENDED': {
                const subscriptionId = resource.id;
                const userId = userIdFromCustomId; // Expecting userId here from custom_id
                const status = resource.status;
                if (!userId) {
                    functions.logger.warn(`Could not find user ID for subscription ${subscriptionId} cancellation (event: ${eventType}).`);
                    res.status(400).send('Missing user ID for subscription event.');
                    return;
                }
                const userRef = db.collection('users').doc(userId);
                await userRef.set({
                    subscriptionStatus: status.toLowerCase(), // 'cancelled' or 'suspended'
                    paypalSubscriptionId: subscriptionId,
                    subscriptionCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastWebhookUpdate: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
                functions.logger.info(`User ${userId} subscription ${status.toLowerCase()} via webhook.`);
                res.status(200).send('Subscription event processed.');
                return;
            }
            case 'BILLING.SUBSCRIPTION.PAYMENT_FAILED': {
                const subscriptionId = resource.id;
                const userId = userIdFromCustomId;
                if (userId) {
                    const userRef = db.collection('users').doc(userId);
                    await userRef.update({
                        // Consider a specific status or flag for payment failure
                        // For now, perhaps just log or notify admin
                        lastWebhookUpdate: admin.firestore.FieldValue.serverTimestamp(),
                        paypalSubscriptionPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    functions.logger.warn(`Subscription ${subscriptionId} payment failed for user ${userId}.`);
                }
                else {
                    functions.logger.warn(`Subscription ${subscriptionId} payment failed, but no user ID found.`);
                }
                res.status(200).send('Payment failed event acknowledged.');
                return;
            }
            default:
                functions.logger.info(`Acknowledging unhandled PayPal webhook event type: ${eventType}`);
                res.status(200).send(`Acknowledged unhandled event type: ${eventType}`);
                return;
        }
    }
    catch (error) {
        functions.logger.error(`Error processing PayPal webhook event ${webhookId} of type ${eventType}:`, error);
        // Even if an error occurs during processing, acknowledge the webhook to PayPal
        // to prevent repeated notifications, but log the error for investigation.
        res.status(500).send('Error processing webhook event.');
        // Optionally, re-throw or use a dead-letter queue for critical errors
        return;
    }
});
//# sourceMappingURL=paypalWebhook.js.map