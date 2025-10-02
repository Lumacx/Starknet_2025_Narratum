// functions/src/processPayPalOneTimePayment.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) admin.initializeApp();

// Allow only your site + local dev
const ALLOWED_ORIGINS = new Set([
  'https://storyreader.narratum.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function setCorsHeaders(req: functions.https.Request, res: functions.Response) {
  const origin = (req.headers.origin as string) || '';
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Mock PayPal API (replace with actual PayPal SDK integration)
const mockPaypal = {
  orders: {
    create: async (body: any) => {
      // Simulate PayPal API call
      console.log('Mock PayPal Create Order:', body);
      return {
        result: {
          id: 'mock_order_id_123',
          status: 'CREATED',
          links: [{ href: 'mock_approval_link', rel: 'approve' }],
        },
      };
    },
    capture: async (orderId: string) => {
      // Simulate PayPal API call
      console.log('Mock PayPal Capture Order:', orderId);
      return {
        result: {
          id: orderId,
          status: 'COMPLETED',
          purchase_units: [{ payments: { captures: [{ id: 'mock_capture_id' }] } }],
        },
      };
    },
  },
};

export const processPayPalOneTimePayment = functions
  .region('us-central1')
  .https.onRequest(async (req, res): Promise<void> => {
    setCorsHeaders(req, res); // Set CORS headers for all responses

    // Preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' });
      return;
    }

    try {
      const { orderId, userId, amount, pricePaid, packageId, type, referredBy } = req.body;

      // Simulate capturing the order (replace with actual PayPal API call)
      const captureResponse = await mockPaypal.orders.capture(orderId);
      const captureStatus = captureResponse.result.status;

      if (captureStatus === 'COMPLETED') {
        // Here you would typically update your database with the successful payment
        // For now, we just log and return success.
        console.log('Payment Captured Successfully:', {
          orderId,
          userId,
          amount,
          pricePaid,
          packageId,
          type,
          referredBy,
        });

        res.status(200).json({ ok: true, message: 'Payment processed successfully' });
      } else {
        res.status(400).json({ error: 'payment_not_completed', paypalStatus: captureStatus });
      }

    } catch (err: any) {
      console.error('processPayPalOneTimePayment error:', err);
      res.status(500).json({ error: 'internal', message: err?.message || 'Unexpected error' });
    }
  });
