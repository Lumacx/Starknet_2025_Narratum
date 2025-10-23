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
exports.createPayPalOrder = void 0;
const functions = __importStar(require("firebase-functions"));
const paypal_1 = require("./utils/paypal");
// Keep these in one place (server is SoT). Consider moving to Firestore config.
const creditPackages = [
    { id: 'pkg_tester', credits: 25, value: 5.0 },
    { id: 'pkg_reader', credits: 75, value: 15.0 },
    { id: 'pkg_writer', credits: 125, value: 25.0 },
    { id: 'pkg_creator', credits: 250, value: 50.0 },
];
function buildIdempotencyKey(ctx, pkgId, clientKey) {
    // Prefer a client-provided key if present (e.g., UUID generated on the UI)
    if (clientKey && typeof clientKey === 'string') {
        return clientKey.slice(0, 64);
    }
    // Try useful request headers that exist on HTTPS calls in Cloud Functions
    const h = (ctx.rawRequest?.headers ?? {});
    const execId = (h['function-execution-id'] ||
        h['x-cloud-trace-context'] ||
        h['x-request-id'] ||
        h['x-forwarded-for'] ||
        '');
    const uid = ctx.auth?.uid ?? 'anon';
    const fallback = `${uid}:${pkgId}:${Date.now().toString(36)}`;
    const key = (execId ? `${uid}:${pkgId}:${execId}` : fallback);
    return key.slice(0, 64); // PayPal-Request-Id max length is 64
}
exports.createPayPalOrder = functions
    .region('us-central1')
    .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { packageId, idempotencyKey: clientKey } = data || {};
    if (!packageId || typeof packageId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Missing packageId.');
    }
    const selected = creditPackages.find(p => p.id === packageId);
    if (!selected) {
        throw new functions.https.HttpsError('not-found', 'Credit package not found.');
    }
    let accessToken;
    try {
        accessToken = await (0, paypal_1.getPayPalAccessToken)();
    }
    catch (err) {
        functions.logger.error('Failed to get PayPal access token:', err);
        throw new functions.https.HttpsError('internal', 'Failed to authenticate with PayPal.');
    }
    const base = (0, paypal_1.resolvePayPalBase)();
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
        const order = (await res.json());
        if (!order?.id) {
            throw new functions.https.HttpsError('internal', 'PayPal created order with no id.');
        }
        return { orderId: order.id };
    }
    catch (error) {
        if (error?.name === 'AbortError') {
            functions.logger.error('PayPal order creation timed out.');
            throw new functions.https.HttpsError('deadline-exceeded', 'PayPal order creation timed out.');
        }
        functions.logger.error('Error creating PayPal order:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while creating the order.');
    }
    finally {
        clearTimeout(timeout);
    }
});
//# sourceMappingURL=createPayPalOrder.js.map