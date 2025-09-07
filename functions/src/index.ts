// functions/src/index.ts
import { generateNarratumImage } from './imageGeneration';
import { createuserprofile } from './authTriggers';
import { incrementCommentCount } from './commentCounter';
import { indexAssetOnFinalize, removeIndexOnDelete } from './assetsIndex';

// 👇 importa y exporta la HTTP v2
import { generateWithGemini, generateWithImagen, listMyModels } from './smartGenerateImage';

export {
  generateNarratumImage,
  createuserprofile,
  incrementCommentCount,
  indexAssetOnFinalize,
  removeIndexOnDelete,
  generateWithGemini,
  generateWithImagen,
  listMyModels // <-- Add this export
};
