// functions/src/referrals.ts
import * as functions from 'firebase-functions';
import { db, FieldValue, Timestamp } from './firebaseAdmin';

const USERS = 'users';
const MAX_SUFFIX_TRIES = 50;

/** Slugify displayName: lowercase, alphanumeric + dashes */
function slugifyName(name: string): string {
  return (name || '')
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')  // strip accents
    .replace(/[^a-z0-9]+/g, '-')      // non-alnum -> dash
    .replace(/^-+|-+$/g, '')          // trim dashes
    .replace(/-{2,}/g, '-');          // collapse dashes
}

function monthYearFromDate(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0'); // 01..12
  const yyyy = String(d.getFullYear());
  return { mm, yyyy };
}

/** Check if a referralCode already exists on any user */
async function codeExists(code: string): Promise<boolean> {
  const snap = await db.collection(USERS)
    .where('referralCode', '==', code)
    .limit(1)
    .get();
  return !snap.empty;
}

/** Build a unique code with numeric suffixes if needed */
async function buildUniqueCode(base: string): Promise<string> {
  // First try base itself
  if (!(await codeExists(base))) return base;

  // Then try base-2, base-3, ... up to MAX_SUFFIX_TRIES
  for (let i = 2; i <= MAX_SUFFIX_TRIES + 1; i++) {
    const candidate = `${base}-${i}`;
    if (!(await codeExists(candidate))) return candidate;
  }

  // Last resort: add short random suffix
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

/** Stamp a referralCode if missing and displayName is present */
async function maybeStampReferralCode(uid: string, userData: any): Promise<void> {
  if (userData?.referralCode) return;          // already has code
  const displayName: string = userData?.displayName || '';
  if (!displayName) return;                     // we only stamp once a displayName exists

  // Choose a creation date: Firestore createdAt, or now
  const createdAt: Date =
    userData?.createdAt?.toDate?.() || new Date();

  const slug = slugifyName(displayName);
  if (!slug) return;

  const { mm, yyyy } = monthYearFromDate(createdAt);
  const base = `${slug}-${mm}${yyyy}`;
  const unique = await buildUniqueCode(base);

  await db.collection(USERS).doc(uid).set(
    { referralCode: unique },
    { merge: true }
  );
  console.log(`Stamped referralCode for ${uid}: ${unique}`);
}

/**
 * On user CREATE:
 *  - ensure createdAt exists (serverTimestamp)
 *  - stamp referralCode if displayName exists and no code yet
 */
export const ensureReferralCodeOnCreate = functions.firestore
  .document('users/{uid}')
  .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const data = snap.data() || {};
    const updates: Record<string, any> = {};

    if (!data.createdAt) {
      updates.createdAt = FieldValue.serverTimestamp();
    }
    if (Object.keys(updates).length) {
      await snap.ref.set(updates, { merge: true });
    }

    await maybeStampReferralCode(uid, data);
    return null;
  });

/**
 * On user UPDATE:
 *  - if the user just gained a displayName and still has no referralCode, stamp it.
 *    (This covers onboarding flows where displayName comes later.)
 */
export const ensureReferralCodeOnUpdate = functions.firestore
  .document('users/{uid}')
  .onUpdate(async (change, context) => {
    const uid = context.params.uid;
    const before = change.before.data() || {};
    const after = change.after.data() || {};

    if (after.referralCode) return null;                 // already stamped
    const justGotName = !before.displayName && !!after.displayName;
    if (!justGotName) return null;

    await maybeStampReferralCode(uid, after);
    return null;
  });
