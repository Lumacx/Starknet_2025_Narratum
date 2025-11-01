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
exports.cancelPayPalSubscription = exports.getSubscriptionStatus = exports.activateFreePlan = void 0;
/* eslint-disable no-console */
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const firebaseAdmin_1 = require("./firebaseAdmin");
const paypal_1 = require("./utils/paypal");
if (admin.apps.length === 0)
    admin.initializeApp();
const REGION = 'us-central1';
exports.activateFreePlan = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    const callerUid = context.auth?.uid;
    if (!callerUid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { userId, planKey, frequency, credits, referredBy } = (data || {});
    if (!userId || callerUid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Caller must match userId.');
    }
    if (!planKey || !frequency || typeof credits !== 'number' || credits < 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing/invalid free plan data.');
    }
    const userRef = firebaseAdmin_1.db.collection('users').doc(userId);
    await firebaseAdmin_1.db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists)
            throw new functions.https.HttpsError('not-found', 'User not found.');
        const currentCredits = Number(snap.data()?.credits || 0) || 0;
        tx.set(userRef, {
            credits: currentCredits + credits,
            // mark “free plan”
            subscriptionStatus: 'free',
            planKey,
            planName: 'OG Free',
            billingCycle: frequency,
            subscriptionActivatedAt: firebaseAdmin_1.FieldValue.serverTimestamp(),
            lastSubscriptionUpdate: firebaseAdmin_1.FieldValue.serverTimestamp(),
            referredBy: referredBy || snap.data()?.referredBy || null,
            // clear any lingering PayPal reference
            paypalSubscriptionId: admin.firestore.FieldValue.delete(),
            paypalSubscriptionDetails: admin.firestore.FieldValue.delete(),
        }, { merge: true });
        // transaction log
        tx.set(userRef.collection('transactions').doc(), {
            type: 'free_plan_activation',
            creditsDelta: credits,
            timestamp: firebaseAdmin_1.FieldValue.serverTimestamp(),
            description: `Activated OG Free (${frequency}).`,
            status: 'confirmed',
        });
    });
    return { success: true, message: 'Free plan activated.' };
});
exports.getSubscriptionStatus = functions
    .region(REGION)
    .https.onCall(async (data, context) => {
    const callerUid = context.auth?.uid;
    if (!callerUid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { userId } = (data || {});
    if (!userId || userId !== callerUid) {
        throw new functions.https.HttpsError('permission-denied', 'Caller must match userId.');
    }
    const userRef = firebaseAdmin_1.db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists)
        return { kind: 'none' };
    const u = snap.data() || {};
    const planKey = u.planKey;
    const planName = u.planName;
    const frequency = u.billingCycle || u.billing_cycle;
    const paypalSubscriptionId = u.paypalSubscriptionId;
    // If there is a PayPal sub id, verify with PayPal
    if (paypalSubscriptionId) {
        try {
            const details = await (0, paypal_1.getPayPalSubscriptionDetails)(paypalSubscriptionId);
            const status = details?.status || 'UNKNOWN';
            const renewsAt = details?.billing_info?.next_billing_time ||
                details?.billing_info?.next_billing_date ||
                undefined;
            return {
                kind: 'paid',
                planKey,
                planName,
                frequency,
                paypalSubscriptionId,
                status,
                renewsAt,
            };
        }
        catch (e) {
            functions.logger.warn('getSubscriptionStatus: PayPal lookup failed; falling back to Firestore.', e);
            // fall through to Firestore-only logic
        }
    }
    // Firestore-only inference
    const statusText = (u.subscriptionStatus || '').toString().toLowerCase();
    if (statusText === 'free') {
        return { kind: 'free', planKey, planName, frequency, status: 'UNKNOWN' };
    }
    if (paypalSubscriptionId) {
        // We have a PayPal sub id but couldn’t fetch details → still “paid”, unknown status
        return { kind: 'paid', planKey, planName, frequency, paypalSubscriptionId, status: 'UNKNOWN' };
    }
    return { kind: 'none' };
});
exports.cancelPayPalSubscription = functions
    .region(REGION)
    .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
    .https.onCall(async (data, context) => {
    const callerUid = context.auth?.uid;
    if (!callerUid)
        throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    const { userId, paypalSubscriptionId, reason } = (data || {});
    if (!userId || callerUid !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Caller must match userId.');
    }
    if (!paypalSubscriptionId) {
        throw new functions.https.HttpsError('invalid-argument', 'paypalSubscriptionId is required.');
    }
    // Verify the user owns this subscription
    const userRef = firebaseAdmin_1.db.collection('users').doc(userId);
    const snap = await userRef.get();
    if (!snap.exists)
        throw new functions.https.HttpsError('not-found', 'User not found.');
    const currentSubId = (snap.data()?.paypalSubscriptionId || '').toString();
    if (!currentSubId || currentSubId !== paypalSubscriptionId) {
        throw new functions.https.HttpsError('failed-precondition', 'No matching active subscription for this user.');
    }
    // Call PayPal
    await (0, paypal_1.cancelPayPalSubscriptionApi)(paypalSubscriptionId, reason || 'User requested cancellation');
    // Update Firestore (keep paypalSubscriptionId for history; just mark status)
    await userRef.set({
        subscriptionStatus: 'cancelled',
        subscriptionCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSubscriptionUpdate: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true };
});
//# sourceMappingURL=subscriptions.js.map