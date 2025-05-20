import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { ai } from '../genkit';
import { Part } from 'genkit'; // Assuming this is correct from successful build

import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app'; // Import deleteApp
import { getApp as getAdminApp } from 'firebase-admin/app'; 

import { 
    getDataConnect, 
    DataConnect
} from 'firebase/data-connect'; 
import { connectorConfig } from '../../../dataconnect-generated/js/default-connector'; 

if (!admin.apps.length) {
  admin.initializeApp(); // Initializes default admin app
}
const storage = admin.storage();
const bucket = storage.bucket(); 

interface GenerateImageRequestData {
    description?: string;
    sketchDataUrl?: string; 
}

export const generateNarratumImage = functions.https.onCall(
    async (data: any, context: any) => { 
    if (!context || !context.auth) { 
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    let localDataConnectClient: DataConnect | undefined;
    const clientAppName = `dataConnectClientApp-${uuidv4()}`; 
    let clientAppInstance: FirebaseApp | undefined;

    try {
        const adminApp = getAdminApp(); 
        const projectId = adminApp.options.projectId;
        if (!projectId) {
            console.error("Firebase Project ID not found from admin app.");
            throw new functions.https.HttpsError('internal', 'Project ID configuration error.');
        }

        const projectApiKey = functions.config().project?.apikey || process.env.PROJECT_API_KEY;
        if (!projectApiKey) {
            console.error("Project API key for DataConnect client is missing.");
            throw new functions.https.HttpsError('internal', 'API key configuration error for DataConnect.');
        }

        const clientAppConfig = {
            apiKey: projectApiKey, 
            authDomain: `${projectId}.firebaseapp.com`, 
            projectId: projectId,
        };
        
        clientAppInstance = initializeApp(clientAppConfig, clientAppName); 
        localDataConnectClient = getDataConnect(clientAppInstance as any); 

        if (!localDataConnectClient) {
             throw new Error("getDataConnect did not return a client instance.");
        }

        const userId = context.auth!.uid; 
        const description = data.description as string | undefined;
        const sketchDataUrlFromClient = data.sketchDataUrl as string | undefined;
        const imageId = uuidv4(); 

        const promptParts: Part[] = [{ text: "Generate an image..." }];
        if (description) promptParts.push({ text: `Description: ${description}` });
        if (sketchDataUrlFromClient) {
            const match = sketchDataUrlFromClient.match(/^data:(image\/[^;]+);base64,(.+)$/);
            if (match && match[1] && match[2]) {
                promptParts.push({ data: { mimeType: match[1], data: match[2] } });
            } else { console.warn("sketchDataUrlFromClient is not a valid data URI."); }
        }

        const response = await ai.generate({ prompt: promptParts });
        
        let rawGeneratedImageData: string | undefined;
        const outputParts = response.output?.candidates?.[0]?.message?.parts;
        const imageOutputDataPart = outputParts?.find(
            (part: Part): part is Part & { data?: { mimeType?: string; data?: string } } => 
                !!part.data && typeof (part.data as any)?.mimeType === 'string' && 
                (part.data as any).mimeType.startsWith('image/') && typeof (part.data as any)?.data === 'string'
        );
        let generatedImageMimeType = "image/png"; // Default

        if (imageOutputDataPart?.data?.data && imageOutputDataPart.data.mimeType) {
            rawGeneratedImageData = imageOutputDataPart.data.data; 
            generatedImageMimeType = imageOutputDataPart.data.mimeType;
        } else { 
            const anyImagePart = outputParts?.find((part: any) => part?.image?.base64Data);
            if (anyImagePart?.image?.base64Data) {
                 rawGeneratedImageData = anyImagePart.image.base64Data;
                 generatedImageMimeType = anyImagePart.image.mimeType || 'image/png'; // Keep default if not present
            } else {
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
        
        await (localDataConnectClient as any).run({ 
            connector: connectorConfig.connector, 
            operation: mutationName,
            variables: variables,
        });
        
        console.log(`Successfully inserted image metadata for ID: ${imageId}`);
        return { imageUrl: publicUrl, imageId: imageId };

    } catch (error: any) {
        console.error("Error in generateNarratumImage execution:", error.stack || error);
        const code = typeof error.code === 'string' ? error.code as functions.https.FunctionsErrorCode : 'internal';
        const message = error.message ? String(error.message) : 'An error occurred generating the image.';
        throw new functions.https.HttpsError(code , message, error.details);
    } finally {
        if (clientAppInstance) {
            try {
                await deleteApp(clientAppInstance); 
            } catch (e) {
                console.error("Error deleting temporary client app instance:", e);
            }
        }
    }
});
