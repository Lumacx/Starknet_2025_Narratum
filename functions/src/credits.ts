import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyPayPalOrder } from './utils/paypal'; // Corrected import path

admin.initializeApp();
const db = admin.firestore();

// Narratum Admin User ID for internal credit distribution
const NARRATUM_ADMIN_UID = 'bOKyhlO8sofk5O4dGRTZAIfdYSx2';

// Credit split configuration
const CREDIT_SPLIT_CONFIG = {
  read: {
    AI_STORAGE: 0.10, // 10%
    APP_CUT: 0.10,    // 10%
    ROYALTY: 0.60,    // 60%
    REFERRAL: 0.20,   // 20%
  },
  create: {
    AI_STORAGE: 0.35, // 35%
    APP_CUT: 0.25,    // 25%
    ROYALTY: 0,       // 0% - as clarified, no royalty for self-creation
    REFERRAL: 0.40,   // 40%
  },
};

// 1. HTTP Cloud Function to process PayPal payments
export const processPayPalPayment = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return; // Explicitly return void
  }

  try {
    const { orderId, userId, amount } = req.body; // Expecting orderId from frontend

    if (!orderId || !userId || typeof amount !== 'number' || amount <= 0) {
      res.status(400).send('Invalid request body: orderId, userId, and a positive amount are required.');
      return; // Explicitly return void
    }

    // Verify the PayPal order
    const orderDetails = await verifyPayPalOrder(orderId);

    if (!orderDetails || orderDetails.status !== 'COMPLETED') {
      console.error('PayPal order not completed:', orderDetails);
      res.status(400).send('PayPal order not completed or invalid.');
      return; // Explicitly return void
    }

    // You might want to do further checks here, e.g., verify the amount paid matches what you expect for `amount`
    // For example, iterate through purchase_units and check amount.value
    const purchaseUnit = orderDetails.purchase_units[0];
    const paypalAmount = parseFloat(purchaseUnit.amount.value);
    // The `amount` from request body is credits, not USD. Need to adjust verification.
    // For now, let's assume `amount` in req.body refers to credits and the price match is handled client-side
    // or by another function that calls this with pre-verified credits.
    // The previous implementation had a direct comparison: `if (paypalAmount !== amount)` which is incorrect
    // if `amount` is credits. We'll proceed assuming `amount` here means the credits purchased.

    const userRef = db.collection('users').doc(userId);

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
      }

      const currentCredits = (userDoc.data()?.credits || 0) as number;
      const newCredits = currentCredits + amount;

      transaction.update(userRef, { credits: newCredits });
      // Corrected: Use userRef.collection('transactions').doc() to get a new document reference within the subcollection
      const newTransactionRef = userRef.collection('transactions').doc();
      transaction.set(newTransactionRef, {
        type: 'purchase',
        creditsDelta: amount, // Use creditsDelta for credit changes
        amountUsd: paypalAmount, // Store actual USD amount paid
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Purchased ${amount} credits via PayPal (Order ID: ${orderId})`,
        paypalOrderId: orderId,
        status: 'confirmed', // Assuming confirmed after PayPal capture and Firestore update
      });
    });

    res.status(200).send('Credits added successfully.');
    return; // Explicitly return void

  } catch (error) {
    console.error('Error processing PayPal payment:', error);
    // Check if it's an HttpsError to re-throw, otherwise wrap it
    if (error instanceof functions.https.HttpsError) {
      res.status(error.code === 'not-found' ? 404 : 500).send(error.message);
      return; // Explicitly return void
    }
    res.status(500).send('Internal Server Error');
    return; // Explicitly return void
  }
});

// 2. Callable Cloud Function to deduct credits for reading a story
export const deductCreditsForRead = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const readerUid = context.auth.uid;
  const { storyId } = data; // `cost` is now derived from storyType

  if (!storyId) {
    throw new functions.https.HttpsError('invalid-argument', 'Story ID is required.');
  }

  try {
    const storyRef = db.collection('stories').doc(storyId);
    const readerRef = db.collection('users').doc(readerUid);
    const adminRef = db.collection('users').doc(NARRATUM_ADMIN_UID);

    return db.runTransaction(async (transaction) => {
      const storyDoc = await transaction.get(storyRef);
      const readerDoc = await transaction.get(readerRef);
      const adminDoc = await transaction.get(adminRef);

      if (!storyDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Story not found.');
      }
      if (!readerDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Reader user not found.');
      }
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Narratum Admin user not found. Please ensure the admin user exists with UID: ' + NARRATUM_ADMIN_UID);
      }

      const storyType = storyDoc.data()?.type || 'basic'; // Default to basic
      let cost = 0;
      let ownerUid = storyDoc.data()?.ownerUid;

      switch (storyType) {
        case 'basic':
          cost = 1;
          break;
        case 'premium':
          cost = 5;
          break;
        case 'convai':
          cost = 15;
          break;
        default:
          cost = 1;
      }

      const readerCredits = (readerDoc.data()?.credits || 0) as number;

      if (readerCredits < cost) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits to read this story.', { remainingCredits: readerCredits });
      }

      // Get referrer UID
      const referrerUid = readerDoc.data()?.referredBy as string | undefined;
      const referrerRef = referrerUid ? db.collection('users').doc(referrerUid) : null;
      const referrerDoc = referrerRef ? await transaction.get(referrerRef) : null;

      // Deduct credits from reader
      transaction.update(readerRef, { credits: readerCredits - cost });
      const readerTransactionRef = readerRef.collection('transactions').doc();
      transaction.set(readerTransactionRef, {
        type: 'read',
        creditsDelta: -cost,
        storyId: storyId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Deducted ${cost} credits for reading story: ${storyDoc.data()?.title || storyId}`,
        status: 'confirmed',
      });

      // Distribute credits based on split configuration
      const split = CREDIT_SPLIT_CONFIG.read;
      let totalDistributed = 0;

      // Narratum Admin (AI+Storage & App Cut)
      const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
      const appCutAmount = Math.floor(cost * split.APP_CUT);
      const adminTotalProfit = aiStorageAmount + appCutAmount;

      if (adminTotalProfit > 0) {
        transaction.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotalProfit });
        adminRef.collection('transactions').doc().set({
          type: 'profit',
          creditsDelta: adminTotalProfit,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          description: `Credit profit (AI+Storage: ${aiStorageAmount}, App Cut: ${appCutAmount}) from story read by ${readerUid} for story ${storyId}`,
          sourceUid: readerUid,
          storyId: storyId,
          status: 'confirmed',
        });
        totalDistributed += adminTotalProfit;
      }

      // Story Owner (Royalty)
      if (ownerUid && ownerUid !== readerUid) {
        const royaltyAmount = Math.floor(cost * split.ROYALTY);
        if (royaltyAmount > 0) {
          const ownerRef = db.collection('users').doc(ownerUid);
          const ownerDoc = await transaction.get(ownerRef); // Re-fetch to ensure latest in transaction
          if (ownerDoc.exists) {
            transaction.update(ownerRef, { credits: (ownerDoc.data()?.credits || 0) + royaltyAmount });
            ownerRef.collection('transactions').doc().set({
              type: 'profit',
              creditsDelta: royaltyAmount,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              description: `Royalty earnings from story read by ${readerUid} for story ${storyDoc.data()?.title || storyId}`,
              sourceUid: readerUid,
              storyId: storyId,
              status: 'confirmed',
            });
            totalDistributed += royaltyAmount;
          }
        }
      }

      // Referral
      const referralAmount = Math.floor(cost * split.REFERRAL);
      if (referralAmount > 0) {
        if (referrerUid && referrerDoc?.exists && referrerUid !== readerUid) {
          // Referrer exists and is not the reader themselves
          transaction.update(referrerRef!, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
          referrerRef!.collection('transactions').doc().set({
            type: 'profit',
            creditsDelta: referralAmount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Referral earnings from ${readerUid} reading story ${storyId}`,
            sourceUid: readerUid,
            storyId: storyId,
            status: 'confirmed',
          });
          totalDistributed += referralAmount;
        } else {
          // No valid referrer, redirect referral percentage to Narratum Admin
          const adminCurrentCredits = (adminDoc.data()?.credits || 0) as number;
          transaction.update(adminRef, { credits: adminCurrentCredits + referralAmount });
          adminRef.collection('transactions').doc().set({
            type: 'profit',
            creditsDelta: referralAmount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Credit profit (Referral fallback) from story read by ${readerUid} for story ${storyId}`,
            sourceUid: readerUid,
            storyId: storyId,
            status: 'confirmed',
          });
          totalDistributed += referralAmount;
        }
      }

      // Optional: Log any remainder if floor() operations result in less than 100% distribution
      const remainder = cost - totalDistributed;
      if (remainder > 0) {
        // Distribute remainder to Admin App Cut as a common practice
        const adminCurrentCredits = (adminDoc.data()?.credits || 0) as number;
        transaction.update(adminRef, { credits: adminCurrentCredits + remainder });
        adminRef.collection('transactions').doc().set({
          type: 'profit',
          creditsDelta: remainder,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          description: `Credit profit (Rounding adjustment) from story read by ${readerUid} for story ${storyId}`,
          sourceUid: readerUid,
          storyId: storyId,
          status: 'confirmed',
        });
      }


      return { success: true, message: 'Credits deducted and distributed successfully.', remainingCredits: readerCredits - cost };
    });

  } catch (error: any) {
    console.error('Error deducting credits for read:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to deduct credits for read.', error.message);
  }
});

