"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.FieldValue = exports.storage = exports.adminAuth = exports.db = void 0;
// functions/src/firebaseAdmin.ts
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
// Prefer explicit SA creds via base64 when provided, else fall back to ADC
const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || "";
const privateKey = pkB64 ? Buffer.from(pkB64, "base64").toString("utf8") : undefined;
const app = (0, app_1.getApps)().length
    ? (0, app_1.getApps)()[0]
    : (0, app_1.initializeApp)(privateKey
        ? {
            credential: (0, app_1.cert)({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
            }),
        }
        : { credential: (0, app_1.applicationDefault)() });
// Shared singletons
exports.db = (0, firestore_1.getFirestore)(app);
exports.adminAuth = (0, auth_1.getAuth)(app);
exports.storage = (0, storage_1.getStorage)(app);
//# sourceMappingURL=firebaseAdmin.js.map