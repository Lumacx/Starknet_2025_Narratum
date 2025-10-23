// functions/src/processPayPalOneTimePayment.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  getPayPalAccessToken,
  resolvePayPalBase,
  PayPalOrderCaptureResponse,
} from './utils/paypal';

if (admin.apps.length === 0) admin.initializeApp();
const db = admin.firestore();

interface CreditPackage {
  id: string;
  tier: 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  value: number; // USD
}

/**
 * IMPORTANT:
 * Keep this in sync with createPayPalOrder.ts (or move to Firestore/Config).
 */
const creditPackages: CreditPackage[] = [
  { id: 'pkg_tester',  tier: 'Tester',  credits: 25,  value: 5.0  },
  { id: 'pkg_reader',  tier: 'Reader',  credits: 75,  value: 15.0 },
  { id: 'pkg_writer',  tier: 'Writer',  credits: 125, value: 25.0 },
  { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0 },
];

function determineUserTier(totalCredits: number): 'Tester' | 'Reader' | 'Writer' | 'Creator' | null {
  if (totalCredits >= 250) return 'Creator';
  if (totalCredits >= 125) return 'Writer';
  if (totalCredits >= 75)  return 'Reader';
  if (totalCredits >= 25)  return 'Tester';
  return null;
}

/** Find package by id and sanity-check the PayPal amount (2 decimals, USD). */
function validateAmountAndPackage(packageId: string, amount: { value?: string; currency_code?: string }) {
  const pkg = creditPackages.find(p => p.id === packageId);
  if (!pkg) {
    throw new functions.https.HttpsError('invalid-argument', `Unknown packageId "${packageId}".`);
  }
  const valueStr = (amount?.value ?? '').toString().trim();
  const ccy = (amount?.currency_code ?? '').toUpperCase();
  const normalized = Number.parseFloat(valueStr);

  // Compare to fixed 2-decimals (PayPal amounts are strings)
  const matches =
    Number.isFinite(normalized) &&
    ccy === 'USD' &&
    normalized.toFixed(2) === pkg.value.toFixed(2);

  if (!matches) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Mismatched payment amount: expected ${pkg.value.toFixed(2)} USD for ${packageId}, got ${valueStr || '—'} ${ccy || ''}`
    );
  }
  return pkg;
}

/** Defensive: pull first capture from response safely */
function firstCapture(res: PayPalOrderCaptureResponse | any) {
  const pu = Array.isArray(res?.purchase_units) ? res.purchase_units[0] : undefined;
  const cap = pu?.payments?.captures && Array.isArray(pu.payments.captures) ? pu.payments.captures[0] : undefined;
  return { pu, cap };
}

/** Try to parse JSON body; fall back to text. */
async function tryReadBody(resp: Response) {
  const text = await resp.text().catch(() => '');
  try { return JSON.parse(text); } catch { return text; }
}

export const processPayPalOneTimePayment = functions
  .region('us-central1')
  .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
  .https.onCall(async (data, context): Promise<any> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { orderId, userId, referredBy } = (data || {}) as {
      orderId?: string;
      userId?: string;
      referredBy?: string;
    };

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
    const accessToken = await getPayPalAccessToken().catch((err) => {
      functions.logger.error('Failed to get PayPal access token:', err);
      throw new functions.https.HttpsError('internal', 'Failed to authenticate with PayPal.');
    });

    const base = resolvePayPalBase();

    // ---- Attempt capture (retry-safe on ORDER_ALREADY_CAPTURED) ----
    let captureJson: PayPalOrderCaptureResponse | any;
    try {
      const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: '{}',
      });

      if (!captureRes.ok) {
        const body = await tryReadBody(captureRes);

        // If the order was already captured, treat as success and proceed to validate/credit
        const alreadyCaptured =
          captureRes.status === 422 &&
          typeof body === 'object' &&
          (body?.name === 'UNPROCESSABLE_ENTITY' || body?.name === 'ORDER_ALREADY_CAPTURED' || body?.details?.some?.((d: any) => d.issue === 'ORDER_ALREADY_CAPTURED'));

        if (!alreadyCaptured) {
          functions.logger.error('PayPal order capture failed:', captureRes.status, body);
          throw new functions.https.HttpsError(
            'unavailable',
            `PayPal order capture failed: ${captureRes.statusText || captureRes.status}`,
            { paypalResponse: body, orderId }
          );
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
      } else {
        captureJson = await captureRes.json();
      }
    } catch (err: any) {
      functions.logger.error('PayPal capture attempt error:', err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError('internal', err?.message || 'An unexpected error occurred during capture.', { orderId });
    }

    // ---- Validate PayPal status & extract details ----
    const status = (captureJson?.status || '').toUpperCase();

    if (status !== 'COMPLETED' && status !== 'APPROVED' && status !== 'CAPTURED') {
      // In some flows, intermediate APPROVED/COMPLETED appear differently. We guard strictly above.
      throw new functions.https.HttpsError(
        'cancelled',
        `PayPal order not in a completed state (status=${status || 'unknown'}).`,
        { paypalStatus: status }
      );
    }

    const { pu, cap } = firstCapture(captureJson);
    // When we fetched via GET (already-captured fallback), capture object may not be present; check purchase_units amount.
    const amountObj = cap?.amount ?? pu?.amount ?? pu?.payments?.captures?.[0]?.amount;

    const packageId = (pu as any)?.custom_id;
    if (!amountObj || !packageId) {
      throw new functions.https.HttpsError('internal', 'Missing transaction details in PayPal response.');
    }
    const pkg = validateAmountAndPackage(packageId, amountObj);
    const amountCredits = pkg.credits;

    const captureId = cap?.id || null;
    const captureTime = cap?.create_time || cap?.update_time || null;

    const payerEmail =
      captureJson?.payer?.email_address ||
      (Array.isArray(captureJson?.purchase_units) &&
        captureJson.purchase_units[0]?.payee?.email_address) ||
      null;

    // ---- Credit the user (transaction) ----
    let remainingCredits: number | null = null;

    await db.runTransaction(async (tx) => {
      const userRef = db.collection('users').doc(userId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new functions.https.HttpsError('not-found', 'User not found.');

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

      const currentCredits = Number(userSnap.data()?.credits ?? 0) || 0;
      const newCredits = currentCredits + amountCredits;
      remainingCredits = newCredits;

      tx.update(userRef, {
        credits: newCredits,
        lastPayPalPayment: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Global credit log
      const globalTxRef = db.collection('creditTransactions').doc();
      tx.set(globalTxRef, {
        userId,
        type: 'one-time',
        packageId,
        creditsGranted: amountCredits,
        pricePaid: Number(pkg.value),
        currency: 'USD',
        orderId,
        paypalCaptureId: captureId,
        paypalStatus: status,
        payerEmail,
        referredBy: referredBy || null,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        captureTime: captureTime || null,
      });

      // Per-user transaction mirror (great for account history UI)
      const userTxRef = userRef.collection('transactions').doc(globalTxRef.id);
      tx.set(userTxRef, {
        type: 'one-time',
        creditsDelta: amountCredits,
        amountUsd: Number(pkg.value),
        currency: 'USD',
        orderId,
        paypalCaptureId: captureId,
        paypalStatus: status,
        payerEmail,
        referredBy: referredBy || null,
        status: 'confirmed',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Purchased ${amountCredits} credits via PayPal (package ${packageId}).`,
        captureTime: captureTime || null,
      });

      // Mark processed (idempotency)
      tx.set(processedDocRef, { timestamp: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });

    // ---- Update custom claims (outside TX) ----
    try {
      if (remainingCredits !== null) {
        const newTier = determineUserTier(remainingCredits);
        if (newTier) {
          await admin.auth().setCustomUserClaims(userId, { tier: newTier });
          functions.logger.info(`Updated custom claims for user ${userId}: tier=${newTier}`);
        }
      }
    } catch (e) {
      // Don’t fail the payment if claims update hiccups
      functions.logger.warn('Custom claims update failed (non-fatal):', (e as Error)?.message || e);
    }

    functions.logger.info(`User ${userId} credited with ${amountCredits} credits for order ${orderId}.`);
    return {
      success: true,
      message: 'Payment processed successfully',
      orderId,
      captureId,
      status,
      remainingCredits,
    };
  });