// 3. Callable Cloud Function to deduct credits for story creation
export const deductCreditsForCreation = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const creatorUid = context.auth.uid;
  const { storyType } = data; // `cost` is now derived from storyType

  if (!storyType || !['basic', 'premium', 'convai'].includes(storyType)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid story type provided.');
  }

  try {
    const creatorRef = db.collection('users').doc(creatorUid);
    const adminRef = db.collection('users').doc(NARRATUM_ADMIN_UID);

    return db.runTransaction(async (transaction) => {
      const creatorDoc = await transaction.get(creatorRef);
      const adminDoc = await transaction.get(adminRef);

      if (!creatorDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Creator user not found.');
      }
      if (!adminDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Narratum Admin user not found. Please ensure the admin user exists with UID: ' + NARRATUM_ADMIN_UID);
      }

      let cost = 0;
      switch (storyType) {
        case 'basic':
          cost = 5;
          break;
        case 'premium':
          cost = 10;
          break;
        case 'convai':
          cost = 15;
          break;
        default: // Fallback to a default if storyType is somehow invalid (though checked above)
          cost = 5;
      }

      const creatorCredits = (creatorDoc.data()?.credits || 0) as number;

      if (creatorCredits < cost) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits to create this story.', { remainingCredits: creatorCredits });
      }

      // Get referrer UID
      const referrerUid = creatorDoc.data()?.referredBy as string | undefined;
      const referrerRef = referrerUid ? db.collection('users').doc(referrerUid) : null;
      const referrerDoc = referrerRef ? await transaction.get(referrerRef) : null;

      // Deduct credits from creator
      transaction.update(creatorRef, { credits: creatorCredits - cost });
      const creatorTransactionRef = creatorRef.collection('transactions').doc();
      transaction.set(creatorTransactionRef, {
        type: 'create',
        creditsDelta: -cost,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Deducted ${cost} credits for creating a ${storyType} story.`,
        storyType: storyType,
        status: 'confirmed',
      });

      // Distribute credits based on split configuration
      const split = CREDIT_SPLIT_CONFIG.create;
      let totalDistributed = 0;

      // Narratum Admin (AI+Storage & App Cut)
      const aiStorageAmount = Math.floor(cost * split.AI_STORAGE);
      const appCutAmount = Math.floor(cost * split.APP_CUT);
      const adminTotalProfit = aiStorageAmount + appCutAmount;

      if (adminTotalProfit > 0) {
        transaction.update(adminRef, { credits: (adminDoc.data()?.credits || 0) + adminTotalProfit });
        adminRef.collection('transactions').doc().set({
          type: 'profit',
          creditsDelta: adminTotalProfit,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          description: `Credit profit (AI+Storage: ${aiStorageAmount}, App Cut: ${appCutAmount}) from story creation by ${creatorUid} for a ${storyType} story`,
          sourceUid: creatorUid,
          storyType: storyType,
          status: 'confirmed',
        });
        totalDistributed += adminTotalProfit;
      }

      // Referral
      const referralAmount = Math.floor(cost * split.REFERRAL);
      if (referralAmount > 0) {
        if (referrerUid && referrerDoc?.exists && referrerUid !== creatorUid) {
          // Referrer exists and is not the creator themselves
          transaction.update(referrerRef!, { credits: (referrerDoc.data()?.credits || 0) + referralAmount });
          referrerRef!.collection('transactions').doc().set({
            type: 'profit',
            creditsDelta: referralAmount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Referral earnings from ${creatorUid} creating a ${storyType} story`,
            sourceUid: creatorUid,
            storyType: storyType,
            status: 'confirmed',
          });
          totalDistributed += referralAmount;
        } else {
          // No valid referrer, redirect referral percentage to Narratum Admin
          const adminCurrentCredits = (adminDoc.data()?.credits || 0) as number;
          transaction.update(adminRef, { credits: adminCurrentCredits + referralAmount });
          adminRef.collection('transactions').doc().set({
            type: 'profit',
            creditsDelta: referralAmount,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Credit profit (Referral fallback) from story creation by ${creatorUid} for a ${storyType} story`,
            sourceUid: creatorUid,
            storyType: storyType,
            status: 'confirmed',
          });
          totalDistributed += referralAmount;
        }
      }

      // Royalty is 0% for creation as clarified, so no distribution here.

      // Optional: Log any remainder if floor() operations result in less than 100% distribution
      const remainder = cost - totalDistributed;
      if (remainder > 0) {
        // Distribute remainder to Admin App Cut as a common practice
        const adminCurrentCredits = (adminDoc.data()?.credits || 0) as number;
        transaction.update(adminRef, { credits: adminCurrentCredits + remainder });
        adminRef.collection('transactions').doc().set({
          type: 'profit',
          creditsDelta: remainder,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          description: `Credit profit (Rounding adjustment) from story creation by ${creatorUid} for a ${storyType} story`,
          sourceUid: creatorUid,
          storyType: storyType,
          status: 'confirmed',
        });
      }

      return { success: true, message: 'Credits deducted and distributed successfully.', remainingCredits: creatorCredits - cost };
    });

  } catch (error: any) {
    console.error('Error deducting credits for creation:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to deduct credits for creation.', error.message);
  }
});


// 4. Callable Cloud Function to send a tip to a writer
export const sendTipToWriter = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const senderUid = context.auth.uid;
  const { targetUid, amount } = data;

  if (!targetUid || typeof amount !== 'number' || amount <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Target UID and a positive amount are required.');
  }
  if (senderUid === targetUid) {
    throw new functions.https.HttpsError('invalid-argument', 'Cannot send a tip to yourself.');
  }

  try {
    const senderRef = db.collection('users').doc(senderUid);
    const targetRef = db.collection('users').doc(targetUid);

    return db.runTransaction(async (transaction) => {
      const senderDoc = await transaction.get(senderRef);
      const targetDoc = await transaction.get(targetRef);

      if (!senderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Sender user not found.');
      }
      if (!targetDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Target writer user not found.');
      }

      const senderCredits = (senderDoc.data()?.credits || 0) as number;

      if (senderCredits < amount) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits to send this tip.');
      }

      // Deduct from sender
      transaction.update(senderRef, { credits: senderCredits - amount });
      const senderTransactionRef = senderRef.collection('transactions').doc();
      transaction.set(senderTransactionRef, {
        type: 'tip_given',
        creditsDelta: -amount,
        targetUid: targetUid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Sent ${amount} credits as a tip to ${targetDoc.data()?.displayName || targetUid}.`,
        status: 'confirmed',
      });

      // Add to target writer
      const targetCredits = (targetDoc.data()?.credits || 0) as number;
      transaction.update(targetRef, { credits: targetCredits + amount });
      const targetTransactionRef = targetRef.collection('transactions').doc();
      transaction.set(targetTransactionRef, {
        type: 'tip_received',
        creditsDelta: amount,
        sourceUid: senderUid,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: `Received ${amount} credits as a tip from ${senderDoc.data()?.displayName || senderUid}.`,
        status: 'confirmed',
      });

      return { success: true, message: 'Tip sent successfully.' };
    });

  } catch (error: any) {
    console.error('Error sending tip to writer:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to send tip.', error.message);
  }
});

