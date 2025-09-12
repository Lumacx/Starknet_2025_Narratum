"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadStoryPdf = exports.generateWithImagen = exports.generateWithGemini = exports.removeIndexOnDelete = exports.indexAssetOnFinalize = exports.incrementCommentCount = exports.createuserprofile = exports.generateNarratumImage = void 0;
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
//# sourceMappingURL=index.js.map