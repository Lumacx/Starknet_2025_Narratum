"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createuserprofile = exports.generateNarratumImage = exports.incrementCommentCount = void 0;
var commentCounter_1 = require("./commentCounter");
Object.defineProperty(exports, "incrementCommentCount", { enumerable: true, get: function () { return commentCounter_1.incrementCommentCount; } });
var imageGeneration_1 = require("./imageGeneration");
Object.defineProperty(exports, "generateNarratumImage", { enumerable: true, get: function () { return imageGeneration_1.generateNarratumImage; } });
var authTriggers_1 = require("./authTriggers"); // renombrado desde src/ai/functions/index.ts
Object.defineProperty(exports, "createuserprofile", { enumerable: true, get: function () { return authTriggers_1.createuserprofile; } });
//# sourceMappingURL=index.js.map