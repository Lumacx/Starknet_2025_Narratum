"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.propagateUserProfileToStories = void 0;
//functions/src/propagateUserProfile.ts
const firestore_1 = require("firebase-functions/v2/firestore");
const firebaseAdmin_1 = require("./firebaseAdmin");
const firestore_2 = require("firebase-admin/firestore"); // type/utility is fine to import
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
        let q = firebaseAdmin_1.db.collection('stories')
            .where('ownerUid', '==', uid)
            .orderBy(firestore_2.FieldPath.documentId())
            .limit(pageSize);
        if (cursor)
            q = q.startAfter(cursor);
        const snap = await q.get();
        if (snap.empty)
            break;
        const batch = firebaseAdmin_1.db.batch();
        for (const docSnap of snap.docs) {
            batch.set(docSnap.ref, {
                creator: { uid, name, photoURL },
                authorName: name,
                authorPhotoURL: photoURL,
                authorUpdatedAt: firebaseAdmin_1.FieldValue.serverTimestamp(),
            }, { merge: true });
        }
        await batch.commit();
        cursor = snap.docs[snap.docs.length - 1];
        if (snap.size < pageSize)
            break;
    }
});
//# sourceMappingURL=propagateUserProfile.js.map