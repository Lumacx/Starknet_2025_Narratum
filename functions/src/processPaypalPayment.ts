// functions/src/processPayPalPayment.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) admin.initializeApp();

// Allow only your site + local dev
const ALLOWED_ORIGINS = new Set([
  'https://storyreader.narratum.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

function setCors(req: functions.https.Request, res: functions.Response) {
  const origin = (req.headers.origin as string) || '';
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export const processPayPalPayment = functions
  .region('us-central1')
  .https.onRequest(async (req, res): Promise<void> => {
    setCors(req, res);

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
      // TODO: put your create/capture logic here if you still use this endpoint
      // const { action, payload } = req.body;
      // ... call PayPal, etc.

      res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('processPayPalPayment error:', err);
      res.status(500).json({ error: 'internal', message: err?.message || 'Unexpected error' });
    }
  });
