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
exports.createuserprofile = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
if (!admin.apps.length)
    admin.initializeApp();
const db = (0, firestore_1.getFirestore)();
exports.createuserprofile = functions
    .region('us-central1')
    .auth.user()
    .onCreate(async (user) => {
    const { uid, email, displayName } = user;
    const username = displayName || `user_${uid.slice(0, 8)}`;
    const userProfile = {
        id: uid,
        email: email || 'no-email@example.com',
        username,
        displayname: displayName || 'Anonymous User',
        role: 'reader',
        createdAt: new Date(),
        updatedAt: new Date()
    };
    try {
        await db.collection('users').doc(uid).set(userProfile);
        console.log(`Profile created for user: ${uid}`);
    }
    catch (e) {
        console.error(`createuserprofile failed for ${uid}:`, e);
    }
});
//# sourceMappingURL=authTriggers.js.map