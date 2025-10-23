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
// This should be the single source of truth for packages,
// ideally fetched from Firestore configuration to avoid drift.
const creditPackages = [
    { id: 'pkg_tester', credits: 25, value: 5.0 },
    { id: 'pkg_reader', credits: 75, value: 15.0 },
    { id: 'pkg_writer', credits: 125, value: 25.0 },
    { id: 'pkg_creator', credits: 250, value: 50.0 },
];
exports.createPayPalOrder = functions
    .region('us-central1')
    .runWith({ secrets: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'] })
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { packageId } = data;
    if (!packageId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing packageId.');
    }
    const selectedPackage = creditPackages.find(p => p.id === packageId);
    if (!selectedPackage) {
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
                amount: {
                    currency_code: 'USD',
                    value: selectedPackage.value.toFixed(2),
                },
                description: `Narratum Credits: ${selectedPackage.credits}`,
                custom_id: packageId, // Pass packageId to be visible in PayPal order details
            }],
        application_context: {
            brand_name: 'Narratum',
            return_url: 'https://narratum.app/buy-credits?payment_success=true', // Optional: Redirect for UX
            cancel_url: 'https://narratum.app/buy-credits?payment_cancelled=true', // Optional
        }
    };
    try {
        const response = await fetch(`${base}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'PayPal-Request-Id': context.rawRequest.id, // for idempotency
            },
            body: JSON.stringify(orderPayload),
        });
        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            functions.logger.error('PayPal order creation failed:', response.status, errBody);
            throw new functions.https.HttpsError('internal', 'Failed to create PayPal order.');
        }
        const order = (await response.json());
        return { orderId: order.id };
    }
    catch (error) {
        functions.logger.error('Error creating PayPal order:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred while creating the order.');
    }
});
//# sourceMappingURL=createPayPalOrder.js.map