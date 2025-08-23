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
exports.removeIndexOnDelete = exports.indexAssetOnFinalize = void 0;
// functions/src/assetsIndex.ts
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
function encodeId(path) {
    // Firestore doc ids can't contain '/'; base64url is compact & safe
    return Buffer.from(path).toString('base64url');
}
function parsePath(name) {
    // Expected: users/{uid}/assets/{category}/{filename...}
    if (!name)
        return null;
    const parts = name.split('/');
    if (parts.length < 5)
        return null;
    if (parts[0] !== 'users' || parts[2] !== 'assets')
        return null;
    const uid = parts[1];
    const category = parts[3]; // covers|characters|locations|backgrounds|audio|video|other...
    const filename = parts.slice(4).join('/');
    return { uid, category, filename, fullPath: name };
}
function mediaTypeFrom(ct) {
    if (!ct)
        return 'other';
    if (ct.startsWith('image/'))
        return 'image';
    if (ct.startsWith('audio/'))
        return 'audio';
    if (ct.startsWith('video/'))
        return 'video';
    return 'other';
}
/** Index on upload */
exports.indexAssetOnFinalize = functions
    .region('us-central1')
    .storage.object()
    .onFinalize(async (object) => {
    const parsed = parsePath(object.name || undefined);
    if (!parsed)
        return null;
    const { uid, category, fullPath, filename } = parsed;
    const id = encodeId(fullPath);
    const displayName = object.metadata?.displayName ||
        object.metadata?.['displayName'] ||
        filename;
    await db
        .collection('users').doc(uid)
        .collection('assetsIndex').doc(id)
        .set({
        path: fullPath,
        displayName,
        category,
        mediaType: mediaTypeFrom(object.contentType || undefined),
        size: object.size ? Number(object.size) : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        // url is computed client-side with getDownloadURL()
    }, { merge: true });
    return null;
});
/** Remove index on delete */
exports.removeIndexOnDelete = functions
    .region('us-central1')
    .storage.object()
    .onDelete(async (object) => {
    const parsed = parsePath(object.name || undefined);
    if (!parsed)
        return null;
    const { uid, fullPath } = parsed;
    const id = encodeId(fullPath);
    await db
        .collection('users').doc(uid)
        .collection('assetsIndex').doc(id)
        .delete()
        .catch(() => null);
    return null;
});
//# sourceMappingURL=assetsIndex.js.map