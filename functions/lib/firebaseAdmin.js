"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.FieldValue = exports.bucket = exports.storage = exports.adminAuth = exports.db = void 0;
// functions/src/firebaseAdmin.ts
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const auth_1 = require("firebase-admin/auth");
const storage_1 = require("firebase-admin/storage");
/** ── Resolve runtime config (available in prod) ───────────────────────────── */
const runtimeConfig = (() => {
    try {
        return JSON.parse(process.env.FIREBASE_CONFIG ?? "{}");
    }
    catch {
        return {};
    }
})();
/** ── Project & bucket resolution (works in emulator + prod + app hosting) ─── */
const projectId = process.env.FIREBASE_PROJECT_ID ||
    runtimeConfig.projectId ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    "narratum"; // final fallback; adjust if your project id differs
// Allow override from env (recommended to set in apphosting.yaml)
const resolvedBucket = process.env.FIREBASE_STORAGE_BUCKET ||
    runtimeConfig.storageBucket ||
    `${projectId}.appspot.com`;
/** ── Prefer explicit SA creds via base64 when provided, else ADC ──────────── */
const pkB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64 || "";
const privateKey = pkB64 ? Buffer.from(pkB64, "base64").toString("utf8") : undefined;
const app = (0, app_1.getApps)().length
    ? (0, app_1.getApps)()[0]
    : (0, app_1.initializeApp)(privateKey
        ? {
            credential: (0, app_1.cert)({
                projectId: process.env.FIREBASE_PROJECT_ID ||
                    runtimeConfig.projectId ||
                    projectId,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey,
            }),
            storageBucket: resolvedBucket,
        }
        : {
            credential: (0, app_1.applicationDefault)(),
            storageBucket: resolvedBucket,
        });
/** ── Shared singletons ───────────────────────────────────────────────────── */
exports.db = (0, firestore_1.getFirestore)(app);
exports.adminAuth = (0, auth_1.getAuth)(app);
exports.storage = (0, storage_1.getStorage)(app);
/** Use this everywhere instead of calling getStorage().bucket() inline */
exports.bucket = exports.storage.bucket(resolvedBucket);
//# sourceMappingURL=firebaseAdmin.js.map