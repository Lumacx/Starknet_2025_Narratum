import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getPayPalAccessToken, resolvePayPalBase, PayPalOrderCaptureResponse } from './utils/paypal';

if (admin.apps.length === 0) admin.initializeApp();

const db = admin.firestore();

interface CreditPackage {
  id: string;
  tier: 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  value: number; // USD
  paypalHostedButtonId: string;
  popular?: boolean;
}

// NOTE: Consider moving to Firestore/Config later to avoid drift with frontend.
const creditPackages: CreditPackage[] = [
  { id: 'pkg_tester',  tier: 'Tester',  credits: 25,  value: 5.0,  paypalHostedButtonId: 'V2D9DHV8DQVCE' },
  { id: 'pkg_reader',  tier: 'Reader',  credits: 75,  value: 15.0, paypalHostedButtonId: 'CQ33GPF5623DU' },
  { id: 'pkg_writer',  tier: 'Writer',  credits: 125, value: 25.0, paypalHostedButtonId: '3YUKSD6AU4JH4', popular: true },
  { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0, paypalHostedButtonId: 'FRNPD2T8EBFVW' },
];

function determineUserTier(totalCredits: number): 'Tester' | 'Reader' | 'Writer' | 'Creator' | null {
  if (totalCredits >= 250) return 'Creator';
  if (totalCredits >= 125) return 'Writer';
  if (totalCredits >= 75)  return 'Reader';
  if (totalCredits >= 25)  return 'Tester';
  return null;
}

export const processPayPalOneTimePayment = functions
  .region('us-central1')
  .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
  .https.onCall(async (data, context): Promise<any> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { orderId, userId, amount, pricePaid, packageId, type, referredBy } = data || {};

    if (!orderId || !userId || typeof amount !== 'number' || typeof pricePaid !== 'number' || !packageId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing or invalid required payment data.');
    }

    // Idempotency guard
    const processedPaymentsRef = db.collection('processedOneTimePayments');
    const processedDocRef = processedPaymentsRef.doc(orderId);
    const processedSnap = await processedDocRef.get();
    if (processedSnap.exists) {
      functions.logger.info(`Order ${orderId} already processed. Skipping.`);
      return { success: true, message: 'Payment already processed' };
    }

    // OAuth
    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken(); // must read PAYPAL_* from secrets/env inside utils
    } catch (err: any) {
      functions.logger.error('Failed to get PayPal access token:', err);
      throw new functions.https.HttpsError('internal', 'Failed to authenticate with PayPal.');
    }

    const base = resolvePayPalBase(); // chooses live vs sandbox

    try {
      // Capture order
      const captureRes = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        // Per PayPal docs: empty JSON body for capture
        body: '{}',
      });

      if (!captureRes.ok) {
        const errBody = await captureRes.text().catch(() => '');
        functions.logger.error('PayPal order capture failed:', captureRes.status, errBody);
        throw new functions.https.HttpsError(
          'unavailable',
          `PayPal order capture failed: ${captureRes.statusText || captureRes.status}`,
          { paypalResponse: errBody, orderId }
        );
      }

      const captureResult = (await captureRes.json()) as PayPalOrderCaptureResponse;
      const captureStatus = captureResult.status;

      if (captureStatus !== 'COMPLETED') {
        throw new functions.https.HttpsError('cancelled', 'PayPal order not completed.', { paypalStatus: captureStatus });
      }

      // Credit user (transaction)
      await db.runTransaction(async (transaction) => {
        const userRef = db.collection('users').doc(userId);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists) {
          throw new functions.https.HttpsError('not-found', 'User not found.');
        }

        const currentCredits = Number(userSnap.data()?.credits ?? 0);
        const newCredits = currentCredits + amount;
        const newTier = determineUserTier(newCredits);

        transaction.update(userRef, {
          credits: newCredits,
          lastPayPalPayment: admin.firestore.FieldValue.serverTimestamp(),
        });

        const txRef = db.collection('creditTransactions').doc();
        transaction.set(txRef, {
          userId,
          type,
          packageId,
          creditsGranted: amount,
          pricePaid,
          currency: 'USD',
          orderId,
          paypalCaptureId: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id || null,
          referredBy: referredBy || null,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mark processed (idempotency)
        transaction.set(processedDocRef, { timestamp: admin.firestore.FieldValue.serverTimestamp() });

        // Optional: update custom claims tier
        if (newTier) {
          await admin.auth().setCustomUserClaims(userId, { tier: newTier });
          functions.logger.info(`Updated custom claims for user ${userId}: tier=${newTier}`);
        }
      });

      functions.logger.info(`User ${userId} credited with ${amount} credits for order ${orderId}.`);
      return { success: true, message: 'Payment processed successfully' };
    } catch (err: any) {
      functions.logger.error('processPayPalOneTimePayment error:', err);
      if (err instanceof functions.https.HttpsError) throw err;
      throw new functions.https.HttpsError('internal', err?.message || 'An unexpected error occurred.', {
        originalError: err?.message,
        orderId,
      });
    }
  });
