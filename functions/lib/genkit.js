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
exports.ai = void 0;
// functions/src/genkit.ts
const functions = __importStar(require("firebase-functions"));
const generative_ai_1 = require("@google/generative-ai");
let _model = null;
function getApiKey() {
    // 1) firebase functions:config:set genai.apikey="XYZ"
    const cfgKey = functions.config()?.genai?.apikey;
    // 2) variables de entorno comunes
    const envKey = process.env.GOOGLE_GENAI_API_KEY ||
        process.env.GEMINI_API_KEY ||
        process.env.GENAI_API_KEY;
    const key = cfgKey || envKey;
    if (!key) {
        throw new Error("Missing Google Generative AI API key. Set functions config `genai.apikey` or env `GOOGLE_GENAI_API_KEY`.");
    }
    return key;
}
function getModelName() {
    // Modelo por defecto orientado a imagen. Ajusta si usas otro.
    return process.env.GENAI_IMAGE_MODEL || "imagen-3.0-generate-002";
}
function mapToGeminiParts(parts) {
    return parts
        .map((p) => {
        if (p.text)
            return { text: p.text };
        if (p.data) {
            return {
                inlineData: {
                    mimeType: p.data.mimeType,
                    data: p.data.data, // base64
                },
            };
        }
        return null;
    })
        .filter(Boolean);
}
function mapBackToMessageParts(geminiParts) {
    // Adaptamos la respuesta del SDK a { message: { parts: [...] } } con .data/.text
    return geminiParts.map((gp) => {
        if (gp?.inlineData) {
            return {
                data: {
                    mimeType: gp.inlineData.mimeType,
                    data: gp.inlineData.data, // base64
                },
            };
        }
        if (gp?.text)
            return { text: gp.text };
        // Otros tipos no los usamos
        return gp;
    });
}
function getModel() {
    if (_model)
        return _model;
    const genAI = new generative_ai_1.GoogleGenerativeAI(getApiKey());
    _model = genAI.getGenerativeModel({ model: getModelName() });
    return _model;
}
/**
 * Interfaz compatible con tu código:
 * const response = await ai.generate({ prompt: Part[] })
 * y luego usas: response.output?.candidates?.[0]?.message?.parts
 */
exports.ai = {
    async generate({ prompt }) {
        const model = getModel();
        const userParts = mapToGeminiParts(prompt);
        const result = await model.generateContent({
            contents: [{ role: "user", parts: userParts }],
        });
        // Estructura "similar a Genkit" para que tu imageGeneration.ts no cambie
        const geminiCandidates = result.response?.candidates ?? [];
        const firstParts = geminiCandidates[0]?.content?.parts ?? [];
        const output = {
            candidates: [
                {
                    message: {
                        parts: mapBackToMessageParts(firstParts),
                    },
                },
            ],
        };
        return { output };
    },
};
//# sourceMappingURL=genkit.js.map