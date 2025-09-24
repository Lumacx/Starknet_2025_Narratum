/* functions/scripts/migrateAssetIndex.ts
 *
 * One-off migration from legacy assetIndex paths to canonical "default" layer:
 *   FROM:
 *     users/{uid}/assetIndex/stories/{storyId}/{category}/{docId}
 *     users/{uid}/assetIndex/uncategorized/{category}/{docId}
 *   TO:
 *     users/{uid}/assetIndex/default/stories/{storyId}/{category}/{docId}
 *     users/{uid}/assetIndex/default/uncategorized/{category}/{docId}
 *
 * Usage (from repo root or /functions):
 *   # With GOOGLE_APPLICATION_CREDENTIALS set to a service account JSON:
 *   pnpm ts-node --transpile-only functions/scripts/migrateAssetIndex.ts --project functions/tsconfig.json
 *   # Dry run (no writes):
 *   pnpm ts-node --transpile-only functions/scripts/migrateAssetIndex.ts --project functions/tsconfig.json --dry
 *   # Limit to a single user:
 *   pnpm ts-node --transpile-only functions/scripts/migrateAssetIndex.ts --project functions/tsconfig.json --user <UID>
 */

import * as admin from 'firebase-admin';

type CliFlags = {
  dryRun: boolean;
  onlyUser?: string;
};

function parseFlags(): CliFlags {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry') || args.has('--dry-run');
  const userIdx = process.argv.findIndex(a => a === '--user' || a === '--uid');
  const onlyUser = userIdx >= 0 ? process.argv[userIdx + 1] : undefined;
  return { dryRun, onlyUser };
}

function getApp() {
  if (admin.apps.length) return admin.app();
  return admin.initializeApp(); // Uses GOOGLE_APPLICATION_CREDENTIALS or emulator creds
}

const LEGACY_CATEGORIES = [
  // image buckets
  'characters', 'locations', 'backgrounds', 'covers', 'avatars', 'generatedImages',
  // audio buckets
  'audioNarrations', 'audioEffects',
  // video bucket (YouTube or metadata docs)
  'videos',
  // any other custom flat index categories you may have used
];

async function migrateDoc(
  db: FirebaseFirestore.Firestore,
  srcRef: FirebaseFirestore.DocumentReference,
  destRef: FirebaseFirestore.DocumentReference,
  dryRun: boolean,
  results: { moved: number; skipped: number; bytes: number }
) {
  const snap = await srcRef.get();
  if (!snap.exists) return;

  const destSnap = await destRef.get();
  if (destSnap.exists) {
    results.skipped++;
    return; // idempotent: do not overwrite
  }

  const data = snap.data() || {};
  const toWrite = {
    ...data,
    // add minimal provenance; harmless for your rules
    _migratedFrom: srcRef.path,
    _migratedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!dryRun) {
    await destRef.set(toWrite, { merge: true });
  }

  results.moved++;
  // rough byte count (for diagnostics)
  results.bytes += Buffer.byteLength(JSON.stringify(toWrite), 'utf8');
}

async function migrateStoryCategory(
  db: FirebaseFirestore.Firestore,
  uid: string,
  storyId: string,
  category: string,
  dryRun: boolean,
  results: { moved: number; skipped: number; bytes: number }
) {
  const legacyCol = db.collection(`users/${uid}/assetIndex/stories/${storyId}/${category}`);
  const destBase = db.collection(`users/${uid}/assetIndex/default/stories/${storyId}/${category}`);

  // paginate to be safe
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q: FirebaseFirestore.Query = legacyCol.orderBy(admin.firestore.FieldPath.documentId()).limit(500);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const destRef = destBase.doc(doc.id);
      await migrateDoc(db, doc.ref, destRef, dryRun, results);
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  }
}

