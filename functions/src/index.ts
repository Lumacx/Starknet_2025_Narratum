// functions/src/index.ts
import { generateNarratumImage } from './imageGeneration';
import { createuserprofile } from './authTriggers';
import { incrementCommentCount } from './commentCounter';
import { indexAssetOnFinalize, removeIndexOnDelete } from './assetsIndex';

// 👇 importa y exporta la HTTP v2
import { smartGenerateImage } from './smartGenerateImage';

export {
  generateNarratumImage,
  createuserprofile,
  incrementCommentCount,
  indexAssetOnFinalize,
  removeIndexOnDelete,
  smartGenerateImage, // <-- NUEVA
};
