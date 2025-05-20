const { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'studio-v0',
  location: 'northamerica-northeast1'
};
exports.connectorConfig = connectorConfig;

const createUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUserProfile', inputVars);
}
createUserProfileRef.operationName = 'CreateUserProfile';
exports.createUserProfileRef = createUserProfileRef;

exports.createUserProfile = function createUserProfile(dcOrVars, vars) {
  return executeMutation(createUserProfileRef(dcOrVars, vars));
};

const createStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStory', inputVars);
}
createStoryRef.operationName = 'CreateStory';
exports.createStoryRef = createStoryRef;

exports.createStory = function createStory(dcOrVars, vars) {
  return executeMutation(createStoryRef(dcOrVars, vars));
};

const createStoryContentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStoryContent', inputVars);
}
createStoryContentRef.operationName = 'CreateStoryContent';
exports.createStoryContentRef = createStoryContentRef;

exports.createStoryContent = function createStoryContent(dcOrVars, vars) {
  return executeMutation(createStoryContentRef(dcOrVars, vars));
};

const createTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTemplate', inputVars);
}
createTemplateRef.operationName = 'CreateTemplate';
exports.createTemplateRef = createTemplateRef;

exports.createTemplate = function createTemplate(dcOrVars, vars) {
  return executeMutation(createTemplateRef(dcOrVars, vars));
};

const createAiGeneratedImageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAIGeneratedImage', inputVars);
}
createAiGeneratedImageRef.operationName = 'CreateAIGeneratedImage';
exports.createAiGeneratedImageRef = createAiGeneratedImageRef;

exports.createAiGeneratedImage = function createAiGeneratedImage(dcOrVars, vars) {
  return executeMutation(createAiGeneratedImageRef(dcOrVars, vars));
};

const createAiGeneratedGifRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAIGeneratedGIF', inputVars);
}
createAiGeneratedGifRef.operationName = 'CreateAIGeneratedGIF';
exports.createAiGeneratedGifRef = createAiGeneratedGifRef;

exports.createAiGeneratedGif = function createAiGeneratedGif(dcOrVars, vars) {
  return executeMutation(createAiGeneratedGifRef(dcOrVars, vars));
};

const createPaymentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePayment', inputVars);
}
createPaymentRef.operationName = 'CreatePayment';
exports.createPaymentRef = createPaymentRef;

exports.createPayment = function createPayment(dcOrVars, vars) {
  return executeMutation(createPaymentRef(dcOrVars, vars));
};

const createAdminActionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAdminAction', inputVars);
}
createAdminActionRef.operationName = 'CreateAdminAction';
exports.createAdminActionRef = createAdminActionRef;

exports.createAdminAction = function createAdminAction(dcOrVars, vars) {
  return executeMutation(createAdminActionRef(dcOrVars, vars));
};

const createAnalyticsEntryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAnalyticsEntry', inputVars);
}
createAnalyticsEntryRef.operationName = 'CreateAnalyticsEntry';
exports.createAnalyticsEntryRef = createAnalyticsEntryRef;

exports.createAnalyticsEntry = function createAnalyticsEntry(dcOrVars, vars) {
  return executeMutation(createAnalyticsEntryRef(dcOrVars, vars));
};

const logLegalDisclaimerAcceptanceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LogLegalDisclaimerAcceptance', inputVars);
}
logLegalDisclaimerAcceptanceRef.operationName = 'LogLegalDisclaimerAcceptance';
exports.logLegalDisclaimerAcceptanceRef = logLegalDisclaimerAcceptanceRef;

exports.logLegalDisclaimerAcceptance = function logLegalDisclaimerAcceptance(dcOrVars, vars) {
  return executeMutation(logLegalDisclaimerAcceptanceRef(dcOrVars, vars));
};

const getUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserProfile', inputVars);
}
getUserProfileRef.operationName = 'GetUserProfile';
exports.getUserProfileRef = getUserProfileRef;