async function migrateUncategorizedCategory(
  db: FirebaseFirestore.Firestore,
  uid: string,
  category: string,
  dryRun: boolean,
  results: { moved: number; skipped: number; bytes: number }
) {
  const legacyCol = db.collection(`users/${uid}/assetIndex/uncategorized/${category}`);
  const destBase  = db.collection(`users/${uid}/assetIndex/default/uncategorized/${category}`);

  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q: FirebaseFirestore.Query = legacyCol.orderBy(admin.firestore.FieldPath.documentId()).limit(500);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      const destRef = destBase.doc(doc.id);
      await migrateDoc(db, doc.ref, destRef, dryRun, results);
    }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < 500) break;
  }
}

async function migrateUser(db: FirebaseFirestore.Firestore, uid: string, dryRun: boolean) {
  const results = { moved: 0, skipped: 0, bytes: 0 };

  // 1) story-scoped categories
  const storiesCol = db.collection('users').doc(uid).collection('stories');
  // We don’t rely on the user's stories subcollection; instead, we list legacy index stories:
  const legacyStoriesParent = db.collection(`users/${uid}/assetIndex/stories`);
  const storyIds = new Set<string>();

  // discover story IDs by listing subcollections under 'assetIndex/stories'
  const storyDocs = await legacyStoriesParent.listDocuments();
  for (const d of storyDocs) {
    // d.id is the storyId layer (because it's a "stories/{storyId}" collection parent)
    // listDocuments() returns doc refs; but in this case `legacyStoriesParent` is a collection,
    // so `d.id` are doc IDs at '.../stories/{docId}' — those aren't used.
    // We instead discover story IDs by listing *collections* under users/{uid}/assetIndex/stories
  }

  // Better: list collections under users/{uid}/assetIndex/stories
  const storiesRoot = db.doc(`users/${uid}/assetIndex`).collection('stories'); // legacy has 'stories' as a subcollection group
  // Firestore Admin SDK does not allow listCollections() on a COLLECTION, but on a DOCUMENT.
  // So we get a DocumentReference to 'users/{uid}/assetIndex' and then .listCollections():
  const assetIndexDoc = db.doc(`users/${uid}/assetIndex`);
  const subcols = await assetIndexDoc.listCollections();
  // Look for a collection named 'stories' (legacy path is actually nested: assetIndex/stories/{storyId}/{category}/...)
  const storiesColRef = subcols.find(c => c.id === 'stories');
  if (storiesColRef) {
    const storyIdCollections = await storiesColRef.listDocuments(); // these are the {storyId} docs in the legacy tree
    for (const storyDocRef of storyIdCollections) {
      storyIds.add(storyDocRef.id);
    }
  }

  // migrate each story/category
  for (const storyId of storyIds) {
    for (const category of LEGACY_CATEGORIES) {
      await migrateStoryCategory(db, uid, storyId, category, dryRun, results);
    }
  }

  // 2) uncategorized
  for (const category of LEGACY_CATEGORIES) {
    await migrateUncategorizedCategory(db, uid, category, dryRun, results);
  }

  return results;
}

async function main() {
  const flags = parseFlags();
  const app = getApp();
  const db = app.firestore();

  const started = Date.now();
  console.log(`\n▶ Starting assetIndex migration ${flags.dryRun ? '(DRY RUN)' : ''}`);

  const users: string[] = [];
  if (flags.onlyUser) {
    users.push(flags.onlyUser);
  } else {
    // enumerate all users (by documents in /users)
    const uSnap = await db.collection('users').select().get();
    uSnap.forEach(d => users.push(d.id));
  }

  let grandMoved = 0, grandSkipped = 0, grandBytes = 0;
  for (const uid of users) {
    console.log(`\n— Migrating user: ${uid}`);
    try {
      const res = await migrateUser(db, uid, flags.dryRun);
      grandMoved += res.moved;
      grandSkipped += res.skipped;
      grandBytes += res.bytes;
      console.log(`   ✓ moved=${res.moved}, skipped=${res.skipped}, ~bytes=${res.bytes}`);
    } catch (e: any) {
      console.error(`   ✗ failed user ${uid}:`, e?.message || e);
    }
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n✔ Done in ${secs}s. Total moved=${grandMoved}, skipped=${grandSkipped}, ~bytes=${grandBytes}`);
  if (flags.dryRun) console.log('DRY RUN complete (no writes were made).');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
