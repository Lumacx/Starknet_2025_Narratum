// Example Cloud Function (index.js for Firebase Functions)
// const functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp();

// exports.createNewUserDocument = functions.auth.user().onCreate(async (user) => {
//   const { uid, email, displayName, photoURL } = user;
//   const userRef = admin.firestore().collection('users').doc(uid);

//   return userRef.set({
//     uid: uid,
//     email: email || null, // Email might not always be present
//     displayName: displayName || 'New User',
//     photoURL: photoURL || null,
//     createdAt: admin.firestore.FieldValue.serverTimestamp(),
//     lastLoginAt: admin.firestore.FieldValue.serverTimestamp(), // Set on creation too
//     updatedAt: admin.firestore.FieldValue.serverTimestamp(),
//     role: 'user', // Default role
//     isSetupComplete: false, // Default for onboarding
//     // Add other default fields here
//   });
// });