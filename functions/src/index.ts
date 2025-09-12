// functions/src/index.ts
import { generateNarratumImage } from './imageGeneration';
import { createuserprofile } from './authTriggers';
import { incrementCommentCount } from './commentCounter';
import { indexAssetOnFinalize, removeIndexOnDelete } from './assetsIndex';

// HTTP v2 image generators
import { generateWithGemini, generateWithImagen } from './smartGenerateImage';

// 👇 NEW: PDF generator (HTTP HTTPS function)
import { downloadStoryPdf } from './downloadStoryPdf';

export {
  generateNarratumImage,
  createuserprofile,
  incrementCommentCount,
  indexAssetOnFinalize,
  removeIndexOnDelete,
  generateWithGemini,
  generateWithImagen,
  downloadStoryPdf, // 👈 added export
};
