
import * as functions from 'firebase-functions';
import { getPayPalAccessToken, resolvePayPalBase } from './utils/paypal';

// This should be the single source of truth for packages,
// ideally fetched from Firestore configuration to avoid drift.
const creditPackages = [
  { id: 'pkg_tester',  credits: 25,  value: 5.0  },
  { id: 'pkg_reader',  credits: 75,  value: 15.0 },
  { id: 'pkg_writer',  credits: 125, value: 25.0 },
  { id: 'pkg_creator', credits: 250, value: 50.0 },
];

export const createPayPalOrder = functions
  .region('us-central1')
  .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { packageId } = data;
    if (!packageId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing packageId.');
    }

    const selectedPackage = creditPackages.find(p => p.id === packageId);
    if (!selectedPackage) {
      throw new functions.https.HttpsError('not-found', 'Credit package not found.');
    }

    let accessToken: string;
    try {
      accessToken = await getPayPalAccessToken();
    } catch (err) {
      functions.logger.error('Failed to get PayPal access token:', err);
      throw new functions.https.HttpsError('internal', 'Failed to authenticate with PayPal.');
    }

    const base = resolvePayPalBase();
    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: selectedPackage.value.toFixed(2),
        },
        description: `Narratum Credits: ${selectedPackage.credits}`,
        custom_id: packageId, // Pass packageId to be visible in PayPal order details
      }],
      application_context: {
        brand_name: 'Narratum',
        return_url: 'https://narratum.app/buy-credits?payment_success=true', // Optional: Redirect for UX
        cancel_url: 'https://narratum.app/buy-credits?payment_cancelled=true', // Optional
      }
    };

    try {
      const response = await fetch(`${base}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'PayPal-Request-Id': (context.rawRequest as any).id, // for idempotency
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        functions.logger.error('PayPal order creation failed:', response.status, errBody);
        throw new functions.https.HttpsError('internal', 'Failed to create PayPal order.');
      }

      const order = (await response.json()) as { id: string };
      return { orderId: order.id };

    } catch (error) {
      functions.logger.error('Error creating PayPal order:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'An unexpected error occurred while creating the order.');
    }
  });
