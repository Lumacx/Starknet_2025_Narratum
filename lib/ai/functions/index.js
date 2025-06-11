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
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("firebase-functions/v2/auth");
const firestore_1 = require("firebase-admin/firestore");
// Initialize the Admin SDK only once
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = (0, firestore_1.getFirestore)();
/**
 * This function triggers whenever a new user is created in Firebase Authentication.
 * It automatically creates a corresponding user profile in the database.
 * This is the most reliable way to handle user profile creation, as it
 * avoids client-side race conditions.
 */
exports.createuserprofile = (0, auth_1.onUserCreate)(async (event) => {
    const user = event.data;
    const { uid, email, displayName } = user;
    // Ensure a unique username, especially if the displayName is not available.
    const username = displayName || `user_${uid.slice(0, 8)}`;
    const userProfile = {
        id: uid, // Explicitly set the document ID to match the user's UID
        email: email || "no-email@example.com",
        username: username,
        displayname: displayName || "Anonymous User",
        role: "reader", // Default role
        createdAt: new Date(),
        updatedAt: new Date(),
    };
    try {
        // Use the user's UID as the document ID in the 'users' collection.
        await db.collection("users").doc(uid).set(userProfile);
        console.log(`Successfully created profile for user: ${uid}`);
    }
    catch (error) {
        console.error(`Error creating profile for user: ${uid}`, error);
    }
});
//# sourceMappingURL=index.js.map