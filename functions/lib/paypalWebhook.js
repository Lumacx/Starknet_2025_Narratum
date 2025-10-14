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
// Initialize Admin once (in case this file is imported directly in tests)
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
const REGION = 'us-central1';
/**
 * Small helper: given a PayPal subscription id, find the user + subscription meta
 * saved by your callable (processPayPalSubscription). If nothing is found,
 * we fall back to the webhook resource.custom_id (if present).
 */
async function resolveSubBinding(subscriptionId, resource) {
    if (!subscriptionId) {
        return { userId: resource?.custom_id || resource?.supplementary_data?.custom_id };
    }
    const ref = db.collection('paypalSubscriptions').doc(subscriptionId);
    const snap = await ref.get();
    if (snap.exists) {
        const d = snap.data() || {};
        return {
            userId: d.userId,
            creditsPerCycle: Number(d.creditsPerCycle || 0) || 0,
            frequency: d.frequency,
            price: typeof d.price === 'number' ? d.price : undefined,
        };
    }
    // fallback to custom_id echo if callable hasn't written the mapping yet
    return { userId: resource?.custom_id || resource?.supplementary_data?.custom_id };
}
/** Helper: Determines the user's new tier based on total credits. */
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
/** Helper used for hosted one-time pending completion. */
async function creditAndCompletePending(opts) {
    const { pendingDocRef, userId, creditsToAdd, paypalOrderId } = opts;
    await db.runTransaction(async (tx) => {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists)
            throw new Error(`User ${userId} not found.`);
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
        if (newTier) {
            await admin.auth().setCustomUserClaims(userId, { tier: newTier });
            functions.logger.info(`Updated custom claims for ${userId}: tier=${newTier}`);
        }
    });
}
/**
 * ROBUST PAYPAL WEBHOOK:
 * - Verifies signature (using PAYPAL_WEBHOOK_ID via utils/paypal.ts)
 * - Idempotent by event id
 * - Handles:
 *    • PAYMENT.CAPTURE.COMPLETED (hosted one-time)
 *    • BILLING.SUBSCRIPTION.ACTIVATED
 *    • BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED (recurring charge)
 *    • BILLING.SUBSCRIPTION.CANCELLED / SUSPENDED
 */
