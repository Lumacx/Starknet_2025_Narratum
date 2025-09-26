"use strict";
// functions/src/credits.ts
/* eslint-disable no-console */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantMonthlyFreeCredits = exports.processPayPalSubscription = exports.sendTipToWriter = exports.deductCreditsForCreation = exports.deductCreditsForRead = exports.processPayPalPayment = void 0;
// ────────────────────────────────────────────────────────────
// Gen-1 Firebase Functions imports
// ────────────────────────────────────────────────────────────
const functions = __importStar(require("firebase-functions"));
const cors_1 = __importDefault(require("cors"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const paypal_1 = require("./utils/paypal");
// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────
const REGION = 'us-central1';
const NARRATUM_ADMIN_UID = 'bOKyhlO8sofk5O4dGRTZAIfdYSx2';
const ALLOWED_ORIGINS = new Set([
    'https://storyreader.narratum.app',
    'https://narratum.app',
    'https://www.narratum.app',
    'http://localhost:3000',
]);
const CREDIT_SPLIT_CONFIG = {
    read: { AI_STORAGE: 0.10, APP_CUT: 0.10, ROYALTY: 0.60, REFERRAL: 0.20 },
    create: { AI_STORAGE: 0.35, APP_CUT: 0.25, ROYALTY: 0.00, REFERRAL: 0.40 },
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
function resolveStoryPricing(story) {
    const typeRaw = (story?.type ?? story?.storyType ?? story?.metadata?.storyType ?? '').toString().toLowerCase();
    const planRaw = (story?.plan ?? story?.creatorPlan ?? story?.metadata?.plan ?? '').toString().toLowerCase();
    const isConvai = !!story?.elevenlabsAgentId ||
        !!story?.elevenLabsAgentId ||
        !!story?.voiceAgentId ||
        !!story?.agentId ||
        !!story?.metadata?.elevenlabsAgentId ||
        !!story?.metadata?.voiceAgentId;
    const isPremiumFlag = Boolean(story?.isPremium);
    let bucket = 'basic';
    if (isConvai || planRaw === 'convai' || typeRaw === 'convai')
        bucket = 'convai';
    else if (['premium', 'paid', 'pro'].includes(planRaw) || typeRaw === 'premium' || isPremiumFlag)
        bucket = 'premium';
    const cost = bucket === 'convai' ? 15 : bucket === 'premium' ? 5 : 1;
    const charging = (bucket === 'convai' || isPremiumFlag) ? 'pay-per-open' : 'one-time';
    return { cost, charging };
}
// ────────────────────────────────────────────────────────────
// 1) HTTP (Gen-1) — PayPal one-time payment with CORS
// ────────────────────────────────────────────────────────────
const corsHandler = (0, cors_1.default)({ origin: true, credentials: true });
exports.processPayPalPayment = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    const origin = req.headers.origin ?? '';
    if (ALLOWED_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    corsHandler(req, res, async () => {
        if (req.method === 'OPTIONS')
            return res.status(204).send('');
        if (req.method !== 'POST')
            return res.status(405).send('Method Not Allowed');
        try {
            const { orderId, userId, amount } = req.body;
            if (!orderId || !userId || typeof amount !== 'number' || amount <= 0) {
                return res.status(400).send('Invalid request: orderId, userId, and positive amount are required.');
            }
            const orderDetails = await (0, paypal_1.verifyPayPalOrder)(orderId);
            if (!orderDetails || orderDetails.status !== 'COMPLETED') {
                console.error('PayPal order not completed:', orderDetails);
                return res.status(400).send('PayPal order not completed or invalid.');
            }
            const purchaseUnit = orderDetails.purchase_units?.[0];
            const paypalAmount = purchaseUnit?.amount?.value ? parseFloat(purchaseUnit.amount.value) : 0;
            const userRef = firebaseAdmin_1.db.collection('users').doc(userId);
            await firebaseAdmin_1.db.runTransaction(async (tx) => {
                const userDoc = await tx.get(userRef);
                if (!userDoc.exists)
                    throw new functions.https.HttpsError('not-found', 'User not found.');
                const currentCredits = (userDoc.data()?.credits || 0);
                tx.update(userRef, { credits: currentCredits + amount });
                const txRef = userRef.collection('transactions').doc();
                tx.set(txRef, {
                    type: 'purchase',
                    creditsDelta: amount,
                    amountUsd: paypalAmount,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Purchased ${amount} credits via PayPal (Order ID: ${orderId})`,
                    paypalOrderId: orderId,
                    status: 'confirmed',
                });
            });
            return res.status(200).send('Credits added successfully.');
        }
        catch (err) {
            console.error('Error processing PayPal payment:', err);
            const msg = err instanceof functions.https.HttpsError ? err.message : 'Internal Server Error';
            return res
                .status(err instanceof functions.https.HttpsError && err.code === 'not-found' ? 404 : 500)
                .send(msg);
        }
    });
});
exports.deductCreditsForRead = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { storyId, checkOnly } = (data || {});
    if (!storyId)
        throw new functions.https.HttpsError('invalid-argument', 'Story ID is required.');
    try {
        const storyRef = firebaseAdmin_1.db.collection('stories').doc(storyId);
        const readerRef = firebaseAdmin_1.db.collection('users').doc(uid);
        const adminRef = firebaseAdmin_1.db.collection('users').doc(NARRATUM_ADMIN_UID);
        const purchaseRef = readerRef.collection('purchases').doc(storyId);
        const result = await firebaseAdmin_1.db.runTransaction(async (tx) => {
            const [storyDoc, readerDoc, adminDoc, priorPurchaseDoc] = await Promise.all([
                tx.get(storyRef),
                tx.get(readerRef),
                tx.get(adminRef),
                tx.get(purchaseRef),
            ]);
            if (!storyDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Story not found.');
            if (!readerDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Reader user not found.');
            if (!adminDoc.exists)
                throw new functions.https.HttpsError('not-found', `Admin user ${NARRATUM_ADMIN_UID} not found.`);
            const story = storyDoc.data() || {};
            const { cost, charging } = resolveStoryPricing(story); // <- ChargingModel (union), not string
            const alreadyOwned = charging === 'one-time' && priorPurchaseDoc.exists;
            const needsPayment = charging === 'pay-per-open' ? true : !alreadyOwned;
            const currentCredits = (readerDoc.data()?.credits || 0);
            // Preflight only
            if (checkOnly) {
                const out = {
                    success: true,
                    storyId,
                    chargingModel: charging,
                    price: needsPayment ? cost : 0,
                    alreadyOwned,
                    needsPayment,
                    remainingCredits: currentCredits,
                };
                return out;
            }
            // No charge if already owned (one-time)
            if (!needsPayment) {
                tx.set(readerRef.collection('reads').doc(), {
                    type: 'access',
                    storyId,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Accessed already-owned story "${story.title || storyId}".`,
                });
                const out = {
                    success: true,
                    storyId,
                    chargingModel: 'one-time',
                    price: 0,
                    alreadyOwned: true,
                    needsPayment: false,
                    charged: 0,
                    remainingCredits: currentCredits,
                };
                return out;
            }
            // Funds check
            if (currentCredits < cost) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.', {
                    remainingCredits: currentCredits,
                });
            }
            // Optional referrer
            const referrerUid = readerDoc.data()?.referredBy;
            const referrerRef = referrerUid ? firebaseAdmin_1.db.collection('users').doc(referrerUid) : null;
            const referrerDoc = referrerRef ? await tx.get(referrerRef) : null;
            // Deduct
            tx.update(readerRef, { credits: currentCredits - cost });
            tx.set(readerRef.collection('transactions').doc(), {
                type: 'read',
                creditsDelta: -cost,
                storyId,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Deducted ${cost} credits for reading "${story.title || storyId}".`,
                status: 'confirmed',
                chargingModel: charging,
            });
            // Mark purchase for one-time model
            if (charging === 'one-time') {
                tx.set(purchaseRef, {
                    storyId,
                    purchasedAt: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    pricePaid: cost,
                    lifetimeAccess: true,
                    storyTitle: story.title || null,
                    storyType: story?.type ?? null,
                });
            }
            // Split distribution
            const split = CREDIT_SPLIT_CONFIG.read;
            let distributed = 0;
            const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
            const appCutAmount = Math.floor(cost * split.APP_CUT);
            const adminTotal = aiStorageAmount + appCutAmount;
            if (adminTotal > 0) {
                tx.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
                tx.set(adminRef.collection('transactions').doc(), {
                    type: 'profit',
                    creditsDelta: adminTotal,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `AI+Storage (${aiStorageAmount}) + App Cut (${appCutAmount}) from read by ${uid} (story ${storyId}).`,
                    sourceUid: uid,
                    storyId,
                    status: 'confirmed',
                });
                distributed += adminTotal;
            }
            const ownerUid = (story.ownerUid || story.ownerId || story.creatorUid || story.userId);
            if (ownerUid && ownerUid !== uid) {
                const royaltyAmount = Math.floor(cost * split.ROYALTY);
                if (royaltyAmount > 0) {
                    const ownerRef = firebaseAdmin_1.db.collection('users').doc(ownerUid);
                    const ownerDoc = await tx.get(ownerRef);
                    if (ownerDoc.exists) {
                        tx.update(ownerRef, { credits: (ownerDoc.data()?.credits || 0) + royaltyAmount });
                        tx.set(ownerRef.collection('transactions').doc(), {
                            type: 'profit',
                            creditsDelta: royaltyAmount,
                            timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                            description: `Royalty from ${uid} for story "${story.title || storyId}".`,
                            sourceUid: uid,
                            storyId,
                            status: 'confirmed',
                        });
                        distributed += royaltyAmount;
                    }
                }
            }
            const referralAmount = Math.floor(cost * split.REFERRAL);
            if (referralAmount > 0) {
                if (referrerUid && referrerDoc?.exists && referrerUid !== uid) {
                    tx.update(referrerRef, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
                    tx.set(referrerRef.collection('transactions').doc(), {
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral earnings from ${uid} reading story ${storyId}.`,
                        sourceUid: uid,
                        storyId,
                        status: 'confirmed',
                    });
                    distributed += referralAmount;
                }
                else {
                    const adminCurrent = (adminDoc.data()?.credits || 0);
                    tx.update(adminRef, { credits: adminCurrent + referralAmount });
                    tx.set(adminRef.collection('transactions').doc(), {
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral fallback from ${uid} reading story ${storyId}.`,
                        sourceUid: uid,
                        storyId,
                        status: 'confirmed',
                    });
                    distributed += referralAmount;
                }
            }
            // Remainder due to floors
            const remainder = cost - distributed;
            if (remainder > 0) {
                const adminCurrent = (adminDoc.data()?.credits || 0);
                tx.update(adminRef, { credits: adminCurrent + remainder });
                tx.set(adminRef.collection('transactions').doc(), {
                    type: 'profit',
                    creditsDelta: remainder,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Rounding adjustment from ${uid} reading ${storyId}.`,
                    sourceUid: uid,
                    storyId,
                    status: 'confirmed',
                });
            }
            const out = {
                success: true,
                storyId,
                chargingModel: charging,
                price: cost,
                alreadyOwned: false,
                needsPayment: true,
                charged: cost,
                remainingCredits: currentCredits - cost,
            };
            return out;
        });
        return result;
    }
    catch (error) {
        console.error('Error deducting credits for read:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to deduct credits for read.', error?.message);
    }
});
exports.deductCreditsForCreation = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    const creatorUid = context.auth?.uid;
    if (!creatorUid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { storyType } = (data || {});
    if (!storyType || !['basic', 'premium', 'convai'].includes(storyType)) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid story type.');
    }
    try {
        const creatorRef = firebaseAdmin_1.db.collection('users').doc(creatorUid);
        const adminRef = firebaseAdmin_1.db.collection('users').doc(NARRATUM_ADMIN_UID);
        const result = await firebaseAdmin_1.db.runTransaction(async (tx) => {
            const [creatorDoc, adminDoc] = await Promise.all([tx.get(creatorRef), tx.get(adminRef)]);
            if (!creatorDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Creator user not found.');
            if (!adminDoc.exists)
                throw new functions.https.HttpsError('not-found', `Admin user ${NARRATUM_ADMIN_UID} not found.`);
            const cost = storyType === 'convai' ? 15 : storyType === 'premium' ? 10 : 5;
            const creatorCredits = (creatorDoc.data()?.credits || 0);
            if (creatorCredits < cost) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.', {
                    remainingCredits: creatorCredits,
                });
            }
            const referrerUid = creatorDoc.data()?.referredBy;
            const referrerRef = referrerUid ? firebaseAdmin_1.db.collection('users').doc(referrerUid) : null;
            const referrerDoc = referrerRef ? await tx.get(referrerRef) : null;
            tx.update(creatorRef, { credits: creatorCredits - cost });
            tx.set(creatorRef.collection('transactions').doc(), {
                type: 'create',
                creditsDelta: -cost,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Deducted ${cost} credits for creating a ${storyType} story.`,
                storyType,
                status: 'confirmed',
            });
            const split = CREDIT_SPLIT_CONFIG.create;
            let distributed = 0;
            const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
            const appCutAmount = Math.floor(cost * split.APP_CUT);
            const adminTotal = aiStorageAmount + appCutAmount;
            if (adminTotal > 0) {
                tx.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotal });
                tx.set(adminRef.collection('transactions').doc(), {
                    type: 'profit',
                    creditsDelta: adminTotal,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `AI+Storage (${aiStorageAmount}) + App Cut (${appCutAmount}) from ${creatorUid} creating ${storyType}.`,
                    sourceUid: creatorUid,
                    storyType,
                    status: 'confirmed',
                });
                distributed += adminTotal;
            }
            const referralAmount = Math.floor(cost * split.REFERRAL);
            if (referralAmount > 0) {
                if (referrerUid && referrerDoc?.exists && referrerUid !== creatorUid) {
                    tx.update(referrerRef, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
                    tx.set(referrerRef.collection('transactions').doc(), {
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral earnings from ${creatorUid} creating ${storyType}.`,
                        sourceUid: creatorUid,
                        storyType,
                        status: 'confirmed',
                    });
                    distributed += referralAmount;
                }
                else {
                    const adminCurrent = (adminDoc.data()?.credits || 0);
                    tx.update(adminRef, { credits: adminCurrent + referralAmount });
                    tx.set(adminRef.collection('transactions').doc(), {
                        type: 'profit',
                        creditsDelta: referralAmount,
                        timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                        description: `Referral fallback from ${creatorUid} creating ${storyType}.`,
                        sourceUid: creatorUid,
                        storyType,
                        status: 'confirmed',
                    });
                    distributed += referralAmount;
                }
            }
            const remainder = cost - distributed;
            if (remainder > 0) {
                const adminCurrent = (adminDoc.data()?.credits || 0);
                tx.update(adminRef, { credits: adminCurrent + remainder });
                tx.set(adminRef.collection('transactions').doc(), {
                    type: 'profit',
                    creditsDelta: remainder,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Rounding adjustment from ${creatorUid} creating ${storyType}.`,
                    sourceUid: creatorUid,
                    storyType,
                    status: 'confirmed',
                });
            }
            return { success: true, message: 'Credits deducted & distributed.', remainingCredits: creatorCredits - cost };
        });
        return result;
    }
    catch (error) {
        console.error('Error deducting credits for creation:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to deduct credits for creation.', error?.message);
    }
});
exports.sendTipToWriter = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    const senderUid = context.auth?.uid;
    if (!senderUid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { targetUid, amount } = (data || {});
    if (!targetUid || typeof amount !== 'number' || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Target UID and positive amount are required.');
    }
    if (senderUid === targetUid)
        throw new functions.https.HttpsError('invalid-argument', 'Cannot tip yourself.');
    try {
        const senderRef = firebaseAdmin_1.db.collection('users').doc(senderUid);
        const targetRef = firebaseAdmin_1.db.collection('users').doc(targetUid);
        const result = await firebaseAdmin_1.db.runTransaction(async (tx) => {
            const [senderDoc, targetDoc] = await Promise.all([tx.get(senderRef), tx.get(targetRef)]);
            if (!senderDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Sender not found.');
            if (!targetDoc.exists)
                throw new functions.https.HttpsError('not-found', 'Target not found.');
            const senderCredits = (senderDoc.data()?.credits || 0);
            if (senderCredits < amount)
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits.');
            tx.update(senderRef, { credits: senderCredits - amount });
            tx.set(senderRef.collection('transactions').doc(), {
                type: 'tip_given',
                creditsDelta: -amount,
                targetUid,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Sent ${amount} credits as a tip to ${targetDoc.data()?.displayName || targetUid}.`,
                status: 'confirmed',
            });
            const targetCredits = (targetDoc.data()?.credits || 0);
            tx.update(targetRef, { credits: targetCredits + amount });
            tx.set(targetRef.collection('transactions').doc(), {
                type: 'tip_received',
                creditsDelta: amount,
                sourceUid: senderUid,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Received ${amount} credits as a tip from ${senderDoc.data()?.displayName || senderUid}.`,
                status: 'confirmed',
            });
            return { success: true, message: 'Tip sent.' };
        });
        return result;
    }
    catch (error) {
        console.error('Error sending tip:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to send tip.', error?.message);
    }
});
exports.processPayPalSubscription = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    const userId = context.auth?.uid;
    if (!userId)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { subscriptionID, planId, frequency, price, credits, referredBy } = (data || {});
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
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${firebaseAuthToken}` },
            body: JSON.stringify({ subscriptionID, planName: planId, billingCycle: frequency, price, credits, referredBy }),
        });
        const body = await resp.json();
        if (!resp.ok) {
            const msg = extractMessage(body, `Upstream error ${resp.status}`);
            throw new functions.https.HttpsError('unknown', msg);
        }
        return body;
    }
    catch (error) {
        console.error('Error processing PayPal subscription:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'Failed to process PayPal subscription.', error?.message ?? 'Unknown error');
    }
});
// ────────────────────────────────────────────────────────────
/** 6) Scheduled (Gen-1) — Monthly free credits (2:00 AM CR, 1st) */
// ────────────────────────────────────────────────────────────
exports.grantMonthlyFreeCredits = functions
    .region(REGION)
    .pubsub.schedule('0 2 1 * *') // 2:00 AM on the 1st of each month
    .timeZone('America/Costa_Rica')
    .onRun(async () => {
    const usersRef = firebaseAdmin_1.db.collection('users');
    const freeCreditsAmount = 25;
    const now = firebaseAdmin_1.Timestamp.now();
    const current = now.toDate();
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();
    try {
        const snapshot = await usersRef.get();
        const updates = [];
        snapshot.forEach((docSnap) => {
            const userData = docSnap.data();
            const lastGrantTimestamp = userData?.lastMonthlyCreditGrant;
            const shouldGrant = !lastGrantTimestamp ||
                lastGrantTimestamp.toDate().getMonth() !== currentMonth ||
                lastGrantTimestamp.toDate().getFullYear() !== currentYear;
            if (shouldGrant) {
                const userRef = docSnap.ref;
                updates.push(firebaseAdmin_1.db.runTransaction(async (tx) => {
                    const userDoc = await tx.get(userRef);
                    if (!userDoc.exists)
                        return;
                    const currentCredits = (userDoc.data()?.credits || 0);
                    tx.update(userRef, {
                        credits: currentCredits + freeCreditsAmount,
                        lastMonthlyCreditGrant: now,
                    });
                    tx.set(userRef.collection('transactions').doc(), {
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