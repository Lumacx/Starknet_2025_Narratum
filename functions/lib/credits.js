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
exports.grantMonthlyFreeCredits = exports.processPayPalSubscription = exports.sendTipToWriter = exports.deductCreditsForCreation = exports.deductCreditsForRead = exports.processPayPalPayment = void 0;
// functions/src/credits.ts
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const paypal_1 = require("./utils/paypal");
// Narratum Admin User ID for internal credit distribution
const NARRATUM_ADMIN_UID = 'bOKyhlO8sofk5O4dGRTZAIfdYSx2';
// Credit split configuration
const CREDIT_SPLIT_CONFIG = {
    read: {
        AI_STORAGE: 0.10, // 10%
        APP_CUT: 0.10, // 10%
        ROYALTY: 0.60, // 60%
        REFERRAL: 0.20, // 20%
    },
    create: {
        AI_STORAGE: 0.35, // 35%
        APP_CUT: 0.25, // 25%
        ROYALTY: 0, // 0% - as clarified, no royalty for self-creation
        REFERRAL: 0.40, // 40%
    },
};
function hasStringMessage(x) {
    return typeof x === 'object' && x !== null && 'message' in x && typeof x.message === 'string';
}
function extractMessage(x, fallback) {
    if (typeof x === 'string')
        return x;
    if (hasStringMessage(x))
        return x.message;
    try {
        return JSON.stringify(x);
    }
    catch {
        return fallback;
    }
}
/* ────────────────────────────────────────────────────────────
   1) HTTP Cloud Function — process PayPal one-time payments
   ──────────────────────────────────────────────────────────── */
