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
exports.processPayPalOneTimePayment = void 0;
// functions/src/processPayPalOneTimePayment.ts
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
if (admin.apps.length === 0)
    admin.initializeApp();
// Allow only your site + local dev
const ALLOWED_ORIGINS = new Set([
    'https://storyreader.narratum.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]);
function setCorsHeaders(req, res) {
    const origin = req.headers.origin || '';
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
// Mock PayPal API (replace with actual PayPal SDK integration)
const mockPaypal = {
    orders: {
        create: async (body) => {
            // Simulate PayPal API call
            console.log('Mock PayPal Create Order:', body);
            return {
                result: {
                    id: 'mock_order_id_123',
                    status: 'CREATED',
                    links: [{ href: 'mock_approval_link', rel: 'approve' }],
                },
            };
        },
        capture: async (orderId) => {
            // Simulate PayPal API call
            console.log('Mock PayPal Capture Order:', orderId);
            return {
                result: {
                    id: orderId,
                    status: 'COMPLETED',
                    purchase_units: [{ payments: { captures: [{ id: 'mock_capture_id' }] } }],
                },
            };
        },
    },
};
exports.processPayPalOneTimePayment = functions
    .region('us-central1')
    .https.onRequest(async (req, res) => {
    setCorsHeaders(req, res); // Set CORS headers for all responses
    // Preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'method_not_allowed' });
        return;
    }
    try {
        const { orderId, userId, amount, pricePaid, packageId, type, referredBy } = req.body;
        // Simulate capturing the order (replace with actual PayPal API call)
        const captureResponse = await mockPaypal.orders.capture(orderId);
        const captureStatus = captureResponse.result.status;
        if (captureStatus === 'COMPLETED') {
            // Here you would typically update your database with the successful payment
            // For now, we just log and return success.
            console.log('Payment Captured Successfully:', {
                orderId,
                userId,
                amount,
                pricePaid,
                packageId,
                type,
                referredBy,
            });
            res.status(200).json({ ok: true, message: 'Payment processed successfully' });
        }
        else {
            res.status(400).json({ error: 'payment_not_completed', paypalStatus: captureStatus });
        }
    }
    catch (err) {
        console.error('processPayPalOneTimePayment error:', err);
        res.status(500).json({ error: 'internal', message: err?.message || 'Unexpected error' });
    }
});
//# sourceMappingURL=processPayPalOneTimePayment.js.map