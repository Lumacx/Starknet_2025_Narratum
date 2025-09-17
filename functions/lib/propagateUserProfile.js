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
exports.propagateUserProfileToStories = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length)
    admin.initializeApp();
const db = admin.firestore();
exports.propagateUserProfileToStories = (0, firestore_1.onDocumentUpdated)('users/{uid}', async (event) => {
    const uid = event.params.uid;
    const after = event.data?.after?.data();
    if (!after)
        return;
    const name = after.displayName || after.displayname || after.name || after.username || 'Unknown Author';
    const photoURL = after.photoURL || after.photoUrl || after.avatarUrl || after.avatar || null;
    const pageSize = 400;
    let cursor;
    for (;;) {
        let q = db.collection('stories')
            .where('ownerUid', '==', uid)
            .orderBy(admin.firestore.FieldPath.documentId())
            .limit(pageSize);
        if (cursor)
            q = q.startAfter(cursor);
        const snap = await q.get();
        if (snap.empty)
            break;
        const batch = db.batch();
        for (const docSnap of snap.docs) {
            batch.set(docSnap.ref, {
                creator: { uid, name, photoURL },
                authorName: name,
                authorPhotoURL: photoURL,
                authorUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        await batch.commit();
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.size < pageSize)
            break;
    }
});
//# sourceMappingURL=propagateUserProfile.js.map