exports.processPayPalPayment = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const { orderId, userId, amount } = req.body;
        if (!orderId || !userId || typeof amount !== 'number' || amount <= 0) {
            res.status(400).send('Invalid request body: orderId, userId, and a positive amount are required.');
            return;
        }
        // Verify the PayPal order (server-side)
        const orderDetails = await (0, paypal_1.verifyPayPalOrder)(orderId);
        if (!orderDetails || orderDetails.status !== 'COMPLETED') {
            console.error('PayPal order not completed:', orderDetails);
            res.status(400).send('PayPal order not completed or invalid.');
            return;
        }
        // Optional: validate payment amount (USD) from PayPal
        const purchaseUnit = orderDetails.purchase_units?.[0];
        const paypalAmount = purchaseUnit?.amount?.value ? parseFloat(purchaseUnit.amount.value) : 0;
        const userRef = firebaseAdmin_1.db.collection('users').doc(userId);
        await firebaseAdmin_1.db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User not found.');
            }
            const currentCredits = (userDoc.data()?.credits || 0);
            const newCredits = currentCredits + amount;
            transaction.update(userRef, { credits: newCredits });
            const newTransactionRef = userRef.collection('transactions').doc();
            transaction.set(newTransactionRef, {
                type: 'purchase',
                creditsDelta: amount, // credits purchased
                amountUsd: paypalAmount, // USD paid (from PayPal)
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Purchased ${amount} credits via PayPal (Order ID: ${orderId})`,
                paypalOrderId: orderId,
                status: 'confirmed',
            });
        });
        res.status(200).send('Credits added successfully.');
        return;
    }
    catch (error) {
        console.error('Error processing PayPal payment:', error);
        if (error instanceof functions.https.HttpsError) {
            res.status(error.code === 'not-found' ? 404 : 500).send(error.message);
            return;
        }
        res.status(500).send('Internal Server Error');
        return;
    }
});
/* ────────────────────────────────────────────────────────────
   2) Callable — deduct credits for reading a story
   ──────────────────────────────────────────────────────────── */
exports.deductCreditsForRead = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const readerUid = context.auth.uid;
    const { storyId } = data;
    if (!storyId) {
        throw new functions.https.HttpsError('invalid-argument', 'Story ID is required.');
    }
    try {
        const storyRef = firebaseAdmin_1.db.collection('stories').doc(storyId);
        const readerRef = firebaseAdmin_1.db.collection('users').doc(readerUid);
        const adminRef = firebaseAdmin_1.db.collection('users').doc(NARRATUM_ADMIN_UID);
        return firebaseAdmin_1.db.runTransaction(async (transaction) => {
            const [storyDoc, readerDoc, adminDoc] = await Promise.all([
                transaction.get(storyRef),
                transaction.get(readerRef),
                transaction.get(adminRef),
            ]);
            if (!storyDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Story not found.');
            if (!readerDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Reader user not found.');
            if (!adminDoc.exists) {
                throw new functions.https.HttpsError('not-found', `Narratum Admin user not found (UID: ${NARRATUM_ADMIN_UID})`);
            }
            const storyType = storyDoc.data()?.type || 'basic';
            let cost = 0;
            let ownerUid = storyDoc.data()?.ownerUid;
            switch (storyType) {
                case 'basic':
                    cost = 1;
                    break;
                case 'premium':
                    cost = 5;
                    break;
                case 'convai':
                    cost = 15;
                    break;
                default: cost = 1;
            }
            const readerCredits = (readerDoc.data()?.credits || 0);
            if (readerCredits < cost) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits to read this story.', { remainingCredits: readerCredits });
            }
            // Optional referrer
            const referrerUid = readerDoc.data()?.referredBy;
            const referrerRef = referrerUid ? firebaseAdmin_1.db.collection('users').doc(referrerUid) : null;
            const referrerDoc = referrerRef ? await transaction.get(referrerRef) : null;
            // Deduct from reader
            transaction.update(readerRef, { credits: readerCredits - cost });
            readerRef.collection('transactions').doc().set({
                type: 'read',
                creditsDelta: -cost,
                storyId,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Deducted ${cost} credits for reading story: ${storyDoc.data()?.title || storyId}`,
                status: 'confirmed',
            });
            // Split distribution
            const split = CREDIT_SPLIT_CONFIG.read;
            let totalDistributed = 0;
            // Admin (AI+Storage + App cut)
            const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
            const appCutAmount = Math.floor(cost * split.APP_CUT);
            const adminTotal = aiStorageAmount + appCutAmount;
            if (adminTotal > 0) {
                transaction.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
                adminRef.collection('transactions').doc().set({
                    type: 'profit',
                    creditsDelta: adminTotal,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Credit profit (AI+Storage: ${aiStorageAmount}, App Cut: ${appCutAmount}) from story read by ${readerUid} for story ${storyId}`,
                    sourceUid: readerUid,
                    storyId,
                    status: 'confirmed',
                });
                totalDistributed += adminTotal;
            }
            // Author royalty
            if (ownerUid && ownerUid !== readerUid) {
                const royaltyAmount = Math.floor(cost * split.ROYALTY);
                if (royaltyAmount > 0) {
                    const ownerRef = firebaseAdmin_1.db.collection('users').doc(ownerUid);
                    const ownerDoc = await transaction.get(ownerRef);
                    if (ownerDoc.exists) {
                        transaction.update(ownerRef, { credits: (ownerDoc.data()?.credits || 0) + royaltyAmount });
                        ownerRef.collection('transactions').doc().set({
                            type: 'profit',
                            creditsDelta: royaltyAmount,
                            timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                            description: `Royalty earnings from ${readerUid} for story ${storyDoc.data()?.title || storyId}`,
                            sourceUid: readerUid,
                            storyId,
                            status: 'confirmed',
                        });
                        totalDistributed += royaltyAmount;
                    }
                }
            }
            // Referral
            const referralAmount = Math.floor(cost * split.REFERRAL);
            if (referralAmount > 0) {
                if (referrerUid && referrerDoc?.exists && referrerUid !== readerUid) {
                    transaction.update(referrerRef, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
                    referrerRef.collection('transactions').doc().set({
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral earnings from ${readerUid} reading story ${storyId}`,
                        sourceUid: readerUid,
                        storyId,
                        status: 'confirmed',
                    });
                    totalDistributed += referralAmount;
                }
                else {
                    const adminCurrent = (adminDoc.data()?.credits || 0);
                    transaction.update(adminRef, { credits: adminCurrent + referralAmount });
                    adminRef.collection('transactions').doc().set({
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral fallback from ${readerUid} reading story ${storyId}`,
                        sourceUid: readerUid,
                        storyId,
                        status: 'confirmed',
                    });
                    totalDistributed += referralAmount;
                }
            }
            // Remainder after floors
            const remainder = cost - totalDistributed;
            if (remainder > 0) {
                const adminCurrent = (adminDoc.data()?.credits || 0);
                transaction.update(adminRef, { credits: adminCurrent + remainder });
                adminRef.collection('transactions').doc().set({
                    type: 'profit',
                    creditsDelta: remainder,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Rounding adjustment from ${readerUid} reading ${storyId}`,
                    sourceUid: readerUid,
                    storyId,
                    status: 'confirmed',
                });
            }
            return { success: true, message: 'Credits deducted and distributed successfully.', remainingCredits: readerCredits - cost };
        });
    }
    catch (error) {
        console.error('Error deducting credits for read:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to deduct credits for read.', error.message);
    }
});
/* ────────────────────────────────────────────────────────────
   3) Callable — deduct credits for story creation
   ──────────────────────────────────────────────────────────── */
