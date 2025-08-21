// functions/src/genkit.ts
import * as functions from "firebase-functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Mantenemos el mismo "tipo" de Part que esperas en imageGeneration.ts
 * - text: prompt de texto
 * - data: inline image (sketch) como base64
 */
export type Part = {
  text?: string;
  data?: { mimeType: string; data: string };
};

let _model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]> | null = null;

function getApiKey(): string {
  // 1) firebase functions:config:set genai.apikey="XYZ"
  const cfgKey = functions.config()?.genai?.apikey as string | undefined;
  // 2) variables de entorno comunes
  const envKey =
    process.env.GOOGLE_GENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GENAI_API_KEY;

  const key = cfgKey || envKey;
  if (!key) {
    throw new Error(
      "Missing Google Generative AI API key. Set functions config `genai.apikey` or env `GOOGLE_GENAI_API_KEY`."
    );
  }
  return key;
}

function getModelName(): string {
  // Modelo por defecto orientado a imagen. Ajusta si usas otro.
  return process.env.GENAI_IMAGE_MODEL || "imagen-3.0-generate-002";
}

function mapToGeminiParts(parts: Part[]) {
  return parts
    .map((p) => {
      if (p.text) return { text: p.text };
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
    .filter(Boolean) as any[];
}

function mapBackToMessageParts(geminiParts: any[]) {
  // Adaptamos la respuesta del SDK a { message: { parts: [...] } } con .data/.text
  return geminiParts.map((gp: any) => {
    if (gp?.inlineData) {
      return {
        data: {
          mimeType: gp.inlineData.mimeType,
          data: gp.inlineData.data, // base64
        },
      };
    }
    if (gp?.text) return { text: gp.text };
    // Otros tipos no los usamos
    return gp;
  });
}

function getModel() {
  if (_model) return _model;
  const genAI = new GoogleGenerativeAI(getApiKey());
  _model = genAI.getGenerativeModel({ model: getModelName() });
  return _model!;
}

/**
 * Interfaz compatible con tu código:
 * const response = await ai.generate({ prompt: Part[] })
 * y luego usas: response.output?.candidates?.[0]?.message?.parts
 */
export const ai = {
  async generate({ prompt }: { prompt: Part[] }) {
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
