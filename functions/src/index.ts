// functions/src/index.ts
import { generateNarratumImage } from './imageGeneration';
import { createuserprofile } from './authTriggers';
import { incrementCommentCount } from './commentCounter';
import { indexAssetOnFinalize, removeIndexOnDelete } from './assetsIndex';

// HTTP v2 image generators
import { generateWithGemini, generateWithImagen } from './smartGenerateImage';

// 👇 NEW: PDF generator (HTTP HTTPS function)
import { downloadStoryPdf } from './downloadStoryPdf';

// 👇 NEW: Credit System Functions
import { processPayPalPayment, deductCreditsForRead, deductCreditsForCreation, sendTipToWriter, grantMonthlyFreeCredits, processPayPalSubscription } from './credits';
// 👇 NEW: Promo Code Functions
import { redeemPromoCode } from './promoCodes';
// 👇 NEW: Hosted Payments Functions
import { initiateHostedCreditPurchase } from './hostedPayments';

export {
  generateNarratumImage,
  createuserprofile,
  incrementCommentCount,
  indexAssetOnFinalize,
  removeIndexOnDelete,
  generateWithGemini,
  generateWithImagen,
  downloadStoryPdf,
  // Credit System Exports
  processPayPalPayment,
  deductCreditsForRead,
  deductCreditsForCreation,
  sendTipToWriter,
  grantMonthlyFreeCredits,
  processPayPalSubscription,
  // Promo Code Exports
  redeemPromoCode,
  // Hosted Payments Exports
  initiateHostedCreditPurchase,
};

export { propagateUserProfileToStories } from './propagateUserProfile';

// functions/src/index.ts
export * from './credits';

// functions/src/index.ts
//export * from './processPayPalPayment';
export * from './paypalWebhook';
export * from './hostedPayments';
