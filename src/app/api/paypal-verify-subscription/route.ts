// src/app/api/paypal-verify-subscription/route.ts
import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp, getAdminDb } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 60;

// Decide sandbox vs prod via env; default to sandbox unless explicitly "production"
function resolvePayPalBase(): string {
  const forced = process.env.PAYPAL_API_BASE?.trim();
  if (forced) return forced;
  const env = (process.env.PAYPAL_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  return env === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export async function POST(req: NextRequest) {
  try {
    const { subscriptionID, planName, billingCycle } = await req.json();

    if (!subscriptionID) {
      return NextResponse.json(
        { success: false, error: 'Subscription ID is missing.' },
        { status: 400 }
      );
    }

    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY;

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
      console.error('PayPal API credentials not configured.');
      return NextResponse.json(
        { success: false, error: 'PayPal API credentials not configured on the server.' },
        { status: 500 }
      );
    }

    // 🔐 Verify Firebase ID token (Authorization: Bearer <idToken>)
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const auth = getAuth(getAdminApp());
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (err) {
      console.error('Error verifying Firebase ID token:', err);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired authentication token.' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // 1) Get PayPal access token
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
      console.error('Failed to get PayPal access token:', tokenRes.status, errBody);
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with PayPal.' },
        { status: 500 }
      );
    }

    const { access_token } = await tokenRes.json();

    // 2) Fetch subscription details
    const detailsRes = await fetch(`${base}/v1/billing/subscriptions/${subscriptionID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      },
      cache: 'no-store',
    });

    if (!detailsRes.ok) {
      const errBody = await detailsRes.text().catch(() => '');
      console.error('Failed to get PayPal subscription details:', detailsRes.status, errBody);
      return NextResponse.json(
        { success: false, error: 'Failed to verify subscription with PayPal.' },
        { status: 500 }
      );
    }

    const subscriptionDetails = await detailsRes.json();
    const status: string = (subscriptionDetails?.status || '').toUpperCase();

    // 3) Mark active if PayPal says ACTIVE or APPROVED
    if (status === 'ACTIVE' || status === 'APPROVED') {
      const db = getAdminDb();
      await db.collection('users').doc(userId).set(
        {
          subscriptionStatus: 'active',
          paypalSubscriptionId: subscriptionID,
          planName: planName ?? null,
          billingCycle: billingCycle ?? null,
          paypalSubscriptionDetails: subscriptionDetails,
          subscriptionActivatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        message: 'Subscription successfully verified and activated.',
      });
    }

    console.warn('PayPal subscription not active for user', userId, ':', status);
    return NextResponse.json(
      { success: false, error: `Subscription is not active. Current status: ${status}` },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error during PayPal subscription verification:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during PayPal verification.' },
      { status: 500 }
    );
  }
}
