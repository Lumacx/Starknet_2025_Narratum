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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNarratumImage = void 0;
// src/ai/functions/index.ts
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
    // Note: If your functions need to initialize other services, like the DataConnect client,
    // and that initialization relies on runtime config (functions.config()),
    // that specific initialization might need to be within each function or lazily loaded,
    // as config is not available at global scope during cold start in the same way.
    // The DataConnect client initialization we did in imageGeneration.ts is an example of this.
}
// Export your functions here
var imageGeneration_1 = require("./imageGeneration");
Object.defineProperty(exports, "generateNarratumImage", { enumerable: true, get: function () { return imageGeneration_1.generateNarratumImage; } });
// Add other functions here as you create them
// export { anotherFunction } from './anotherFunction';
//# sourceMappingURL=index.js.map