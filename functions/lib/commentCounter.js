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
exports.incrementCommentCount = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
const data_connect_1 = require("@firebase/data-connect");
const default_connector_1 = require("@firebasegen/default-connector");
if (!admin.apps.length)
    admin.initializeApp();
// Singleton para Data Connect usando ConnectorConfig (NO FirebaseApp)
let dcClient = null;
function getDcClient() {
    if (!dcClient)
        dcClient = (0, data_connect_1.getDataConnect)(default_connector_1.connectorConfig);
    return dcClient;
}
exports.incrementCommentCount = functions
    .region('us-central1')
    .firestore.document('comments/{commentId}')
    .onCreate(async (snap) => {
    const newComment = snap.data();
    const storyId = newComment?.storyId;
    if (!storyId) {
        console.log('Comment without storyId → skip');
        return null;
    }
    try {
        const dc = getDcClient();
        // 1) Obtener la historia actual
        const getRes = await dc.run({
            connector: default_connector_1.connectorConfig.connector,
            operation: 'GetStoryWithContent',
            variables: { storyId }
        });
        const currentStory = getRes?.story;
        if (!currentStory) {
            console.log(`Story ${storyId} not found → skip`);
            return null;
        }
        // 2) Incrementar contador
        const current = currentStory.commentsCount ?? 0;
        const next = current + 1;
        const vars = { id: storyId, commentsCount: next };
        await dc.run({
            connector: default_connector_1.connectorConfig.connector,
            operation: 'UpdateStory',
            variables: vars
        });
        console.log(`commentsCount for story ${storyId}: ${current} → ${next}`);
        return null;
    }
    catch (err) {
        console.error(`incrementCommentCount failed for story ${storyId}:`, err);
        throw err;
    }
});
//# sourceMappingURL=commentCounter.js.map