"use strict";
// functions/src/assetsIndex.ts
// Gen2 Storage indexer — ONLY index under users/{uid}/assetIndex/(stories|uncategorized)/{category}/...
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
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./firebaseAdmin");
/**
 * Ruta válida:
 * users/{uid}/assetIndex/(stories/{storyId}|uncategorized)/{category}/{filename...}
 */
const NEW_PATH_RE = /^users\/([^/]+)\/assetIndex\/(?:(?:stories\/([^/]+))|uncategorized)\/([^/]+)\/(.+)$/;
// Lista blanca de categorías para evitar indexar carpetas inesperadas
const ALLOWED_CATEGORIES = new Set([
    'covers',
    'avatars',
    'characters',
    'locations',
    'backgrounds',
    'audioNarrations',
    'audioEffects',
    'videos',
    'generatedImages',
    'others',
]);
function inferMediaType(contentType) {
    if (!contentType)
        return 'other';
    if (contentType.startsWith('image/'))
        return 'image';
    if (contentType.startsWith('audio/'))
        return 'audio';
    if (contentType.startsWith('video/'))
        return 'video';
    return 'other';
}
exports.indexAssetOnFinalize = functions
    .region('us-central1')
    .storage.object()
    .onFinalize(async (obj) => {
    const path = obj.name || '';
    // Aceptamos SOLO la nueva convención
    const m = path.match(NEW_PATH_RE);
    if (!m) {
        console.log('[assetsIndex] skip (non-assetIndex path):', path);
        return null;
    }
    const uid = m[1];
    const storyId = m[2] || null; // null cuando es 'uncategorized'
    const category = m[3];
    const fileName = m[4];
    if (!ALLOWED_CATEGORIES.has(category)) {
        console.log('[assetsIndex] skip (unknown category):', category, 'path:', path);
        return null;
    }
    const md = obj.metadata || {};
    const contentType = obj.contentType || null;
    // Permite override por metadata si la envías, si no infiere del contentType
    const mediaType = md.mediaType ||
        inferMediaType(contentType);
    const size = obj.size ? Number(obj.size) : null;
    // Fuente opcional (upload | ai | migrate | etc.)
    const source = md['narratum:source'] ||
        md.source ||
        'upload';
    // createdAt consistente
    const createdAt = obj.timeCreated
        ? firebaseAdmin_1.Timestamp.fromDate(new Date(obj.timeCreated))
        : firebaseAdmin_1.Timestamp.now();
    // Campo storyId también puede venir como metadata y lo priorizamos si es coherente
    const mdStoryId = md['narratum:storyId']?.trim() || null;
    const finalStoryId = mdStoryId && storyId ? storyId : (storyId || mdStoryId || null);
    await firebaseAdmin_1.db.collection('assetsIndex').add({
        uid,
        storyId: finalStoryId, // null si uncategorized
        category, // p.ej. covers | characters | ...
        fileName, // nombre relativo dentro de la categoría
        path, // ruta completa en Storage
        mediaType, // image | audio | video | other
        contentType: contentType || null,
        size,
        source,
        displayName: md.displayName || null,
        createdAt,
    });
    console.log('[assetsIndex] indexed:', { uid, storyId: finalStoryId, category, fileName });
    return null;
});
exports.removeIndexOnDelete = functions
    .region('us-central1')
    .storage.object()
    .onDelete(async (obj) => {
    const path = obj.name || '';
    // Solo borramos índices de objetos que siguen la nueva convención
    const m = path.match(NEW_PATH_RE);
    if (!m) {
        console.log('[assetsIndex] delete skip (non-assetIndex path):', path);
        return null;
    }
    const snap = await firebaseAdmin_1.db
        .collection('assetsIndex')
        .where('path', '==', path)
        .get();
    if (snap.empty) {
        console.log('[assetsIndex] delete: no index docs for', path);
        return null;
    }
    const batch = firebaseAdmin_1.db.batch();
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log('[assetsIndex] delete: removed', snap.size, 'docs for', path);
    return null;
});
//# sourceMappingURL=assetsIndex.js.map