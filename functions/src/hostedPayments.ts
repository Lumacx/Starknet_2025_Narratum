import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface CreditPackage {
  id: string;
  tier: 'Tester' | 'Reader' | 'Writer' | 'Creator';
  credits: number;
  value: number; // USD
  paypalHostedButtonId: string;
  popular?: boolean;
}

const creditPackages: CreditPackage[] = [
  { id: 'pkg_tester',  tier: 'Tester',  credits: 25,  value: 5.0,  paypalHostedButtonId: 'V2D9DHV8DQVCE' },
  { id: 'pkg_reader',  tier: 'Reader',  credits: 75,  value: 15.0, paypalHostedButtonId: 'CQ33GPF5623DU' },
  { id: 'pkg_writer',  tier: 'Writer',  credits: 125, value: 25.0, paypalHostedButtonId: '3YUKSD6AU4JH4', popular: true },
  { id: 'pkg_creator', tier: 'Creator', credits: 250, value: 50.0, paypalHostedButtonId: 'FRNPD2T8EBFVW' },
];

/**
 * Initiates a one-time credit purchase using PayPal Hosted Buttons.
 * This callable function creates a pending record in Firestore to link the purchase to a user.
 * The actual credit granting will happen via a PayPal webhook upon payment completion.
 */
// …unchanged imports…

export const initiateHostedCreditPurchase = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to initiate a purchase.');
  }

  const userId = context.auth.uid;
  const { creditPackageId } = data; // <— keep this name

  if (!creditPackageId) throw new functions.https.HttpsError('invalid-argument', 'Missing creditPackageId.');

  const selectedPackage = creditPackages.find(pkg => pkg.id === creditPackageId);
  if (!selectedPackage) throw new functions.https.HttpsError('not-found', 'Credit package not found.');

  const pendingRef = await db.collection('pendingHostedCreditPurchases').add({
    userId,
    creditPackageId: selectedPackage.id,
    paypalHostedButtonId: selectedPackage.paypalHostedButtonId,
    expectedCredits: selectedPackage.credits,
    expectedValue: selectedPackage.value,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info(`Pending hosted credit purchase for user ${userId}, package ${creditPackageId}. Pending ID: ${pendingRef.id}`);

  return { success: true, pendingPurchaseId: pendingRef.id };
});
