import * as functions from 'firebase-functions';
import { Buffer } from 'buffer';

// Interface for PayPal Access Token Response
export interface PayPalAccessTokenResponse {
  scope: string;
  access_token: string;
  token_type: string;
  app_id: string;
  expires_in: number; // seconds
  nonce: string;
}

// Interface for PayPal Webhook Verification Response
export interface PayPalWebhookVerificationResponse {
  transmission_id: string;
  transmission_time: string;
  cert_url: string;
  auth_algo: string;
  transmission_sig: string;
  webhook_id: string;
  webhook_event: any; // The original webhook event object
  verification_status: 'SUCCESS' | 'FAILURE' | 'PENDING';
}

// Interface for PayPal Order Capture Response (simplified for relevant fields)
export interface PayPalOrderCaptureResponse {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  // Add more fields if needed, e.g., purchase_units, links
  purchase_units?: Array<{
    amount?: {
      currency_code: string;
      value: string;
    };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: {
          currency_code: string;
          value: string;
        };
        final_capture?: boolean;
        seller_protection?: {
          status: string;
          dispute_categories: string[];
        };
        create_time: string;
        update_time: string;
      }>;
    };
  }>;
}

// Interface for PayPal Subscription Details Response (simplified for relevant fields)
export interface PayPalSubscriptionDetailsResponse {
  id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  plan_id: string;
  start_time: string;
  quantity: string;
  subscriber?: {
    payer_id: string;
    email_address: string;
    name?: {
      given_name: string;
      surname: string;
    };
  };
  billing_info?: {
    cycle_executions?: Array<{
      tenure_type: string;
      sequence: number;
      cycles_completed: number;
      total_cycles: number;
      is_current_cycle: boolean;
      current_pricing_scheme?: {
        fixed_price?: {
          value: string;
          currency_code: string;
        };
      };
    }>;
    frequency?: {
      interval_unit: string;
      interval_count: number;
    };
  };
  custom_id?: string;
  status_update_time: string;
}

// ---- Base URL (LIVE ONLY) ----
export function resolvePayPalBase(): string {
  // Keep an escape hatch for explicit override; delete this line if you want to hard-lock live.
  //if (process.env.PAYPAL_API_BASE?.trim()) return process.env.PAYPAL_API_BASE.trim()!;
  return 'https://api-m.paypal.com';
}

// ────────────────────────────────────────────────────────────
// Access Token (cached)
// ────────────────────────────────────────────────────────────
let cachedAccessToken: { token: string; expiry: number } | null = null;

export async function getPayPalAccessToken(): Promise<string> {
  const PAYPAL_CLIENT_ID =
    process.env.PAYPAL_CLIENT_ID || functions.config().paypal?.client_id;
  const PAYPAL_SECRET_KEY =
    process.env.PAYPAL_CLIENT_SECRET ||
    process.env.PAYPAL_SECRET_KEY || // fallback naming support
    functions.config().paypal?.secret ||
    functions.config().paypal?.secret_key;

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
    throw new functions.https.HttpsError(
      'internal',
      'PayPal API credentials not configured.'
    );
  }

  // Use cached token if still valid
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiry) {
    return cachedAccessToken.token;
  }

  const base = resolvePayPalBase();
  const authString = Buffer.from(
    `${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`
  ).toString('base64');

  const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${authString}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => '');
    functions.logger.error(
      `Failed to get PayPal access token: ${tokenRes.status} - ${errBody}`
    );
    throw new functions.https.HttpsError(
      'internal',
      `Failed to get PayPal access token: ${tokenRes.status} - ${errBody}`
    );
  }

  const { access_token, expires_in } =
    (await tokenRes.json()) as PayPalAccessTokenResponse;

  // Cache token
  cachedAccessToken = {
    token: access_token,
    expiry: Date.now() + expires_in * 1000 - 10_000,
  };

  return access_token;
}

// ────────────────────────────────────────────────────────────
// Webhook Verification (unchanged except accessToken source)
// ────────────────────────────────────────────────────────────
export async function verifyPayPalWebhookSignature(
  headers: { [key: string]: string | undefined },
  webhookEvent: any
): Promise<boolean> {
  const PAYPAL_WEBHOOK_ID =
    process.env.PAYPAL_WEBHOOK_ID || functions.config().paypal?.webhook_id;

  if (!PAYPAL_WEBHOOK_ID) {
    throw new functions.https.HttpsError(
      'internal',
      'PayPal Webhook ID not configured.'
    );
  }

  const transmissionId = headers['paypal-transmission-id'];
  const transmissionTime = headers['paypal-transmission-time'];
  const certUrl = headers['paypal-cert-url'];
  const transmissionSig = headers['paypal-transmission-sig'];
  const authAlgo = headers['paypal-auth-algo'];

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing PayPal webhook verification headers.'
    );
  }

  const accessToken = await getPayPalAccessToken();
  const base = resolvePayPalBase();

  const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: PAYPAL_WEBHOOK_ID,
      webhook_event: webhookEvent,
    }),
  });

  if (!verifyRes.ok) {
    const errBody = await verifyRes.text().catch(() => '');
    functions.logger.error(
      'PayPal webhook signature verification failed with PayPal API:',
      verifyRes.status,
      errBody
    );
    throw new functions.https.HttpsError(
      'unauthenticated',
      'PayPal webhook signature verification failed with PayPal API.'
    );
  }

  const verifyResult = (await verifyRes.json()) as PayPalWebhookVerificationResponse;
  return verifyResult.verification_status === 'SUCCESS';
}

export async function getPayPalOrderDetails(orderId: string): Promise<PayPalOrderCaptureResponse | null> {
  const accessToken = await getPayPalAccessToken();
  const base = resolvePayPalBase();

  const orderRes = await fetch(`${base}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (orderRes.status === 404) {
    functions.logger.warn(`PayPal order ${orderId} not found.`);
    return null;
  }

  if (!orderRes.ok) {
    const errBody = await orderRes.text().catch(() => '');
    functions.logger.error(`Failed to fetch PayPal order ${orderId}: ${orderRes.status} - ${errBody}`);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to fetch PayPal order details: ${orderRes.status} - ${errBody}`
    );
  }

  return (await orderRes.json()) as PayPalOrderCaptureResponse;
}

/** Fetch PayPal subscription details */
export async function getPayPalSubscriptionDetails(
  subscriptionId: string
): Promise<PayPalSubscriptionDetailsResponse | null> {
  if (!subscriptionId) return null;
  const accessToken = await getPayPalAccessToken();
  const base = resolvePayPalBase();

  const res = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 404) {
    functions.logger.warn(`PayPal subscription ${subscriptionId} not found.`);
    return null;
  }
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new functions.https.HttpsError(
      'internal',
      `Failed to fetch PayPal subscription: ${res.status} - ${err}`
    );
  }
  return (await res.json()) as PayPalSubscriptionDetailsResponse;
}

/** Cancel a PayPal subscription (POST /v1/billing/subscriptions/{id}/cancel) */
export async function cancelPayPalSubscriptionApi(
  subscriptionId: string,
  reason = 'User requested cancellation'
): Promise<void> {
  if (!subscriptionId) {
    throw new functions.https.HttpsError('invalid-argument', 'subscriptionId is required.');
  }
  const accessToken = await getPayPalAccessToken();
  const base = resolvePayPalBase();

  const res = await fetch(`${base}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ reason }),
  });

  if (res.status === 204) return; // success, no body
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new functions.https.HttpsError(
      'internal',
      `PayPal cancel API failed: ${res.status} - ${err}`
    );
  }
}
