import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { initializeApp, deleteApp } from 'firebase/app';
import { getApp as getAdminApp } from 'firebase-admin/app';
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '../../dataconnect-generated/js/default-connector';
// No longer importing FirestoreEvent or QueryDocumentSnapshot from v2, using v1 'functions.firestore'
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
// Initialize a regular Firebase App instance for DataConnect client
let clientAppInstance;
let dataConnectClient;
function initializeDataConnectClient() {
    const adminApp = getAdminApp();
    const projectId = adminApp.options.projectId;
    if (!projectId) {
        console.error("Firebase Project ID not found from admin app.");
        throw new functions.https.HttpsError('internal', 'Project ID configuration error.');
    }
    const projectApiKey = functions.config().project?.apikey || process.env.PROJECT_API_KEY;
    if (!projectApiKey) {
        console.error("Project API key for DataConnect client is missing. Set it with: firebase functions:config:set project.apikey=\"YOUR_WEB_API_KEY\"");
        throw new functions.https.HttpsError('internal', 'API key configuration error for DataConnect.');
    }
    const clientAppConfig = {
        apiKey: projectApiKey,
        authDomain: `${projectId}.firebaseapp.com`,
        projectId: projectId,
    };
    clientAppInstance = initializeApp(clientAppConfig, 'dataConnectClientForFunctions');
    dataConnectClient = getDataConnect(clientAppInstance);
}
initializeDataConnectClient();
export const incrementCommentCount = functions.firestore
    .document('comments/{commentId}') // Listen to new comments being created
    .onCreate(async (snap, context) => {
    const newComment = snap.data(); // Access data directly from snap for v1
    const storyId = newComment.storyId;
    if (!storyId) {
        console.log('Comment has no storyId, skipping count increment.');
        return null;
    }
    try {
        const getStoryResult = await dataConnectClient.run({
            connector: connectorConfig.connector,
            operation: 'GetStoryWithContent',
            variables: { storyId: storyId },
        });
        const currentStory = getStoryResult.story;
        if (!currentStory) {
            console.log(`Story with ID ${storyId} not found, cannot increment comment count.`);
            return null;
        }
        const currentCommentsCount = currentStory.commentsCount || 0;
        const newCommentsCount = currentCommentsCount + 1;
        const updateVariables = {
            id: storyId,
            commentsCount: newCommentsCount,
        };
        await dataConnectClient.run({
            connector: connectorConfig.connector,
            operation: 'UpdateStory',
            variables: updateVariables,
        });
        console.log(`Incremented comment count for story ${storyId} to ${newCommentsCount}`);
        return null;
    }
    catch (error) {
        console.error(`Error incrementing comment count for story ${storyId}:`, error);
        throw error;
    }
    finally {
        if (clientAppInstance) {
            try {
                await deleteApp(clientAppInstance);
            }
            catch (e) {
                console.error("Error deleting temporary client app instance:", e);
            }
        }
    }
});
//# sourceMappingURL=commentCounter.js.map