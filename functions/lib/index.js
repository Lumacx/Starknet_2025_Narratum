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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.propagateUserProfileToStories = exports.initiateHostedCreditPurchase = exports.redeemPromoCode = exports.processPayPalSubscription = exports.grantMonthlyFreeCredits = exports.sendTipToWriter = exports.deductCreditsForCreation = exports.deductCreditsForRead = exports.processPayPalPayment = exports.downloadStoryPdf = exports.generateWithImagen = exports.generateWithGemini = exports.removeIndexOnDelete = exports.indexAssetOnFinalize = exports.incrementCommentCount = exports.createuserprofile = exports.generateNarratumImage = void 0;
// functions/src/index.ts
const imageGeneration_1 = require("./imageGeneration");
Object.defineProperty(exports, "generateNarratumImage", { enumerable: true, get: function () { return imageGeneration_1.generateNarratumImage; } });
const authTriggers_1 = require("./authTriggers");
Object.defineProperty(exports, "createuserprofile", { enumerable: true, get: function () { return authTriggers_1.createuserprofile; } });
const commentCounter_1 = require("./commentCounter");
Object.defineProperty(exports, "incrementCommentCount", { enumerable: true, get: function () { return commentCounter_1.incrementCommentCount; } });
const assetsIndex_1 = require("./assetsIndex");
Object.defineProperty(exports, "indexAssetOnFinalize", { enumerable: true, get: function () { return assetsIndex_1.indexAssetOnFinalize; } });
Object.defineProperty(exports, "removeIndexOnDelete", { enumerable: true, get: function () { return assetsIndex_1.removeIndexOnDelete; } });
// HTTP v2 image generators
const smartGenerateImage_1 = require("./smartGenerateImage");
Object.defineProperty(exports, "generateWithGemini", { enumerable: true, get: function () { return smartGenerateImage_1.generateWithGemini; } });
Object.defineProperty(exports, "generateWithImagen", { enumerable: true, get: function () { return smartGenerateImage_1.generateWithImagen; } });
// 👇 NEW: PDF generator (HTTP HTTPS function)
const downloadStoryPdf_1 = require("./downloadStoryPdf");
Object.defineProperty(exports, "downloadStoryPdf", { enumerable: true, get: function () { return downloadStoryPdf_1.downloadStoryPdf; } });
// 👇 NEW: Credit System Functions
const credits_1 = require("./credits");
Object.defineProperty(exports, "processPayPalPayment", { enumerable: true, get: function () { return credits_1.processPayPalPayment; } });
Object.defineProperty(exports, "deductCreditsForRead", { enumerable: true, get: function () { return credits_1.deductCreditsForRead; } });
Object.defineProperty(exports, "deductCreditsForCreation", { enumerable: true, get: function () { return credits_1.deductCreditsForCreation; } });
Object.defineProperty(exports, "sendTipToWriter", { enumerable: true, get: function () { return credits_1.sendTipToWriter; } });
Object.defineProperty(exports, "grantMonthlyFreeCredits", { enumerable: true, get: function () { return credits_1.grantMonthlyFreeCredits; } });
Object.defineProperty(exports, "processPayPalSubscription", { enumerable: true, get: function () { return credits_1.processPayPalSubscription; } });
// 👇 NEW: Promo Code Functions
const promoCodes_1 = require("./promoCodes");
Object.defineProperty(exports, "redeemPromoCode", { enumerable: true, get: function () { return promoCodes_1.redeemPromoCode; } });
// 👇 NEW: Hosted Payments Functions
const hostedPayments_1 = require("./hostedPayments");
Object.defineProperty(exports, "initiateHostedCreditPurchase", { enumerable: true, get: function () { return hostedPayments_1.initiateHostedCreditPurchase; } });
var propagateUserProfile_1 = require("./propagateUserProfile");
Object.defineProperty(exports, "propagateUserProfileToStories", { enumerable: true, get: function () { return propagateUserProfile_1.propagateUserProfileToStories; } });
// functions/src/index.ts
__exportStar(require("./credits"), exports);
// functions/src/index.ts
//export * from './processPayPalPayment';
__exportStar(require("./paypalWebhook"), exports);
__exportStar(require("./hostedPayments"), exports);
//# sourceMappingURL=index.js.map