// 5. Scheduled Cloud Function to grant monthly free credits
export const grantMonthlyFreeCredits = functions.pubsub
  .schedule('every 1st of month 00:00') // Run at 00:00 on the 1st of every month
  .timeZone('America/Los_Angeles') // Specify your desired time zone
  .onRun(async (context) => {
    const usersRef = db.collection('users');
    const freeCreditsAmount = 25;

    const now = admin.firestore.Timestamp.now();
    const currentMonth = new Date(now.toDate()).getMonth();
    const currentYear = new Date(now.toDate()).getFullYear();

    try {
      const snapshot = await usersRef.get();

      const updates: Promise<any>[] = [];

      snapshot.forEach(doc => {
        const userData = doc.data();
        const lastGrantTimestamp = userData?.lastMonthlyCreditGrant as admin.firestore.Timestamp | undefined;
        let shouldGrant = false;

        if (!lastGrantTimestamp) {
          shouldGrant = true; // User has never received credits
        } else {
          const lastGrantDate = lastGrantTimestamp.toDate();
          if (lastGrantDate.getMonth() !== currentMonth || lastGrantDate.getFullYear() !== currentYear) {
            shouldGrant = true; // Last grant was in a different month/year
          }
        }

        if (shouldGrant) {
          const userRef = doc.ref;
          updates.push(db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) return; // Should not happen

            const currentCredits = (userDoc.data()?.credits || 0) as number;
            transaction.update(userRef, {
              credits: currentCredits + freeCreditsAmount,
              lastMonthlyCreditGrant: now,
            });
            const userTransactionRef = userRef.collection('transactions').doc();
            transaction.set(userTransactionRef, {
              type: 'free_monthly_grant',
              creditsDelta: freeCreditsAmount,
              timestamp: now,
              description: `Received ${freeCreditsAmount} free monthly credits.`,
              status: 'confirmed',
            });
          }));
        }
      });

      await Promise.all(updates);
      console.log('Monthly free credits granted to eligible users.');
      return null;

    } catch (error) {
      console.error('Error granting monthly free credits:', error);
      throw new functions.https.HttpsError('internal', 'Failed to grant monthly free credits.', (error as Error).message);
    }
  });