exports.paypalWebhook = functions
    .region(REGION)
    .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'] })
    .https.onRequest(async (req, res) => {
    // PayPal calls this server-to-server; CORS isn’t needed.
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    const webhookEvent = req.body;
    const eventId = webhookEvent?.id;
    const eventType = webhookEvent?.event_type;
    const resource = webhookEvent?.resource;
    if (!eventId || !eventType) {
        functions.logger.error('Webhook missing id or event_type', webhookEvent);
        res.status(400).send('Bad webhook payload');
        return;
    }
    // 1) Verify signature
    try {
        const headers = req.headers;
        const verified = await (0, paypal_1.verifyPayPalWebhookSignature)(headers, webhookEvent);
        if (!verified) {
            functions.logger.warn(`Signature verification FAILED for ${eventId}`);
            res.status(401).send('Invalid signature');
            return;
        }
    }
    catch (err) {
        functions.logger.error(`Signature verification error for ${eventId}`, err);
        res.status(500).send('Signature verification error');
        return;
    }
    // 2) Idempotency (by PayPal event id)
    const processedRef = db.collection('processedWebhookEvents').doc(eventId);
    const processedSnap = await processedRef.get();
    if (processedSnap.exists) {
        functions.logger.info(`Already processed ${eventId}`);
        res.status(200).send('ok');
        return;
    }
    await processedRef.set({
        receivedAt: admin.firestore.FieldValue.serverTimestamp(),
        eventType,
    });
    try {
        // ────────────────────────────────────────────────────────────
        // ONE-TIME PURCHASES (Hosted buttons)
        // ────────────────────────────────────────────────────────────
        if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            const orderId = resource?.supplementary_data?.related_resources?.[0]?.order?.id ||
                resource?.supplementary_data?.related_ids?.order_id ||
                resource?.id ||
                'N/A';
            const amount = Number(resource?.amount?.value ?? 0);
            const currency = resource?.amount?.currency_code ?? 'USD';
            const captureId = resource?.id;
            const pendingIdFromCustom = resource?.custom_id || resource?.supplementary_data?.custom_id;
            functions.logger.info('PAYMENT.CAPTURE.COMPLETED', {
                eventId, orderId, amount, currency, custom: pendingIdFromCustom || 'none',
            });
            // Preferred path: resolve our pending doc by custom id
            if (pendingIdFromCustom) {
                const pendingRef = db.collection('pendingHostedCreditPurchases').doc(pendingIdFromCustom);
                const pendingSnap = await pendingRef.get();
                if (pendingSnap.exists) {
                    const p = pendingSnap.data();
                    if (p?.status === 'completed') {
                        res.status(200).send('ok (already completed)');
                        return;
                    }
                    const userId = p?.userId;
                    const creditsToAdd = Number(p?.expectedCredits || 0) || 0;
                    if (!userId)
                        throw new Error('Pending doc missing userId');
                    await creditAndCompletePending({
                        pendingDocRef: pendingRef,
                        userId,
                        creditsToAdd,
                        paypalOrderId: orderId,
                    });
                    // history row
                    await db.collection('creditTransactions').doc().set({
                        userId,
                        type: 'one-time-purchase',
                        packageId: p?.packageId || 'N/A',
                        creditsGranted: creditsToAdd,
                        pricePaid: Number(p?.expectedValue || amount) || 0,
                        currency,
                        orderId,
                        paypalCaptureId: captureId,
                        referredBy: p?.referredBy || null,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    res.status(200).send('ok');
                    return;
                }
            }
            // Fallback: match a pending purchase by amount + status=pending (oldest first)
            const pendingSnap = await db
                .collection('pendingHostedCreditPurchases')
                .where('expectedValue', '==', amount)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'asc')
                .limit(1)
                .get();
            if (pendingSnap.empty) {
                functions.logger.warn('No pending purchase to match capture', { amount, eventId });
                res.status(200).send('ok (no match)');
                return;
            }
            const pendingDoc = pendingSnap.docs[0];
            const p = pendingDoc.data();
            const userId = p?.userId;
            const creditsToAdd = Number(p?.expectedCredits || 0) || 0;
            if (!userId)
                throw new Error('Pending (fallback) missing userId');
            await creditAndCompletePending({
                pendingDocRef: pendingDoc.ref,
                userId,
                creditsToAdd,
                paypalOrderId: orderId,
            });
            await db.collection('creditTransactions').doc().set({
                userId,
                type: 'one-time-purchase',
                packageId: p?.packageId || 'N/A',
                creditsGranted: creditsToAdd,
                pricePaid: Number(p?.expectedValue || amount) || 0,
                currency,
                orderId,
                paypalCaptureId: captureId,
                referredBy: p?.referredBy || null,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
            res.status(200).send('ok');
            return;
        }
        // ────────────────────────────────────────────────────────────
        // SUBSCRIPTIONS
        // ────────────────────────────────────────────────────────────
        if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED' ||
            eventType === 'BILLING.SUBSCRIPTION.PAYMENT.SUCCEEDED' ||
            eventType === 'PAYMENT.SALE.COMPLETED' // legacy some merchants still see this
        ) {
            const subscriptionId = resource?.id ||
                resource?.billing_agreement_id ||
                resource?.subscription_id;
            const binding = await resolveSubBinding(subscriptionId, resource);
            const userId = binding.userId;
            const creditsPerCycle = Number(binding.creditsPerCycle || 0) || 0;
            const frequency = binding.frequency;
            const price = binding.price;
            if (!userId) {
                functions.logger.warn('Subscription event but no user mapping', {
                    eventId, eventType, subscriptionId,
                });
                res.status(200).send('ok (no user mapping yet)');
                return;
            }
            // Credit when we know how many credits per cycle we owe.
            if (creditsPerCycle > 0) {
                await db.runTransaction(async (tx) => {
                    const userRef = db.collection('users').doc(userId);
                    const snap = await tx.get(userRef);
                    if (!snap.exists)
                        return;
                    const currentCredits = Number(snap.data()?.credits || 0) || 0;
                    tx.update(userRef, {
                        credits: currentCredits + creditsPerCycle,
                        subscription: {
                            ...(snap.data()?.subscription || {}),
                            subscriptionId,
                            status: 'ACTIVE',
                            lastPaymentAt: admin.firestore.FieldValue.serverTimestamp(),
                            frequency: frequency || (snap.data()?.subscription?.frequency ?? null),
                            price: typeof price === 'number' ? price : (snap.data()?.subscription?.price ?? null),
                        },
                    });
                    tx.set(userRef.collection('transactions').doc(), {
                        type: 'subscription_cycle',
                        creditsDelta: creditsPerCycle,
                        amountUsd: price ?? null,
                        paypalSubscriptionId: subscriptionId ?? null,
                        status: 'confirmed',
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        description: `Recurring subscription credit${frequency ? ` (${frequency})` : ''}.`,
                    });
                });
                // Mirror status in the mapping doc (if it exists)
                if (subscriptionId) {
                    await db.collection('paypalSubscriptions').doc(subscriptionId).set({
                        status: 'ACTIVE',
                        lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastEvent: eventType,
                    }, { merge: true });
                }
            }
            else {
                // No meta yet — just mark active; callable will have added meta soon
                if (subscriptionId) {
                    await db.collection('paypalSubscriptions').doc(subscriptionId).set({
                        status: 'ACTIVE',
                        lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
                        lastEvent: eventType,
                    }, { merge: true });
                }
            }
            res.status(200).send('ok');
            return;
        }
        if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED' || eventType === 'BILLING.SUBSCRIPTION.SUSPENDED') {
            const subscriptionId = resource?.id;
            const binding = await resolveSubBinding(subscriptionId, resource);
            const userId = binding.userId;
            if (userId) {
                await db.collection('users').doc(userId).set({
                    subscription: {
                        subscriptionId: subscriptionId ?? null,
                        status: eventType.endsWith('CANCELLED') ? 'CANCELLED' : 'SUSPENDED',
                    },
                }, { merge: true });
            }
            if (subscriptionId) {
                await db.collection('paypalSubscriptions').doc(subscriptionId).set({
                    status: eventType.endsWith('CANCELLED') ? 'CANCELLED' : 'SUSPENDED',
                    lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastEvent: eventType,
                }, { merge: true });
            }
            res.status(200).send('ok');
            return;
        }
        if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
            const subscriptionId = resource?.id;
            const binding = await resolveSubBinding(subscriptionId, resource);
            const userId = binding.userId;
            if (userId) {
                await db.collection('users').doc(userId).set({
                    subscription: {
                        ...(subscriptionId ? { subscriptionId } : {}),
                        lastPaymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                }, { merge: true });
            }
            if (subscriptionId) {
                await db.collection('paypalSubscriptions').doc(subscriptionId).set({
                    lastWebhookAt: admin.firestore.FieldValue.serverTimestamp(),
                    lastEvent: eventType,
                }, { merge: true });
            }
            res.status(200).send('ok');
            return;
        }
        // Default: acknowledge unhandled events so PayPal stops retrying
        functions.logger.info('Unhandled PayPal event (acknowledged)', { eventId, eventType });
        res.status(200).send('ok');
    }
    catch (err) {
        // Log but acknowledge to prevent retries storm. Consider a DLQ for hard failures.
        functions.logger.error('Webhook processing error', { eventId, eventType, err: err?.message || err });
        res.status(200).send('ok'); // acknowledge anyway
    }
});
//# sourceMappingURL=paypalWebhook.js.map