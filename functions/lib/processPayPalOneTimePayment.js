"use strict";
// functions/src/processPayPalOneTimePayment.ts
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
exports.processPayPalOneTimePayment = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const paypal_1 = require("./utils/paypal");
if (admin.apps.length === 0)
    admin.initializeApp();
const db = admin.firestore();
/* ----------------------------- Config ----ready for later---------------- */
// % of purchased credits that go to the referrer (e.g., 0.10 = 10%)
const REFERRER_CREDITS_PCT = 0.00;
// % bonus to the buyer when referred (set to 0.05 if you want 5% buyer bonus)
const BUYER_BONUS_PCT = 0.00;
// Minimum integer credits to award when a % is > 0 but very small
const MIN_REFERRAL_CREDIT = 0;
// If you store a human-friendly referralCode on users/{uid}.referralCode,
// we’ll try to match referredBy against that first, then fall back to UID match.
const USERS_COLLECTION = 'users';
/**
 * IMPORTANT:
 * Keep this in sync with createPayPalOrder.ts (or move to Firestore/Config).
 */
const creditPackages = [
    { id: 'pkg_tester', tier: 'Tester', credits: 25, value: 5.0 },
    { id: 'pkg_reader', tier: 'Reader', credits: 75, value: 15.0 },
    { id: 'pkg_writer', tier: 'Writer', credits: 125, value: 25.0 },
    { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0 },
];
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
/** Find package by id and sanity-check the PayPal amount (2 decimals, USD). */
function validateAmountAndPackage(packageId, amount) {
    const pkg = creditPackages.find(p => p.id === packageId);
    if (!pkg) {
        throw new functions.https.HttpsError('invalid-argument', `Unknown packageId "${packageId}".`);
    }
    const valueStr = (amount?.value ?? '').toString().trim();
    const ccy = (amount?.currency_code ?? '').toUpperCase();
    const normalized = Number.parseFloat(valueStr);
    // Compare to fixed 2-decimals (PayPal amounts are strings)
    const matches = Number.isFinite(normalized) &&
        ccy === 'USD' &&
        normalized.toFixed(2) === pkg.value.toFixed(2);
    if (!matches) {
        throw new functions.https.HttpsError('invalid-argument', `Mismatched payment amount: expected ${pkg.value.toFixed(2)} USD for ${packageId}, got ${valueStr || '—'} ${ccy || ''}`);
    }
    return pkg;
}
/** Defensive: pull first capture from response safely */
function firstCapture(res) {
    const pu = Array.isArray(res?.purchase_units) ? res.purchase_units[0] : undefined;
    const cap = pu?.payments?.captures && Array.isArray(pu.payments.captures) ? pu.payments.captures[0] : undefined;
    return { pu, cap };
}
/** Try to parse JSON body; fall back to text. */
async function tryReadBody(resp) {
    const text = await resp.text().catch(() => '');
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
/** Resolve a referredBy string to a userId, or null if not found/invalid/self. */
async function resolveReferrerUserId(buyerUid, referredBy) {
    if (!referredBy)
        return null;
    // Trim common noise (spaces, zero-width)
    const token = (referredBy || '').trim();
    if (!token)
        return null;
    try {
        // 1) Try to match by referralCode field
        const byCode = await db.collection(USERS_COLLECTION)
            .where('referralCode', '==', token)
            .limit(1)
            .get();
        if (!byCode.empty) {
            const uid = byCode.docs[0].id;
            if (uid !== buyerUid)
                return uid;
            return null; // self-referral ignored
        }
        // 2) Fallback: treat token as a UID
        const refSnap = await db.collection(USERS_COLLECTION).doc(token).get();
        if (refSnap.exists && refSnap.id !== buyerUid) {
            return refSnap.id;
        }
    }
    catch (e) {
        functions.logger.warn('resolveReferrerUserId lookup failed (non-fatal):', e?.message || e);
    }
    return null;
}
/* ---------------------------- Callable ---------------------------- */
exports.processPayPalOneTimePayment = functions
    .region('us-central1')
    .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { orderId, userId, referredBy } = (data || {});
    if (!orderId || !userId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid required payment data (orderId, userId).');
    }
    if (userId !== context.auth.uid) {
        // Prevent crediting someone else’s account.
        throw new functions.https.HttpsError('permission-denied', 'You can only process your own payments.');
    }
    // Idempotency guard — 1) fast path marker
    const processedDocRef = db.collection('processedOneTimePayments').doc(orderId);
    const processedSnap = await processedDocRef.get();
    if (processedSnap.exists) {
        functions.logger.info(`Order ${orderId} already processed (marker).`);
        return { success: true, message: 'Payment already processed (marker)', alreadyProcessed: true };
    }
    // Idempotency guard — 2) any existing creditTransactions with this orderId?
    const existingTxSnap = await db
        .collection('creditTransactions')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
    if (!existingTxSnap.empty) {
        functions.logger.info(`Order ${orderId} already processed (creditTransactions).`);
        // Write the marker to tighten the idempotency window for future calls
        await processedDocRef.set({ timestamp: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        return { success: true, message: 'Payment already processed (tx exists)', alreadyProcessed: true };
    }
    // OAuth
    const accessToken = await (0, paypal_1.getPayPalAccessToken)().catch((err) => {
        functions.logger.error('Failed to get PayPal access token:', err);
        throw new functions.https.HttpsError('internal', 'Failed to authenticate with PayPal.');
    });
    const base = (0, paypal_1.resolvePayPalBase)();
    // ---- Attempt capture (with Prefer + robust fallback) ----
    let captureJson;
    try {
        const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                // Ask PayPal to include full representation right away
                Prefer: 'return=representation',
            },
            body: '{}',
        });
        if (!captureRes.ok) {
            const body = await tryReadBody(captureRes);
            // If the order was already captured, treat as success and proceed to validate/credit
            const alreadyCaptured = captureRes.status === 422 &&
                typeof body === 'object' &&
                (body?.name === 'UNPROCESSABLE_ENTITY' ||
                    body?.name === 'ORDER_ALREADY_CAPTURED' ||
                    (Array.isArray(body?.details) && body.details.some((d) => d?.issue === 'ORDER_ALREADY_CAPTURED')));
            if (!alreadyCaptured) {
                functions.logger.error('PayPal order capture failed:', captureRes.status, body);
                throw new functions.https.HttpsError('unavailable', `PayPal order capture failed: ${captureRes.statusText || captureRes.status}`, { paypalResponse: body, orderId });
            }
            // If already captured, pull fresh order details to validate amounts
            const orderRes = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (!orderRes.ok) {
                const body2 = await tryReadBody(orderRes);
                functions.logger.error('Failed to fetch PayPal order after ORDER_ALREADY_CAPTURED:', orderRes.status, body2);
                throw new functions.https.HttpsError('internal', 'Could not confirm captured order from PayPal.', { orderId });
            }
            captureJson = await orderRes.json();
        }
        else {
            captureJson = await captureRes.json();
        }
    }
    catch (err) {
        functions.logger.error('PayPal capture attempt error:', err);
        if (err instanceof functions.https.HttpsError)
            throw err;
        throw new functions.https.HttpsError('internal', err?.message || 'An unexpected error occurred during capture.', { orderId });
    }
    // ---- Validate PayPal status & extract details ----
    const status = (captureJson?.status || '').toUpperCase();
    if (status !== 'COMPLETED' && status !== 'APPROVED' && status !== 'CAPTURED') {
        throw new functions.https.HttpsError('cancelled', `PayPal order not in a completed state (status=${status || 'unknown'}).`, { paypalStatus: status });
    }
    // Extract capture + amount carefully (fallbacks for inconsistent payloads)
    let { pu, cap } = firstCapture(captureJson);
    let amountObj = cap?.amount ??
        pu?.amount ??
        pu?.payments?.captures?.[0]?.amount ??
        null;
    // If still missing, do a details fetch fallback
    if (!amountObj || !pu) {
        try {
            const detailsRes = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const detailsJson = await detailsRes.json().catch(() => null);
            const fc = firstCapture(detailsJson);
            pu = fc.pu || pu;
            cap = fc.cap || cap;
            amountObj = amountObj || cap?.amount || pu?.amount || pu?.payments?.captures?.[0]?.amount || null;
        }
        catch (e) {
            functions.logger.warn('Fallback order details fetch failed (non-fatal):', e?.message || e);
        }
    }
    const packageId = pu?.custom_id;
    if (!amountObj || !packageId) {
        functions.logger.error('Missing transaction details. Raw capture/order payload:', JSON.stringify(captureJson).slice(0, 2000));
        throw new functions.https.HttpsError('failed-precondition', 'Missing transaction details in PayPal response.');
    }
    const pkg = validateAmountAndPackage(packageId, amountObj);
    const amountCredits = pkg.credits;
    const captureId = cap?.id || null;
    const captureTime = cap?.create_time || cap?.update_time || null;
    const payerEmail = captureJson?.payer?.email_address ||
        (Array.isArray(captureJson?.purchase_units) &&
            captureJson.purchase_units[0]?.payee?.email_address) ||
        null;
    // Resolve referrer UID (if any)
    const referrerUid = await resolveReferrerUserId(userId, referredBy);
    // ---- Credit the user (+ referral) atomically ----
    let remainingCredits = null;
    let referrerAwarded = null;
    let buyerBonusAwarded = null;
    await db.runTransaction(async (tx) => {
        const userRef = db.collection(USERS_COLLECTION).doc(userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists)
            throw new functions.https.HttpsError('not-found', 'User not found.');
        // Double-check idempotency inside the TX
        const processedSnap2 = await tx.get(processedDocRef);
        if (processedSnap2.exists) {
            functions.logger.info(`Order ${orderId} already processed (marker within TX). Skipping credit.`);
            return;
        }
        const existingTxSnap2 = await db
            .collection('creditTransactions')
            .where('orderId', '==', orderId)
            .limit(1)
            .get();
        if (!existingTxSnap2.empty) {
            functions.logger.info(`Order ${orderId} already processed (tx within TX). Skipping credit.`);
            // Still write marker for future fast idempotency:
            tx.set(processedDocRef, { timestamp: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            return;
        }
        // --- Primary buyer credit ---
        const currentCredits = Number(userSnap.data()?.credits ?? 0) || 0;
        const baseCredits = amountCredits;
        // Optional buyer bonus when referred
        const buyerBonus = referrerUid && BUYER_BONUS_PCT > 0
            ? Math.max(MIN_REFERRAL_CREDIT, Math.floor(baseCredits * BUYER_BONUS_PCT))
            : 0;
        const newBuyerCredits = currentCredits + baseCredits + buyerBonus;
        remainingCredits = newBuyerCredits;
        buyerBonusAwarded = buyerBonus || null;
        tx.update(userRef, {
            credits: newBuyerCredits,
            lastPayPalPayment: admin.firestore.FieldValue.serverTimestamp(),
        });
        // --- Global credit log ---
        const globalTxRef = db.collection('creditTransactions').doc();
        tx.set(globalTxRef, {
            userId,
            type: 'one-time',
            packageId,
            creditsGranted: baseCredits,
            buyerBonus: buyerBonus || 0,
            pricePaid: Number(pkg.value),
            currency: 'USD',
            orderId,
            paypalCaptureId: captureId,
            paypalStatus: status,
            payerEmail,
            referredBy: referredBy || null,
            referrerUid: referrerUid || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            captureTime: captureTime || null,
        });
        // --- Per-user transaction mirror ---
        const userTxRef = userRef.collection('transactions').doc(globalTxRef.id);
        tx.set(userTxRef, {
            type: 'one-time',
            creditsDelta: baseCredits + buyerBonus,
            amountUsd: Number(pkg.value),
            currency: 'USD',
            orderId,
            paypalCaptureId: captureId,
            paypalStatus: status,
            payerEmail,
            referredBy: referredBy || null,
            referrerUid: referrerUid || null,
            status: 'confirmed',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Purchased ${baseCredits} credits via PayPal (package ${packageId}).${buyerBonus ? ` +${buyerBonus} referral bonus` : ''}`,
            captureTime: captureTime || null,
        });
        // --- Referral split (credit the referrer) ---
        if (referrerUid) {
            const refUserRef = db.collection(USERS_COLLECTION).doc(referrerUid);
            const refSnap = await tx.get(refUserRef);
            if (refSnap.exists) {
                const refCurr = Number(refSnap.data()?.credits ?? 0) || 0;
                const refBonusRaw = Math.floor(baseCredits * REFERRER_CREDITS_PCT);
                const refBonus = Math.max(MIN_REFERRAL_CREDIT, refBonusRaw);
                const refNew = refCurr + refBonus;
                referrerAwarded = refBonus;
                tx.update(refUserRef, {
                    credits: refNew,
                    lastReferralCredit: admin.firestore.FieldValue.serverTimestamp(),
                });
                // Referral transaction record
                const referralTxRef = db.collection('referralTransactions').doc();
                tx.set(referralTxRef, {
                    orderId,
                    buyerUid: userId,
                    referrerUid,
                    packageId,
                    buyerCredits: baseCredits,
                    referrerCredits: refBonus,
                    buyerBonus,
                    currency: 'USD',
                    pricePaid: Number(pkg.value),
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    source: 'one-time',
                });
                // Optional: per-user mirror on referrer
                const refUserTxRef = refUserRef.collection('transactions').doc(referralTxRef.id);
                tx.set(refUserTxRef, {
                    type: 'referral-credit',
                    creditsDelta: refBonus,
                    sourceOrderId: orderId,
                    buyerUid: userId,
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    description: `Referral reward from ${userId} purchase (${packageId}).`,
                });
            }
        }
        // Mark processed (idempotency)
        tx.set(processedDocRef, { timestamp: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    // ---- Update buyer custom claims (outside TX) ----
    try {
        if (remainingCredits !== null) {
            const newTier = determineUserTier(remainingCredits);
            if (newTier) {
                await admin.auth().setCustomUserClaims(userId, { tier: newTier });
                functions.logger.info(`Updated custom claims for user ${userId}: tier=${newTier}`);
            }
        }
    }
    catch (e) {
        // Don’t fail the payment if claims update hiccups
        functions.logger.warn('Custom claims update failed (non-fatal):', e?.message || e);
    }
    functions.logger.info(`User ${userId} credited with ${amountCredits} (+${buyerBonusAwarded || 0} bonus).` +
        (referrerAwarded ? ` Referrer got +${referrerAwarded}.` : ''));
    return {
        success: true,
        message: 'Payment processed successfully',
        orderId,
        captureId,
        status,
        remainingCredits,
        referral: {
            referrerUid: referrerAwarded ? (await resolveReferrerUserId(userId, referredBy)) : null,
            referrerAwarded: referrerAwarded || 0,
            buyerBonusAwarded: buyerBonusAwarded || 0,
        },
    };
});
//# sourceMappingURL=processPayPalOneTimePayment.js.map