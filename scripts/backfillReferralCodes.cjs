// scripts/backfillReferralCodes.cjs
/**
 * One-off backfill: generate referralCode for users who have displayName but no referralCode yet.
 * Run:
 *   export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/secrets/service-account.json"
 *   pnpm run backfill:referrals
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function initAdmin() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (keyPath) {
    const abs = path.resolve(keyPath);
    if (!fs.existsSync(abs)) {
      console.error(`❌ GOOGLE_APPLICATION_CREDENTIALS points to a non-existent file:\n   ${abs}`);
      console.error('Fix the path or copy your service-account key into ./secrets and export the correct path.');
      process.exit(1);
    }
    const key = JSON.parse(fs.readFileSync(abs, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(key),
      projectId: key.project_id,
    });
    console.log(`✔ Using service account key: ${abs}`);
    console.log(`✔ Project: ${key.project_id}`);
  } else {
    // Fall back to ADC (gcloud auth application-default login)
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    const proj = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || '(from ADC)';
    console.log('✔ Using Application Default Credentials (ADC)');
    console.log(`✔ Project: ${proj}`);
  }
}

initAdmin();
const db = admin.firestore();

/* ---- helpers ---- */
function slugifyName(name) {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function monthYearFromDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return { mm, yyyy };
}

async function codeExists(code) {
  const snap = await db.collection('users').where('referralCode', '==', code).limit(1).get();
  return !snap.empty;
}

async function buildUniqueCode(base) {
  if (!(await codeExists(base))) return base;
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}-${i}`;
    if (!(await codeExists(candidate))) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

/* ---- main ---- */
async function backfill() {
  const snap = await db.collection('users').get();
  let updated = 0, skippedNoName = 0, skippedHasCode = 0;

  for (const doc of snap.docs) {
    const data = doc.data();

    if (data.referralCode) { skippedHasCode++; continue; }
    if (!data.displayName) { skippedNoName++; continue; }

    const slug = slugifyName(data.displayName);
    if (!slug) { skippedNoName++; continue; }

    const createdAt =
      (data.createdAt && data.createdAt.toDate && data.createdAt.toDate()) ||
      (doc.createTime && doc.createTime.toDate && doc.createTime.toDate()) ||
      new Date();

    const { mm, yyyy } = monthYearFromDate(createdAt);
    const base = `${slug}-${mm}${yyyy}`;
    const unique = await buildUniqueCode(base);

    await doc.ref.set({ referralCode: unique }, { merge: true });
    console.log(`Backfilled ${doc.id} -> ${unique}`);
    updated++;
  }

  console.log(`\n✅ Done.
  Updated: ${updated}
  Skipped (already had code): ${skippedHasCode}
  Skipped (no displayName): ${skippedNoName}`);
}

backfill().catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