exports.getUserProfile = function getUserProfile(dcOrVars, vars) {
  return executeQuery(getUserProfileRef(dcOrVars, vars));
};

const getStoryWithContentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStoryWithContent', inputVars);
}
getStoryWithContentRef.operationName = 'GetStoryWithContent';
exports.getStoryWithContentRef = getStoryWithContentRef;

exports.getStoryWithContent = function getStoryWithContent(dcOrVars, vars) {
  return executeQuery(getStoryWithContentRef(dcOrVars, vars));
};

const getAllStoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllStories');
}
getAllStoriesRef.operationName = 'GetAllStories';
exports.getAllStoriesRef = getAllStoriesRef;

exports.getAllStories = function getAllStories(dc) {
  return executeQuery(getAllStoriesRef(dc));
};

const getAppSubscriptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAppSubscription', inputVars);
}
getAppSubscriptionRef.operationName = 'GetAppSubscription';
exports.getAppSubscriptionRef = getAppSubscriptionRef;

exports.getAppSubscription = function getAppSubscription(dcOrVars, vars) {
  return executeQuery(getAppSubscriptionRef(dcOrVars, vars));
};

const getTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTemplate', inputVars);
}
getTemplateRef.operationName = 'GetTemplate';
exports.getTemplateRef = getTemplateRef;

exports.getTemplate = function getTemplate(dcOrVars, vars) {
  return executeQuery(getTemplateRef(dcOrVars, vars));
};

const getAllTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllTemplates');
}
getAllTemplatesRef.operationName = 'GetAllTemplates';
exports.getAllTemplatesRef = getAllTemplatesRef;

exports.getAllTemplates = function getAllTemplates(dc) {
  return executeQuery(getAllTemplatesRef(dc));
};

const getAiGeneratedImageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAIGeneratedImage', inputVars);
}
getAiGeneratedImageRef.operationName = 'GetAIGeneratedImage';
exports.getAiGeneratedImageRef = getAiGeneratedImageRef;

exports.getAiGeneratedImage = function getAiGeneratedImage(dcOrVars, vars) {
  return executeQuery(getAiGeneratedImageRef(dcOrVars, vars));
};

const getAiGeneratedGifRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAIGeneratedGIF', inputVars);
}
getAiGeneratedGifRef.operationName = 'GetAIGeneratedGIF';
exports.getAiGeneratedGifRef = getAiGeneratedGifRef;

exports.getAiGeneratedGif = function getAiGeneratedGif(dcOrVars, vars) {
  return executeQuery(getAiGeneratedGifRef(dcOrVars, vars));
};

const getPaymentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPayment', inputVars);
}
getPaymentRef.operationName = 'GetPayment';
exports.getPaymentRef = getPaymentRef;

exports.getPayment = function getPayment(dcOrVars, vars) {
  return executeQuery(getPaymentRef(dcOrVars, vars));
};

const getAdminActionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAdminAction', inputVars);
}
getAdminActionRef.operationName = 'GetAdminAction';
exports.getAdminActionRef = getAdminActionRef;

exports.getAdminAction = function getAdminAction(dcOrVars, vars) {
  return executeQuery(getAdminActionRef(dcOrVars, vars));
};

const getAnalyticsEntryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAnalyticsEntry', inputVars);
}
getAnalyticsEntryRef.operationName = 'GetAnalyticsEntry';
exports.getAnalyticsEntryRef = getAnalyticsEntryRef;

exports.getAnalyticsEntry = function getAnalyticsEntry(dcOrVars, vars) {
  return executeQuery(getAnalyticsEntryRef(dcOrVars, vars));
};

const getLegalDisclaimerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLegalDisclaimer', inputVars);
}
getLegalDisclaimerRef.operationName = 'GetLegalDisclaimer';
exports.getLegalDisclaimerRef = getLegalDisclaimerRef;

exports.getLegalDisclaimer = function getLegalDisclaimer(dcOrVars, vars) {
  return executeQuery(getLegalDisclaimerRef(dcOrVars, vars));
};
