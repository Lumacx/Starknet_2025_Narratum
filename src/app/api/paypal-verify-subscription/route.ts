import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();
const auth = getAuth();

export async function POST(req: NextRequest) {
  const { subscriptionID, planName, billingCycle } = await req.json();

  if (!subscriptionID) {
    return NextResponse.json({ success: false, error: 'Subscription ID is missing.' }, { status: 400 });
  }

  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
  const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY;
  const PAYPAL_API_BASE = 'https://api-m.sandbox.paypal.com'; // Use 'https://api-m.paypal.com' for production

  if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
    console.error('PayPal API credentials not configured.');
    return NextResponse.json({ success: false, error: 'PayPal API credentials not configured on the server.' }, { status: 500 });
  }

  // Verify Firebase ID Token first to authenticate the user
  const authorizationHeader = req.headers.get('Authorization');
  if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
    console.error('Authorization token not provided or malformed.');
    return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  }
  const idToken = authorizationHeader.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return NextResponse.json({ success: false, error: 'Invalid or expired authentication token.' }, { status: 401 });
  }

  const userId = decodedToken.uid;

  try {
    // 1. Get an access token from PayPal
    const authString = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString('base64');
    const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authString}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Failed to get PayPal access token:', errorData);
      return NextResponse.json({ success: false, error: 'Failed to authenticate with PayPal.' }, { status: 500 });
    }

    const { access_token } = await tokenResponse.json();

    // 2. Get subscription details from PayPal using the access token
    const subscriptionDetailsResponse = await fetch(`${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${access_token}`,
      },
    });

    if (!subscriptionDetailsResponse.ok) {
      const errorData = await subscriptionDetailsResponse.json();
      console.error('Failed to get PayPal subscription details:', errorData);
      return NextResponse.json({ success: false, error: 'Failed to verify subscription with PayPal.' }, { status: 500 });
    }

    const subscriptionDetails = await subscriptionDetailsResponse.json();
    console.log('PayPal Subscription Details for user', userId, ':', subscriptionDetails);

    // 3. Verify the subscription status and details
    if (subscriptionDetails.status === 'ACTIVE' || subscriptionDetails.status === 'APPROVED') {
      // Update user's subscription status in Firebase Firestore
      await db.collection('users').doc(userId).set({
        subscriptionStatus: 'active',
        paypalSubscriptionId: subscriptionID,
        planName: planName,
        billingCycle: billingCycle,
        paypalSubscriptionDetails: subscriptionDetails, // Store full details for reference
        subscriptionActivatedAt: new Date().toISOString(),
      }, { merge: true }); // Use merge to update without overwriting other user data

      return NextResponse.json({ success: true, message: 'Subscription successfully verified and activated.' });
    } else {
      console.warn('PayPal subscription not active for user', userId, ':', subscriptionDetails.status);
      return NextResponse.json({ success: false, error: `Subscription is not active. Current status: ${subscriptionDetails.status}` }, { status: 400 });
    }

  } catch (error) {
    console.error('Error during PayPal subscription verification for user', userId, ':', error);
    return NextResponse.json({ success: false, error: 'Internal server error during PayPal verification.' }, { status: 500 });
  }
}
