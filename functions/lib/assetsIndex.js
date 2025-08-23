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
// Gen1 Storage indexer — functions/src/assetsIndex.ts
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
if (!admin.apps.length)
    admin.initializeApp();
const db = (0, firestore_1.getFirestore)();
// Only index files under users/{uid}/assets/**
const USER_ASSET_RE = /^users\/([^/]+)\/assets\/(.+)$/;
exports.indexAssetOnFinalize = functions
    .region('us-central1')
    .storage.object()
    .onFinalize(async (obj) => {
    const path = obj.name || '';
    const match = path.match(USER_ASSET_RE);
    if (!match)
        return null;
    const uid = match[1];
    const fileName = match[2];
    const md = obj.metadata || {};
    const contentType = obj.contentType || '';
    const category = md.category || 'uncategorized';
    const mediaType = md.mediaType ||
        (contentType ? contentType.split('/')[0] : null) ||
        null;
    await db.collection('assetsIndex').add({
        uid,
        path, // e.g. users/{uid}/assets/covers/foo.png
        fileName, // e.g. covers/foo.png
        displayName: md.displayName || null,
        category, // covers|avatars|locations|characters|backgrounds|audioNarrations|audioEffects|others
        mediaType, // image|audio|video|null
        size: obj.size ? Number(obj.size) : null,
        contentType: contentType || null,
        source: md.source || 'upload',
        createdAt: obj.timeCreated
            ? firestore_1.Timestamp.fromDate(new Date(obj.timeCreated))
            : firestore_1.Timestamp.now(),
    });
    return null;
});
exports.removeIndexOnDelete = functions
    .region('us-central1')
    .storage.object()
    .onDelete(async (obj) => {
    const path = obj.name || '';
    const match = path.match(USER_ASSET_RE);
    if (!match)
        return null;
    const snap = await db
        .collection('assetsIndex')
        .where('path', '==', path)
        .get();
    if (snap.empty)
        return null;
    const batch = db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    return null;
});
//# sourceMappingURL=assetsIndex.js.map