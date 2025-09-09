import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;

  if (!PAYPAL_CLIENT_ID) {
    return NextResponse.json({ error: 'PayPal Client ID not configured.' }, { status: 500 });
  }

  return NextResponse.json({ clientId: PAYPAL_CLIENT_ID });
}
