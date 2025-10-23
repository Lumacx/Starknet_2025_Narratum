import * as functions from 'firebase-functions';
import { getPayPalAccessToken, resolvePayPalBase } from './utils/paypal';

// Keep these in one place (server is SoT). Consider moving to Firestore config.
const creditPackages = [
  { id: 'pkg_tester',  credits: 25,  value: 5.0  },
  { id: 'pkg_reader',  credits: 75,  value: 15.0 },
  { id: 'pkg_writer',  credits: 125, value: 25.0 },
  { id: 'pkg_creator', credits: 250, value: 50.0 },
];

type CreateOrderPayload = {
  packageId: string;
  /** Optional client-supplied idempotency key to guarantee exactly-once semantics */
  idempotencyKey?: string;
};

function buildIdempotencyKey(
  ctx: functions.https.CallableContext,
  pkgId: string,
  clientKey?: string
): string {
  // Prefer a client-provided key if present (e.g., UUID generated on the UI)
  if (clientKey && typeof clientKey === 'string') {
    return clientKey.slice(0, 64);
  }

  // Try useful request headers that exist on HTTPS calls in Cloud Functions
  const h = (ctx.rawRequest?.headers ?? {}) as Record<string, string | string[] | undefined>;
  const execId = (h['function-execution-id'] ||
                  h['x-cloud-trace-context'] ||
                  h['x-request-id'] ||
                  h['x-forwarded-for'] ||
                  '') as string;

  const uid = ctx.auth?.uid ?? 'anon';
  const fallback = `${uid}:${pkgId}:${Date.now().toString(36)}`;
  const key = (execId ? `${uid}:${pkgId}:${execId}` : fallback);
  return key.slice(0, 64); // PayPal-Request-Id max length is 64
}

export const createPayPalOrder = functions
  .region('us-central1')
  .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
  .https.onCall(async (data: CreateOrderPayload, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const { packageId, idempotencyKey: clientKey } = data || ({} as CreateOrderPayload);
    if (!packageId || typeof packageId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'Missing packageId.');
    }

    const selected = creditPackages.find(p => p.id === packageId);
    if (!selected) {
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
        amount: { currency_code: 'USD', value: selected.value.toFixed(2) },
        description: `Narratum Credits: ${selected.credits}`,
        custom_id: packageId, // flows into capture response for server validation
      }],
      application_context: {
        brand_name: 'Narratum',
        // optional UX redirects (Smart Buttons don’t require these)
        return_url: 'https://narratum.app/buy-credits?payment_success=true',
        cancel_url: 'https://narratum.app/buy-credits?payment_cancelled=true',
        user_action: 'PAY_NOW',
      }
    };

    // Timeout + idempotency
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s
    const idemKey = buildIdempotencyKey(context, packageId, clientKey);

    try {
      const res = await fetch(`${base}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'PayPal-Request-Id': idemKey,
        },
        body: JSON.stringify(orderPayload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        functions.logger.error('PayPal order creation failed:', res.status, errBody);
        throw new functions.https.HttpsError('internal', 'Failed to create PayPal order.');
      }

      const order = (await res.json()) as { id?: string };
      if (!order?.id) {
        throw new functions.https.HttpsError('internal', 'PayPal created order with no id.');
      }
      return { orderId: order.id };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        functions.logger.error('PayPal order creation timed out.');
        throw new functions.https.HttpsError('deadline-exceeded', 'PayPal order creation timed out.');
      }
      functions.logger.error('Error creating PayPal order:', error);
      if (error instanceof functions.https.HttpsError) throw error;
      throw new functions.https.HttpsError('internal', 'An unexpected error occurred while creating the order.');
    } finally {
      clearTimeout(timeout);
    }
  });
