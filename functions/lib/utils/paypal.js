"use strict";
// functions/src/utils/paypal.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayPalAccessToken = getPayPalAccessToken;
exports.verifyPayPalOrder = verifyPayPalOrder;
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET_KEY = process.env.PAYPAL_SECRET_KEY;
/**
 * Fetches an access token from the PayPal API.
 * @returns {Promise<string>} The PayPal access token.
 * @throws {Error} If PayPal API credentials are not configured or token acquisition fails.
 */
async function getPayPalAccessToken() {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
        throw new Error('PayPal API credentials not configured.');
    }
    const authString = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString('base64');
    try {
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
            console.error('Failed to get PayPal access token:', errorData); // Use console.error
            throw new Error('Failed to authenticate with PayPal.');
        }
        const { access_token } = await tokenResponse.json(); // Explicitly cast
        return access_token;
    }
    catch (error) {
        console.error('Error fetching PayPal access token:', error); // Use console.error
        throw error;
    }
}
/**
 * Verifies a PayPal order for a one-time purchase.
 * @param {string} orderId The PayPal order ID.
 * @returns {Promise<any>} The PayPal order details.
 * @throws {Error} If order verification fails.
 */
async function verifyPayPalOrder(orderId) {
    const accessToken = await getPayPalAccessToken();
    try {
        const orderDetailsResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (!orderDetailsResponse.ok) {
            const errorData = await orderDetailsResponse.json();
            console.error('Failed to get PayPal order details:', errorData); // Use console.error
            throw new Error('Failed to verify order with PayPal.');
        }
        const orderDetails = await orderDetailsResponse.json();
        return orderDetails;
    }
    catch (error) {
        console.error('Error verifying PayPal order:', error); // Use console.error
        throw error;
    }
}
//# sourceMappingURL=paypal.js.map