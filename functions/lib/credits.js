"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.grantMonthlyFreeCredits = exports.processPayPalSubscription = exports.sendTipToWriter = exports.deductCreditsForReadHttp = exports.deductCreditsForRead = exports.processPayPalOneTimePayment = void 0;
// ────────────────────────────────────────────────────────────
// Gen-1 Firebase Functions imports
// ────────────────────────────────────────────────────────────
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const paypal_1 = require("./utils/paypal");
// ✅ Re-export the single source of truth for the callable:
var processPayPalOneTimePayment_1 = require("./processPayPalOneTimePayment");
Object.defineProperty(exports, "processPayPalOneTimePayment", { enumerable: true, get: function () { return processPayPalOneTimePayment_1.processPayPalOneTimePayment; } });
// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────
const REGION = 'us-central1';
const NARRATUM_ADMIN_UID = 'bOKyhlO8sofk5O4dGRTZAIfdYSx2';
const ALLOWLIST = new Set([
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
    else if (['premium', 'paid', 'pro'].includes(planRaw) ||
        typeRaw === 'premium' ||
        isPremiumFlag)
        bucket = 'premium';
    const cost = bucket === 'convai' ? 15 : bucket === 'premium' ? 5 : 1;
    const charging = (bucket === 'convai' || isPremiumFlag) ? 'pay-per-open' : 'one-time';
    return { cost, charging };
}
// CORS
function applyCors(res, origin) {
    const o = origin ?? '';
    if (ALLOWLIST.has(o)) {
        res.setHeader('Access-Control-Allow-Origin', o);
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
}
async function performDeductCreditsForRead(uid, { storyId, checkOnly }) {
    const storyRef = firebaseAdmin_1.db.collection('stories').doc(storyId);
    const readerRef = firebaseAdmin_1.db.collection('users').doc(uid);
    const adminRef = firebaseAdmin_1.db.collection('users').doc(NARRATUM_ADMIN_UID);
    const purchaseRef = readerRef.collection('purchases').doc(storyId);
    return await firebaseAdmin_1.db.runTransaction(async (tx) => {
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
        const { cost, charging } = resolveStoryPricing(story);
        const alreadyOwned = charging === 'one-time' && priorPurchaseDoc.exists;
        const needsPayment = charging === 'pay-per-open' ? true : !alreadyOwned;
        const currentCredits = Number(readerDoc.data()?.credits || 0) || 0;
        if (checkOnly) {
            return {
                success: true,
                storyId,
                chargingModel: charging,
                price: needsPayment ? cost : 0,
                alreadyOwned,
                needsPayment,
                remainingCredits: currentCredits,
            };
        }
        if (!needsPayment) {
            tx.set(readerRef.collection('reads').doc(), {
                type: 'access',
                storyId,
                timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                description: `Accessed already-owned story "${story.title || storyId}".`,
            });
            return {
                success: true,
                storyId,
                chargingModel: 'one-time',
                price: 0,
                alreadyOwned: true,
                needsPayment: false,
                charged: 0,
                remainingCredits: currentCredits,
            };
        }
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
        // Mark purchase for one-time
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
            tx.update(adminRef, { credits: (Number(adminDoc.data()?.credits || 0) || 0) + adminTotal });
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
                    tx.update(ownerRef, { credits: (Number(ownerDoc.data()?.credits || 0) || 0) + royaltyAmount });
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
                tx.update(referrerRef, { credits: (Number(referrerDoc.data()?.credits || 0) || 0) + referralAmount });
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
                const adminCurrent = (Number(adminDoc.data()?.credits || 0) || 0);
                tx.update(adminRef, { credits: adminCurrent + referralAmount });
                tx.set(adminRef.collection('transactions').doc(), {
                    type: 'profit',
                    creditsDelta: referralAmount,
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Referral fallback from ${uid} reading ${storyId}.`,
                    sourceUid: uid,
                    storyId,
                    status: 'confirmed',
                });
                distributed += referralAmount;
            }
        }
        // Remainder (floor rounding)
        const remainder = cost - distributed;
        if (remainder > 0) {
            const adminCurrent = (Number(adminDoc.data()?.credits || 0) || 0);
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
        return {
            success: true,
            storyId,
            chargingModel: charging,
            price: cost,
            alreadyOwned: false,
            needsPayment: true,
            charged: cost,
            remainingCredits: currentCredits - cost,
        };
    });
}
// ────────────────────────────────────────────────────────────
/** 2A) Callable — Deduct credits for reading (preferred) */
// ────────────────────────────────────────────────────────────
exports.deductCreditsForRead = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    const uid = context.auth?.uid;
    if (!uid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    try {
        if (!data?.storyId)
            throw new functions.https.HttpsError('invalid-argument', 'Story ID is required.');
        return await performDeductCreditsForRead(uid, data);
    }
    catch (error) {
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('deductCreditsForRead (callable) unexpected error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to deduct credits for read.', extractMessage(error, 'Unknown error'));
    }
});
// ────────────────────────────────────────────────────────────
/** 2B) HTTP mirror — Deduct credits for reading with CORS */
// ────────────────────────────────────────────────────────────
exports.deductCreditsForReadHttp = functions
    .region(REGION)
    .https.onRequest(async (req, res) => {
    applyCors(res, req.headers.origin);
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }
    try {
        const authHeader = (req.headers.authorization || '').toString();
        const m = authHeader.match(/^Bearer\s+(.+)$/i);
        if (!m) {
            res.status(401).json({ error: 'Missing Authorization bearer token.' });
            return;
        }
        const decoded = await firebaseAdmin_1.adminAuth.verifyIdToken(m[1]);
        const uid = decoded.uid;
        const body = req.body;
        if (!body?.storyId) {
            res.status(400).json({ error: 'Story ID is required.' });
            return;
        }
        const out = await performDeductCreditsForRead(uid, body);
        res.status(200).json(out);
        return;
    }
    catch (error) {
        console.error('deductCreditsForRead (HTTP) error:', error);
        if (error instanceof functions.https.HttpsError) {
            const code = error.code === 'not-found' ? 404 :
                error.code === 'failed-precondition' ? 412 :
                    error.code === 'unauthenticated' ? 401 : 400;
            res.status(code).json({ error: error.message, details: error.details ?? undefined });
            return;
        }
        res.status(500).json({ error: 'Internal Server Error' });
        return;
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
            const senderCredits = Number(senderDoc.data()?.credits || 0) || 0;
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
            const targetCredits = Number(targetDoc.data()?.credits || 0) || 0;
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
        if (error instanceof functions.https.HttpsError)
            throw error;
        console.error('sendTipToWriter unexpected error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to send tip.', extractMessage(error, 'Unknown error'));
    }
});
exports.processPayPalSubscription = functions
    .region(REGION)
    .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] }) // ensure tokens are available
    .https.onCall(async (raw, context) => {
    const userId = context.auth?.uid;
    if (!userId)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { subscriptionID, planId, frequency, price, credits, referredBy } = raw || {};
    if (!subscriptionID || !frequency || !price || !credits) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: subscriptionID, frequency, price, credits.');
    }
    try {
        // 1) Pull the latest state from PayPal
        const sub = await (0, paypal_1.getPayPalSubscriptionDetails)(subscriptionID);
        if (!sub)
            throw new functions.https.HttpsError('not-found', 'Subscription not found at PayPal.');
        const status = sub.status; // APPROVAL_PENDING | APPROVED | ACTIVE | SUSPENDED | CANCELLED | EXPIRED
        const isActiveish = status === 'ACTIVE' || status === 'APPROVED'; // some merchants see APPROVED briefly before ACTIVE
        // 2) Store/Update subscription doc (used by webhook later)
        const subRef = firebaseAdmin_1.db.collection('paypalSubscriptions').doc(subscriptionID);
        await subRef.set({
            userId,
            planId: planId || sub.plan_id || null,
            frequency,
            price,
            creditsPerCycle: credits,
            status,
            referredBy: referredBy || null,
            lastSyncedAt: firebaseAdmin_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        // 3) If active right now, credit immediately and mark user’s subscription
        if (isActiveish) {
            await firebaseAdmin_1.db.runTransaction(async (tx) => {
                const userRef = firebaseAdmin_1.db.collection('users').doc(userId);
                const snap = await tx.get(userRef);
                if (!snap.exists)
                    throw new functions.https.HttpsError('not-found', 'User not found.');
                // Check for existing initial credit transaction to prevent double-crediting
                // ✅ Build query from db, then read it via tx.get(query)
                const txCol = firebaseAdmin_1.db.collection('users').doc(userId).collection('transactions');
                const q = txCol
                    .where('type', '==', 'subscription_initial')
                    .where('paypalSubscriptionId', '==', subscriptionID)
                    .limit(1);
                const existingTransactionSnap = await tx.get(q);
                if (!existingTransactionSnap.empty) {
                    functions.logger.info(`Initial credit for subscription ${subscriptionID} already granted to user ${userId}. Skipping.`);
                    return; // Exit transaction if already credited
                }
                const currentCredits = Number(snap.data()?.credits || 0) || 0;
                tx.update(userRef, {
                    credits: currentCredits + credits,
                    subscription: {
                        subscriptionId: subscriptionID,
                        planId: planId || sub.plan_id || null,
                        frequency,
                        price,
                        creditsPerCycle: credits,
                        status,
                        lastPaymentAt: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    },
                });
                tx.set(userRef.collection('transactions').doc(), {
                    type: 'subscription_initial',
                    creditsDelta: credits,
                    amountUsd: price,
                    paypalSubscriptionId: subscriptionID,
                    status: 'confirmed',
                    timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
                    description: `Initial subscription credit (${frequency}).`,
                });
            });
        }
        return {
            success: true,
            status,
            subscriptionId: subscriptionID,
            message: isActiveish
                ? 'Subscription verified and credited.'
                : `Subscription recorded (status: ${status}). Will credit on activation webhook.`
        };
    }
    catch (err) {
        functions.logger.error('processPayPalSubscription error:', err);
        if (err instanceof functions.https.HttpsError)
            throw err;
        throw new functions.https.HttpsError('internal', err?.message || 'Unknown error');
    }
});
// ────────────────────────────────────────────────────────────
/** 6) Scheduled — Monthly free credits (2:00 AM CR, 1st) */
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
                    const currentCredits = Number(userDoc.data()?.credits || 0) || 0;
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