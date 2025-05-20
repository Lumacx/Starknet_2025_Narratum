import { queryRef, executeQuery, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const connectorConfig = {
  connector: 'default',
  service: 'studio-v0',
  location: 'northamerica-northeast1'
};

export const createUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateUserProfile', inputVars);
}
createUserProfileRef.operationName = 'CreateUserProfile';

export function createUserProfile(dcOrVars, vars) {
  return executeMutation(createUserProfileRef(dcOrVars, vars));
}

export const createStoryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStory', inputVars);
}
createStoryRef.operationName = 'CreateStory';

export function createStory(dcOrVars, vars) {
  return executeMutation(createStoryRef(dcOrVars, vars));
}

export const createStoryContentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateStoryContent', inputVars);
}
createStoryContentRef.operationName = 'CreateStoryContent';

export function createStoryContent(dcOrVars, vars) {
  return executeMutation(createStoryContentRef(dcOrVars, vars));
}

export const createTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateTemplate', inputVars);
}
createTemplateRef.operationName = 'CreateTemplate';

export function createTemplate(dcOrVars, vars) {
  return executeMutation(createTemplateRef(dcOrVars, vars));
}

export const createAiGeneratedImageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAIGeneratedImage', inputVars);
}
createAiGeneratedImageRef.operationName = 'CreateAIGeneratedImage';

export function createAiGeneratedImage(dcOrVars, vars) {
  return executeMutation(createAiGeneratedImageRef(dcOrVars, vars));
}

export const createAiGeneratedGifRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAIGeneratedGIF', inputVars);
}
createAiGeneratedGifRef.operationName = 'CreateAIGeneratedGIF';

export function createAiGeneratedGif(dcOrVars, vars) {
  return executeMutation(createAiGeneratedGifRef(dcOrVars, vars));
}

export const createPaymentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreatePayment', inputVars);
}
createPaymentRef.operationName = 'CreatePayment';

export function createPayment(dcOrVars, vars) {
  return executeMutation(createPaymentRef(dcOrVars, vars));
}

export const createAdminActionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAdminAction', inputVars);
}
createAdminActionRef.operationName = 'CreateAdminAction';

export function createAdminAction(dcOrVars, vars) {
  return executeMutation(createAdminActionRef(dcOrVars, vars));
}

export const createAnalyticsEntryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CreateAnalyticsEntry', inputVars);
}
createAnalyticsEntryRef.operationName = 'CreateAnalyticsEntry';

export function createAnalyticsEntry(dcOrVars, vars) {
  return executeMutation(createAnalyticsEntryRef(dcOrVars, vars));
}

export const logLegalDisclaimerAcceptanceRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LogLegalDisclaimerAcceptance', inputVars);
}
logLegalDisclaimerAcceptanceRef.operationName = 'LogLegalDisclaimerAcceptance';

export function logLegalDisclaimerAcceptance(dcOrVars, vars) {
  return executeMutation(logLegalDisclaimerAcceptanceRef(dcOrVars, vars));
}

export const getUserProfileRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetUserProfile', inputVars);
}
getUserProfileRef.operationName = 'GetUserProfile';

export function getUserProfile(dcOrVars, vars) {
  return executeQuery(getUserProfileRef(dcOrVars, vars));
}

export const getStoryWithContentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetStoryWithContent', inputVars);
}
getStoryWithContentRef.operationName = 'GetStoryWithContent';

export function getStoryWithContent(dcOrVars, vars) {
  return executeQuery(getStoryWithContentRef(dcOrVars, vars));
}

export const getAllStoriesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllStories');
}
getAllStoriesRef.operationName = 'GetAllStories';

export function getAllStories(dc) {
  return executeQuery(getAllStoriesRef(dc));
}

export const getAppSubscriptionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAppSubscription', inputVars);
}
getAppSubscriptionRef.operationName = 'GetAppSubscription';

export function getAppSubscription(dcOrVars, vars) {
  return executeQuery(getAppSubscriptionRef(dcOrVars, vars));
}

export const getTemplateRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetTemplate', inputVars);
}
getTemplateRef.operationName = 'GetTemplate';

export function getTemplate(dcOrVars, vars) {
  return executeQuery(getTemplateRef(dcOrVars, vars));
}

export const getAllTemplatesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAllTemplates');
}
getAllTemplatesRef.operationName = 'GetAllTemplates';

export function getAllTemplates(dc) {
  return executeQuery(getAllTemplatesRef(dc));
}

export const getAiGeneratedImageRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAIGeneratedImage', inputVars);
}
getAiGeneratedImageRef.operationName = 'GetAIGeneratedImage';

export function getAiGeneratedImage(dcOrVars, vars) {
  return executeQuery(getAiGeneratedImageRef(dcOrVars, vars));
}

export const getAiGeneratedGifRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAIGeneratedGIF', inputVars);
}
getAiGeneratedGifRef.operationName = 'GetAIGeneratedGIF';

export function getAiGeneratedGif(dcOrVars, vars) {
  return executeQuery(getAiGeneratedGifRef(dcOrVars, vars));
}

export const getPaymentRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetPayment', inputVars);
}
getPaymentRef.operationName = 'GetPayment';

export function getPayment(dcOrVars, vars) {
  return executeQuery(getPaymentRef(dcOrVars, vars));
}

export const getAdminActionRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAdminAction', inputVars);
}
getAdminActionRef.operationName = 'GetAdminAction';

export function getAdminAction(dcOrVars, vars) {
  return executeQuery(getAdminActionRef(dcOrVars, vars));
}

export const getAnalyticsEntryRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetAnalyticsEntry', inputVars);
}
getAnalyticsEntryRef.operationName = 'GetAnalyticsEntry';

export function getAnalyticsEntry(dcOrVars, vars) {
  return executeQuery(getAnalyticsEntryRef(dcOrVars, vars));
}

export const getLegalDisclaimerRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'GetLegalDisclaimer', inputVars);
}
getLegalDisclaimerRef.operationName = 'GetLegalDisclaimer';

export function getLegalDisclaimer(dcOrVars, vars) {
  return executeQuery(getLegalDisclaimerRef(dcOrVars, vars));
}

