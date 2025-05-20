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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const uuid_1 = require("uuid");
const genkit_1 = require("../genkit");
const app_1 = require("firebase/app"); // Import deleteApp
const app_2 = require("firebase-admin/app");
const data_connect_1 = require("firebase/data-connect");
const default_connector_1 = require("../../../dataconnect-generated/js/default-connector");
if (!admin.apps.length) {
    admin.initializeApp(); // Initializes default admin app
}
const storage = admin.storage();
const bucket = storage.bucket();
exports.generateNarratumImage = functions.https.onCall(async (data, context) => {
    var _a, _b, _c, _d, _e, _f, _g;
    if (!context || !context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    let localDataConnectClient;
    const clientAppName = `dataConnectClientApp-${(0, uuid_1.v4)()}`;
    let clientAppInstance;
    try {
        const adminApp = (0, app_2.getApp)();
        const projectId = adminApp.options.projectId;
        if (!projectId) {
            console.error("Firebase Project ID not found from admin app.");
            throw new functions.https.HttpsError('internal', 'Project ID configuration error.');
        }
        const projectApiKey = ((_a = functions.config().project) === null || _a === void 0 ? void 0 : _a.apikey) || process.env.PROJECT_API_KEY;
        if (!projectApiKey) {
            console.error("Project API key for DataConnect client is missing.");
            throw new functions.https.HttpsError('internal', 'API key configuration error for DataConnect.');
        }
        const clientAppConfig = {
            apiKey: projectApiKey,
            authDomain: `${projectId}.firebaseapp.com`,
            projectId: projectId,
        };
        clientAppInstance = (0, app_1.initializeApp)(clientAppConfig, clientAppName);
        localDataConnectClient = (0, data_connect_1.getDataConnect)(clientAppInstance);
        if (!localDataConnectClient) {
            throw new Error("getDataConnect did not return a client instance.");
        }
        const userId = context.auth.uid;
        const description = data.description;
        const sketchDataUrlFromClient = data.sketchDataUrl;
        const imageId = (0, uuid_1.v4)();
        const promptParts = [{ text: "Generate an image..." }];
        if (description)
            promptParts.push({ text: `Description: ${description}` });
        if (sketchDataUrlFromClient) {
            const match = sketchDataUrlFromClient.match(/^data:(image\/[^;]+);base64,(.+)$/);
            if (match && match[1] && match[2]) {
                promptParts.push({ data: { mimeType: match[1], data: match[2] } });
            }
            else {
                console.warn("sketchDataUrlFromClient is not a valid data URI.");
            }
        }
        const response = await genkit_1.ai.generate({ prompt: promptParts });
        let rawGeneratedImageData;
        const outputParts = (_e = (_d = (_c = (_b = response.output) === null || _b === void 0 ? void 0 : _b.candidates) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.message) === null || _e === void 0 ? void 0 : _e.parts;
        const imageOutputDataPart = outputParts === null || outputParts === void 0 ? void 0 : outputParts.find((part) => {
            var _a, _b;
            return !!part.data && typeof ((_a = part.data) === null || _a === void 0 ? void 0 : _a.mimeType) === 'string' &&
                part.data.mimeType.startsWith('image/') && typeof ((_b = part.data) === null || _b === void 0 ? void 0 : _b.data) === 'string';
        });
        let generatedImageMimeType = "image/png"; // Default
        if (((_f = imageOutputDataPart === null || imageOutputDataPart === void 0 ? void 0 : imageOutputDataPart.data) === null || _f === void 0 ? void 0 : _f.data) && imageOutputDataPart.data.mimeType) {
            rawGeneratedImageData = imageOutputDataPart.data.data;
            generatedImageMimeType = imageOutputDataPart.data.mimeType;
        }
        else {
            const anyImagePart = outputParts === null || outputParts === void 0 ? void 0 : outputParts.find((part) => { var _a; return (_a = part === null || part === void 0 ? void 0 : part.image) === null || _a === void 0 ? void 0 : _a.base64Data; });
            if ((_g = anyImagePart === null || anyImagePart === void 0 ? void 0 : anyImagePart.image) === null || _g === void 0 ? void 0 : _g.base64Data) {
                rawGeneratedImageData = anyImagePart.image.base64Data;
                generatedImageMimeType = anyImagePart.image.mimeType || 'image/png'; // Keep default if not present
            }
            else {
                console.error("Model response issue - No suitable image data part found:", JSON.stringify(response.output, null, 2));
                throw new functions.https.HttpsError('internal', 'Failed to extract image data from AI model response.');
            }
        }
        if (!rawGeneratedImageData) {
            throw new functions.https.HttpsError('internal', 'No image data found or extracted from AI.');
        }
        const imageBuffer = Buffer.from(rawGeneratedImageData, 'base64');
        const fileExtension = generatedImageMimeType.split('/')[1] || 'png';
        const imageName = `${imageId}.${fileExtension}`;
        const filePath = `narratum_images/${userId}/${imageName}`;
        const file = bucket.file(filePath);
        await file.save(imageBuffer, { metadata: { contentType: generatedImageMimeType }, public: true });
        const publicUrl = file.publicUrl();
        const mutationName = 'aIGeneratedImage_insert';
        const variables = { imageId, userId, promptText: description || '', sketchUrl: sketchDataUrlFromClient || null, generatedImageUrl: publicUrl };
        console.log(`Attempting to insert image metadata with ID: ${imageId} for user: ${userId}`);
        await localDataConnectClient.run({
            connector: default_connector_1.connectorConfig.connector,
            operation: mutationName,
            variables: variables,
        });
        console.log(`Successfully inserted image metadata for ID: ${imageId}`);
        return { imageUrl: publicUrl, imageId: imageId };
    }
    catch (error) {
        console.error("Error in generateNarratumImage execution:", error.stack || error);
        const code = typeof error.code === 'string' ? error.code : 'internal';
        const message = error.message ? String(error.message) : 'An error occurred generating the image.';
        throw new functions.https.HttpsError(code, message, error.details);
    }
    finally {
        if (clientAppInstance) {
            try {
                await (0, app_1.deleteApp)(clientAppInstance);
            }
            catch (e) {
                console.error("Error deleting temporary client app instance:", e);
            }
        }
    }
});
//# sourceMappingURL=imageGeneration.js.map