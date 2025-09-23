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
exports.incrementCommentCount = void 0;
// functions/src/commentCounter.ts
const functions = __importStar(require("firebase-functions"));
const firebaseAdmin_1 = require("./firebaseAdmin");
/**
 * On new comment, increment commentsCount on /stories/{storyId}.
 * If your parent collection is different, change 'stories' below.
 */
exports.incrementCommentCount = functions
    .region('us-central1')
    .firestore
    .document('comments/{commentId}')
    .onCreate(async (snap) => {
    const data = snap.data();
    const storyId = data?.storyId;
    if (!storyId) {
        console.log('Comment without storyId → skip');
        return null;
    }
    try {
        await firebaseAdmin_1.db.collection('stories').doc(storyId).set({
            commentsCount: firebaseAdmin_1.FieldValue.increment(1),
            updatedAt: firebaseAdmin_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return null;
    }
    catch (e) {
        console.error('incrementCommentCount:', e);
        return null;
    }
});
//# sourceMappingURL=commentCounter.js.map