exports.deductCreditsForCreation = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const creatorUid = context.auth.uid;
    const { storyType } = data;
    if (!storyType || !['basic', 'premium', 'convai'].includes(storyType)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid story type provided.');
    }
    try {
        const creatorRef = firebaseAdmin_1.db.collection('users').doc(creatorUid);
        const adminRef = firebaseAdmin_1.db.collection('users').doc(NARRATUM_ADMIN_UID);
        return firebaseAdmin_1.db.runTransaction(async (transaction) => {
            const [creatorDoc, adminDoc] = await Promise.all([
                transaction.get(creatorRef),
                transaction.get(adminRef),
            ]);
            if (!creatorDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Creator user not found.');
            if (!adminDoc.exists) {
                throw new functions.https.HttpsError('not-found', `Narratum Admin user not found (UID: ${NARRATUM_ADMIN_UID})`);
            }
            let cost = 0;
            switch (storyType) {
                case 'basic':
                    cost = 5;
                    break;
                case 'premium':
                    cost = 10;
                    break;
                case 'convai':
                    cost = 15;
                    break;
                default: cost = 5;
            }
            const creatorCredits = (creatorDoc.data()?.credits || 0);
            if (creatorCredits < cost) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits to create this story.', { remainingCredits: creatorCredits });
            }
            // Optional referrer
            const referrerUid = creatorDoc.data()?.referredBy;
            const referrerRef = referrerUid ? firebaseAdmin_1.db.collection('users').doc(referrerUid) : null;
            const referrerDoc = referrerRef ? await transaction.get(referrerRef) : null;
            // Deduct from creator
            transaction.update(creatorRef, { credits: creatorCredits - cost });
            creatorRef.collection('transactions').doc().set({
                type: 'create',
                creditsDelta: -cost,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Deducted ${cost} credits for creating a ${storyType} story.`,
                storyType,
                status: 'confirmed',
            });
            // Split distribution
            const split = CREDIT_SPLIT_CONFIG.create;
            let totalDistributed = 0;
            // Admin (AI+Storage + App cut)
            const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
            const appCutAmount = Math.floor(cost * split.APP_CUT);
            const adminTotal = aiStorageAmount + appCutAmount;
            if (adminTotal > 0) {
                transaction.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
                adminRef.collection('transactions').doc().set({
                    type: 'profit',
                    creditsDelta: adminTotal,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Credit profit (AI+Storage: ${aiStorageAmount}, App Cut: ${appCutAmount}) from ${creatorUid} creating a ${storyType} story`,
                    sourceUid: creatorUid,
                    storyType,
                    status: 'confirmed',
                });
                totalDistributed += adminTotal;
            }
            // Referral
            const referralAmount = Math.floor(cost * split.REFERRAL);
            if (referralAmount > 0) {
                if (referrerUid && referrerDoc?.exists && referrerUid !== creatorUid) {
                    transaction.update(referrerRef, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
                    referrerRef.collection('transactions').doc().set({
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral earnings from ${creatorUid} creating a ${storyType} story`,
                        sourceUid: creatorUid,
                        storyType,
                        status: 'confirmed',
                    });
                    totalDistributed += referralAmount;
                }
                else {
                    const adminCurrent = (adminDoc.data()?.credits || 0);
                    transaction.update(adminRef, { credits: adminCurrent + referralAmount });
                    adminRef.collection('transactions').doc().set({
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral fallback from ${creatorUid} creating a ${storyType} story`,
                        sourceUid: creatorUid,
                        storyType,
                        status: 'confirmed',
                    });
                    totalDistributed += referralAmount;
                }
            }
            // No royalty on creation (per config)
            // Remainder after floors
            const remainder = cost - totalDistributed;
            if (remainder > 0) {
                const adminCurrent = (adminDoc.data()?.credits || 0);
                transaction.update(adminRef, { credits: adminCurrent + remainder });
                adminRef.collection('transactions').doc().set({
                    type: 'profit',
                    creditsDelta: remainder,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Rounding adjustment from ${creatorUid} creating a ${storyType} story`,
                    sourceUid: creatorUid,
                    storyType,
                    status: 'confirmed',
                });
            }
            return { success: true, message: 'Credits deducted and distributed successfully.', remainingCredits: creatorCredits - cost };
        });
    }
    catch (error) {
        console.error('Error deducting credits for creation:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to deduct credits for creation.', error.message);
    }
});
/* ────────────────────────────────────────────────────────────
   4) Callable — send a tip to a writer
   ──────────────────────────────────────────────────────────── */
exports.sendTipToWriter = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const senderUid = context.auth.uid;
    const { targetUid, amount } = data;
    if (!targetUid || typeof amount !== 'number' || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Target UID and a positive amount are required.');
    }
    if (senderUid === targetUid) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot send a tip to yourself.');
    }
    try {
        const senderRef = firebaseAdmin_1.db.collection('users').doc(senderUid);
        const targetRef = firebaseAdmin_1.db.collection('users').doc(targetUid);
        return firebaseAdmin_1.db.runTransaction(async (transaction) => {
            const [senderDoc, targetDoc] = await Promise.all([
                transaction.get(senderRef),
                transaction.get(targetRef),
            ]);
            if (!senderDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Sender user not found.');
            if (!targetDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Target writer user not found.');
            const senderCredits = (senderDoc.data()?.credits || 0);
            if (senderCredits < amount) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits to send this tip.');
            }
            // Deduct from sender
            transaction.update(senderRef, { credits: senderCredits - amount });
            senderRef.collection('transactions').doc().set({
                type: 'tip_given',
                creditsDelta: -amount,
                targetUid,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Sent ${amount} credits as a tip to ${targetDoc.data()?.displayName || targetUid}.`,
                status: 'confirmed',
            });
            // Add to target writer
            const targetCredits = (targetDoc.data()?.credits || 0);
            transaction.update(targetRef, { credits: targetCredits + amount });
            targetRef.collection('transactions').doc().set({
                type: 'tip_received',
                creditsDelta: amount,
                sourceUid: senderUid,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Received ${amount} credits as a tip from ${senderDoc.data()?.displayName || senderUid}.`,
                status: 'confirmed',
            });
            return { success: true, message: 'Tip sent successfully.' };
        });
    }
    catch (error) {
        console.error('Error sending tip to writer:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to send tip.', error.message);
    }
});
/* ────────────────────────────────────────────────────────────
   5) Callable — process PayPal subscriptions (proxies to Next API)
   ──────────────────────────────────────────────────────────── */
exports.processPayPalSubscription = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const userId = context.auth.uid;
    const { subscriptionID, planId, frequency, price, credits, referredBy } = data;
    if (!planId || !frequency || typeof price !== 'number' || price <= 0 || typeof credits !== 'number' || credits <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid subscription details.');
    }
    try {
        const verifySubscriptionUrl = process.env.NEXT_PUBLIC_VERCEL_URL
            ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}/api/paypal-verify-subscription`
            : 'http://localhost:3000/api/paypal-verify-subscription';
        const firebaseAuthToken = await firebaseAdmin_1.adminAuth.createCustomToken(userId);
        const resp = await fetch(verifySubscriptionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${firebaseAuthToken}`,
            },
            body: JSON.stringify({
                subscriptionID, // optional
                planName: planId,
                billingCycle: frequency,
                price,
                credits,
                referredBy,
            }),
        });
        const body = await resp.json();
        if (!resp.ok) {
            const msg = extractMessage(body, `Upstream error ${resp.status}`);
            throw new functions.https.HttpsError('unknown', msg);
        }
        const result = body;
        return result;
    }
    catch (error) {
        console.error('Error processing PayPal subscription:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to process PayPal subscription.', error?.message ?? 'Unknown error');
    }
});
/* ────────────────────────────────────────────────────────────
   6) Scheduled — grant monthly free credits
   ──────────────────────────────────────────────────────────── */
exports.grantMonthlyFreeCredits = functions.pubsub
    .schedule('every 1st of month 00:00')
    .timeZone('America/Los_Angeles')
    .onRun(async () => {
    const usersRef = firebaseAdmin_1.db.collection('users');
    const freeCreditsAmount = 25;
    const now = firebaseAdmin_1.Timestamp.now();
    const currentMonth = new Date(now.toDate()).getMonth();
    const currentYear = new Date(now.toDate()).getFullYear();
    try {
        const snapshot = await usersRef.get();
        const updates = [];
        snapshot.forEach((doc) => {
            const userData = doc.data();
            const lastGrantTimestamp = userData?.lastMonthlyCreditGrant;
            let shouldGrant = false;
            if (!lastGrantTimestamp) {
                shouldGrant = true;
            }
            else {
                const lastGrantDate = lastGrantTimestamp.toDate();
                if (lastGrantDate.getMonth() !== currentMonth || lastGrantDate.getFullYear() !== currentYear) {
                    shouldGrant = true;
                }
            }
            if (shouldGrant) {
                const userRef = doc.ref;
                updates.push(firebaseAdmin_1.db.runTransaction(async (transaction) => {
                    const userDoc = await transaction.get(userRef);
                    if (!userDoc.exists)
                        return;
                    const currentCredits = (userDoc.data()?.credits || 0);
                    transaction.update(userRef, {
                        credits: currentCredits + freeCreditsAmount,
                        lastMonthlyCreditGrant: now,
                    });
                    userRef.collection('transactions').doc().set({
                        type: 'free_monthly_grant',
                        creditsDelta: freeCreditsAmount,
                        timestamp: now,
                        description: `Received ${freeCreditsAmount} free monthly credits.`,
                        status: 'confirmed',
                    });
                }));
            }
        });
        await Promise.all(updates);
        console.log('Monthly free credits granted to eligible users.');
        return null;
    }
    catch (error) {
        console.error('Error granting monthly free credits:', error);
        throw new functions.https.HttpsError('internal', 'Failed to grant monthly free credits.', error.message);
    }
});
//# sourceMappingURL=credits.js.map