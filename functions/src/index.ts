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
import { processPayPalPayment, deductCreditsForRead, deductCreditsForCreation, sendTipToWriter, grantMonthlyFreeCredits } from './credits';
// 👇 NEW: Promo Code Functions
import { redeemPromoCode } from './promoCodes';

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
  // Promo Code Exports
  redeemPromoCode,
};

export { propagateUserProfileToStories } from './propagateUserProfile';
