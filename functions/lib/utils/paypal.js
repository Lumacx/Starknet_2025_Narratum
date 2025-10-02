"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePayPalBase = resolvePayPalBase;
exports.getPayPalAccessToken = getPayPalAccessToken;
exports.verifyPayPalWebhookSignature = verifyPayPalWebhookSignature;
exports.getPayPalOrderDetails = getPayPalOrderDetails;
const functions = __importStar(require("firebase-functions"));
const buffer_1 = require("buffer");
// Utility to resolve PayPal API base URL (sandbox vs prod)
function resolvePayPalBase() {
    const forced = process.env.PAYPAL_API_BASE?.trim();
    if (forced)
        return forced;
    const env = (process.env.PAYPAL_ENV || process.env.NODE_ENV || 'development').toLowerCase();
    return env === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
}
let cachedAccessToken = null;
async function getPayPalAccessToken() {
    const PAYPAL_CLIENT_ID = functions.config().paypal.client_id;
    const PAYPAL_SECRET_KEY = functions.config().paypal.secret_key;
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET_KEY) {
        throw new functions.https.HttpsError('internal', 'PayPal API credentials not configured.');
    }
    // Check if we have a valid, unexpired token in cache
    if (cachedAccessToken && Date.now() < cachedAccessToken.expiry) {
        return cachedAccessToken.token;
    }
    const base = resolvePayPalBase();
    const authString = buffer_1.Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString('base64');
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
        throw new functions.https.HttpsError('internal', `Failed to get PayPal access token: ${tokenRes.status} - ${errBody}`);
    }
    const { access_token, expires_in } = (await tokenRes.json()); // Cast here
    // Cache the token with a 10-second buffer
    cachedAccessToken = {
        token: access_token,
        expiry: Date.now() + (expires_in * 1000) - 10000, // expires_in is in seconds
    };
    return access_token;
}
async function verifyPayPalWebhookSignature(headers, webhookEvent) {
    const PAYPAL_WEBHOOK_ID = functions.config().paypal.webhook_id;
    if (!PAYPAL_WEBHOOK_ID) {
        throw new functions.https.HttpsError('internal', 'PayPal Webhook ID not configured.');
    }
    const transmissionId = headers['paypal-transmission-id'];
    const transmissionTime = headers['paypal-transmission-time'];
    const certUrl = headers['paypal-cert-url'];
    const transmissionSig = headers['paypal-transmission-sig'];
    const authAlgo = headers['paypal-auth-algo'];
    if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing PayPal webhook verification headers.');
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
        functions.logger.error('PayPal webhook signature verification failed with PayPal API:', verifyRes.status, errBody);
        throw new functions.https.HttpsError('unauthenticated', 'PayPal webhook signature verification failed with PayPal API.');
    }
    const verifyResult = (await verifyRes.json()); // Cast here
    return verifyResult.verification_status === 'SUCCESS';
}
async function getPayPalOrderDetails(orderId) {
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
        throw new functions.https.HttpsError('internal', `Failed to fetch PayPal order details: ${orderRes.status} - ${errBody}`);
    }
    return (await orderRes.json());
}
//# sourceMappingURL=paypal.js.map