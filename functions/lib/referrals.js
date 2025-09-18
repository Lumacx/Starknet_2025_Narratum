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
exports.ensureReferralCodeOnUpdate = exports.ensureReferralCodeOnCreate = void 0;
// functions/src/referrals.ts
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
const USERS = 'users';
const MAX_SUFFIX_TRIES = 50;
/** Slugify displayName: lowercase, alphanumeric + dashes */
function slugifyName(name) {
    return (name || '')
        .trim()
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[^a-z0-9]+/g, '-') // non-alnum -> dash
        .replace(/^-+|-+$/g, '') // trim dashes
        .replace(/-{2,}/g, '-'); // collapse dashes
}
function monthYearFromDate(d) {
    const mm = String(d.getMonth() + 1).padStart(2, '0'); // 01..12
    const yyyy = String(d.getFullYear());
    return { mm, yyyy };
}
/** Check if a referralCode already exists on any user */
async function codeExists(code) {
    const snap = await db.collection(USERS)
        .where('referralCode', '==', code)
        .limit(1)
        .get();
    return !snap.empty;
}
/** Build a unique code with numeric suffixes if needed */
async function buildUniqueCode(base) {
    // First try base itself
    if (!(await codeExists(base)))
        return base;
    // Then try base-2, base-3, ... up to MAX_SUFFIX_TRIES
    for (let i = 2; i <= MAX_SUFFIX_TRIES + 1; i++) {
        const candidate = `${base}-${i}`;
        if (!(await codeExists(candidate)))
            return candidate;
    }
    // Last resort: add short random suffix
    const rand = Math.random().toString(36).slice(2, 6);
    return `${base}-${rand}`;
}
/** Stamp a referralCode if missing and displayName is present */
async function maybeStampReferralCode(uid, userData) {
    if (userData?.referralCode)
        return; // already has code
    const displayName = userData?.displayName || '';
    if (!displayName)
        return; // we only stamp once a displayName exists
    // Choose a creation date: Firestore createdAt, or now
    const createdAt = userData?.createdAt?.toDate?.() || new Date();
    const slug = slugifyName(displayName);
    if (!slug)
        return;
    const { mm, yyyy } = monthYearFromDate(createdAt);
    const base = `${slug}-${mm}${yyyy}`;
    const unique = await buildUniqueCode(base);
    await db.collection(USERS).doc(uid).set({ referralCode: unique }, { merge: true });
    console.log(`Stamped referralCode for ${uid}: ${unique}`);
}
/**
 * On user CREATE:
 *  - ensure createdAt exists (serverTimestamp)
 *  - stamp referralCode if displayName exists and no code yet
 */
exports.ensureReferralCodeOnCreate = functions.firestore
    .document('users/{uid}')
    .onCreate(async (snap, context) => {
    const uid = context.params.uid;
    const data = snap.data() || {};
    const updates = {};
    if (!data.createdAt) {
        updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
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
exports.ensureReferralCodeOnUpdate = functions.firestore
    .document('users/{uid}')
    .onUpdate(async (change, context) => {
    const uid = context.params.uid;
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    if (after.referralCode)
        return null; // already stamped
    const justGotName = !before.displayName && !!after.displayName;
    if (!justGotName)
        return null;
    await maybeStampReferralCode(uid, after);
    return null;
});
//# sourceMappingURL=referrals.js.map