import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebaseAdmin';
import { Buffer } from 'buffer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

// Utility to resolve PayPal API base URL (sandbox vs prod)
function resolvePayPalBase(): string {
  const forced = process.env.PAYPAL_API_BASE?.trim();
  if (forced) return forced;
  const env = (process.env.PAYPAL_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  return env === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function POST(req: NextRequest) {
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
  const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY;
  const PAYPAL_WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID; // This is crucial for webhook verification

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY || !PAYPAL_WEBHOOK_ID) {
    console.error('PayPal API credentials or Webhook ID not configured.');
    return NextResponse.json(
      { success: false, error: 'PayPal server credentials not configured.' },
      { status: 500 }
    );
  }

  try {
    const rawBody = await req.text(); // Read the raw body for signature verification
    const webhookEvent = JSON.parse(rawBody);

    // 1. Extract headers for verification
    const transmissionId = req.headers.get('paypal-transmission-id');
    const transmissionTime = req.headers.get('paypal-transmission-time');
    const certUrl = req.headers.get('paypal-cert-url');
    const transmissionSig = req.headers.get('paypal-transmission-sig');
    const authAlgo = req.headers.get('paypal-auth-algo');

    if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
      console.warn('Missing PayPal webhook verification headers.');
      return NextResponse.json(
        { success: false, error: 'Missing PayPal webhook verification headers.' },
        { status: 400 }
      );
    }

    // 2. Get PayPal access token to verify webhook signature
    const base = resolvePayPalBase();
    const authString = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString('base64');
    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${authString}`,
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text().catch(() => '');
      console.error('Failed to get PayPal access token for webhook verification:', tokenRes.status, errBody);
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with PayPal for webhook verification.' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenRes.json();

    // 3. Verify the webhook signature with PayPal
    const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: authAlgo,
        transmission_sig: transmissionSig,
        webhook_id: PAYPAL_WEBHOOK_ID,
        webhook_event: webhookEvent, // Send the parsed event object
      }),
      cache: 'no-store',
    });

    if (!verifyRes.ok) {
      const errBody = await verifyRes.text().catch(() => '');
      console.error('PayPal webhook signature verification failed:', verifyRes.status, errBody);
      return NextResponse.json(
        { success: false, error: 'PayPal webhook signature verification failed.' },
        { status: 403 }
      );
    }

    const verifyResult = await verifyRes.json();
    if (verifyResult.verification_status !== 'SUCCESS') {
      console.warn('PayPal webhook signature verification status:', verifyResult.verification_status);
      return NextResponse.json(
        { success: false, error: 'Invalid PayPal webhook signature.' },
        { status: 403 }
      );
    }

    // 4. Process the webhook event
    const db = getAdminDb();
    const eventType = webhookEvent.event_type;
    const resource = webhookEvent.resource; // Contains the actual subscription/payment details

    console.log(`Received PayPal webhook event: ${eventType}`);

    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
      case 'BILLING.SUBSCRIPTION.RENEWED': {
        const subscriptionId = resource.id;
        const payerId = resource.subscriber.payer_id; // PayPal Payer ID
        const userId = resource.custom_id; // Assuming you set custom_id in PayPal for user ID
        const status = resource.status;
        const planId = resource.plan_id;

        // You might need to map PayPal Payer ID to your internal user ID if custom_id is not used
        // For now, let's assume `custom_id` on the PayPal subscription resource holds our Firebase `userId`.
        // If not, you'll need another mechanism (e.g., storing payerId mapping)

        if (userId) {
          await db.collection('users').doc(userId).set(
            {
              subscriptionStatus: 'active',
              paypalSubscriptionId: subscriptionId,
              planName: planId, // Or a more user-friendly name if you map it
              billingCycle: resource.billing_info?.cycle_executions?.[0]?.tenure_type,
              paypalSubscriptionDetails: resource,
              subscriptionActivatedAt: new Date().toISOString(),
              lastWebhookUpdate: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log(`User ${userId} subscription activated/renewed via webhook.`);
        } else {
          console.warn(`Could not find user ID for subscription ${subscriptionId} from webhook.`);
        }
        break;
      }
      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED': {
        const subscriptionId = resource.id;
        const userId = resource.custom_id; // Assuming custom_id
        const status = resource.status;

        if (userId) {
          await db.collection('users').doc(userId).set(
            {
              subscriptionStatus: status.toLowerCase(), // 'cancelled' or 'suspended'
              paypalSubscriptionId: subscriptionId,
              subscriptionCancelledAt: new Date().toISOString(),
              lastWebhookUpdate: new Date().toISOString(),
            },
            { merge: true }
          );
          console.log(`User ${userId} subscription ${status.toLowerCase()} via webhook.`);
        } else {
          console.warn(`Could not find user ID for subscription ${subscriptionId} cancellation from webhook.`);
        }
        break;
      }
      // Add other event types as needed, e.g., PAYMENT.SALE.COMPLETED for one-time payments
      default:
        console.log(`Unhandled PayPal webhook event type: ${eventType}`);
        break;
    }

    return NextResponse.json({ success: true, message: 'Webhook event processed.' }, { status: 200 });
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error processing webhook.' },
      { status: 500 }
    );
  }
}
