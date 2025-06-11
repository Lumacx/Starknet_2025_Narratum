import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export interface AIGeneratedGIF_Key {
  id: string;
  __typename?: 'AIGeneratedGIF_Key';
}

export interface AIGeneratedImage_Key {
  id: string;
  __typename?: 'AIGeneratedImage_Key';
}

export interface AdminAction_Key {
  id: string;
  __typename?: 'AdminAction_Key';
}

export interface Analytics_Key {
  id: string;
  __typename?: 'Analytics_Key';
}

export interface AppSubscription_Key {
  id: string;
  __typename?: 'AppSubscription_Key';
}

export interface CreateAdminActionData {
  adminAction_insert: AdminAction_Key;
}

export interface CreateAdminActionVariables {
  adminId: string;
  actionType: string;
  targetId?: string | null;
  description?: string | null;
}

export interface CreateAiGeneratedGifData {
  aIGeneratedGIF_insert: AIGeneratedGIF_Key;
}

export interface CreateAiGeneratedGifVariables {
  imageId: string;
  gifUrl: string;
}

export interface CreateAiGeneratedImageData {
  aIGeneratedImage_insert: AIGeneratedImage_Key;
}

export interface CreateAiGeneratedImageVariables {
  imageId: string;
  userId: string;
  promptText?: string | null;
  sketchUrl?: string | null;
  generatedImageUrl?: string | null;
}

export interface CreateAnalyticsEntryData {
  analytics_insert: Analytics_Key;
}

export interface CreateAnalyticsEntryVariables {
  userId: string;
  storyId: string;
  action: string;
}

export interface CreatePaymentData {
  payment_insert: Payment_Key;
}

export interface CreatePaymentVariables {
  userId: string;
  appSubscriptionId: string;
  amount: number;
}

export interface CreateStoryContentData {
  storyContent_insert: StoryContent_Key;
}

export interface CreateStoryContentVariables {
  storyId: string;
  textContent?: string | null;
  pageNumber?: number | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
}

export interface CreateStoryData {
  story_insert: Story_Key;
}

export interface CreateStoryVariables {
  creatorId: string;
  title?: string | null;
  genre?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
}

export interface CreateTemplateData {
  template_insert: Template_Key;
}

export interface CreateTemplateVariables {
  title: string;
  structureJson?: string | null;
  exampleStoryId?: string | null;
}

export interface CreateUserProfileData {
  user_insert: User_Key;
}

export interface CreateUserProfileVariables {
  username: string;
  email: string;
  displayname: string;
  avatarUrl?: string | null;
}

export interface GetAdminActionData {
  adminAction?: {
    id: string;
    actionType: string;
    targetId?: string | null;
    description?: string | null;
    actionDate: TimestampString;
  } & AdminAction_Key;
}

export interface GetAdminActionVariables {
  actionId: string;
}

export interface GetAiGeneratedGifData {
  aIGeneratedGIF?: {
    id: string;
    gifUrl?: string | null;
  } & AIGeneratedGIF_Key;
}

export interface GetAiGeneratedGifVariables {
  gifId: string;
}

export interface GetAiGeneratedImageData {
  aIGeneratedImage?: {
    id: string;
    promptText?: string | null;
    sketchUrl?: string | null;
    generatedImageUrl?: string | null;
    status: string;
  } & AIGeneratedImage_Key;
}

export interface GetAiGeneratedImageVariables {
  imageId: string;
}

export interface GetAllStoriesData {
  stories: ({
    id: string;
    title?: string | null;
    genre?: string | null;
    status: string;
  } & Story_Key)[];
}

export interface GetAllTemplatesData {
  templates: ({
    id: string;
    title?: string | null;
  } & Template_Key)[];
}

export interface GetAnalyticsEntryData {
  analytics?: {
    id: string;
    action: string;
    actionTimestamp: TimestampString;
  } & Analytics_Key;
}

export interface GetAnalyticsEntryVariables {
  analyticsId: string;
}

export interface GetAppSubscriptionData {
  appSubscription?: {
    id: string;
    name: string;
    price?: number | null;
    featuresJson?: string | null;
  } & AppSubscription_Key;
}

export interface GetAppSubscriptionVariables {
  subscriptionId: string;
}

export interface GetLegalDisclaimerData {
  legalDisclaimer?: {
    id: string;
    accepted: boolean;
    acceptedDate?: TimestampString | null;
    createdAt: TimestampString;
  } & LegalDisclaimer_Key;
}

export interface GetLegalDisclaimerVariables {
  disclaimerId: string;
}

export interface GetPaymentData {
  payment?: {
    id: string;
    amount?: number | null;
    status: string;
    paymentDate: TimestampString;
  } & Payment_Key;
}

export interface GetPaymentVariables {
  paymentId: string;
}

export interface GetStoryWithContentData {
  story?: {
    id: string;
    title?: string | null;
    genre?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
    status: string;
    createdAt: TimestampString;
    storyContent: ({
      id: string;
      textContent: string;
      pageNumber: number;
    } & StoryContent_Key)[];
  } & Story_Key;
}

export interface GetStoryWithContentVariables {
  storyId: string;
}

export interface GetTemplateData {
  template?: {
    id: string;
    title?: string | null;
    structureJson?: string | null;
  } & Template_Key;
}

export interface GetTemplateVariables {
  templateId: string;
}

export interface GetUserProfileData {
  user?: {
    id: string;
    username: string;
    email: string;
    displayname: string;
    avatarUrl?: string | null;
    role: string;
    createdAt: TimestampString;
  } & User_Key;
}

export interface GetUserProfileVariables {
  userId: string;
}

export interface LegalDisclaimer_Key {
  id: string;
  __typename?: 'LegalDisclaimer_Key';
}

export interface LogLegalDisclaimerAcceptanceData {
  legalDisclaimer_insert: LegalDisclaimer_Key;
}

export interface LogLegalDisclaimerAcceptanceVariables {
  userId: string;
}

export interface Payment_Key {
  id: string;
  __typename?: 'Payment_Key';
}

export interface StoryContent_Key {
  id: string;
  __typename?: 'StoryContent_Key';
}

export interface Story_Key {
  id: string;
  __typename?: 'Story_Key';
}

export interface Template_Key {
  id: string;
  __typename?: 'Template_Key';
}

export interface User_Key {
  id: string;
  __typename?: 'User_Key';
}

interface CreateUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserProfileVariables): MutationRef<CreateUserProfileData, CreateUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserProfileVariables): MutationRef<CreateUserProfileData, CreateUserProfileVariables>;
  operationName: string;
}
export const createUserProfileRef: CreateUserProfileRef;

export function createUserProfile(vars: CreateUserProfileVariables): MutationPromise<CreateUserProfileData, CreateUserProfileVariables>;
export function createUserProfile(dc: DataConnect, vars: CreateUserProfileVariables): MutationPromise<CreateUserProfileData, CreateUserProfileVariables>;

interface CreateStoryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
  operationName: string;
}
export const createStoryRef: CreateStoryRef;

export function createStory(vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;
export function createStory(dc: DataConnect, vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;

interface CreateStoryContentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryContentVariables): MutationRef<CreateStoryContentData, CreateStoryContentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateStoryContentVariables): MutationRef<CreateStoryContentData, CreateStoryContentVariables>;
  operationName: string;
}
export const createStoryContentRef: CreateStoryContentRef;

export function createStoryContent(vars: CreateStoryContentVariables): MutationPromise<CreateStoryContentData, CreateStoryContentVariables>;
export function createStoryContent(dc: DataConnect, vars: CreateStoryContentVariables): MutationPromise<CreateStoryContentData, CreateStoryContentVariables>;

interface CreateTemplateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTemplateVariables): MutationRef<CreateTemplateData, CreateTemplateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateTemplateVariables): MutationRef<CreateTemplateData, CreateTemplateVariables>;
  operationName: string;
}
export const createTemplateRef: CreateTemplateRef;

export function createTemplate(vars: CreateTemplateVariables): MutationPromise<CreateTemplateData, CreateTemplateVariables>;
export function createTemplate(dc: DataConnect, vars: CreateTemplateVariables): MutationPromise<CreateTemplateData, CreateTemplateVariables>;

interface CreateAiGeneratedImageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAiGeneratedImageVariables): MutationRef<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAiGeneratedImageVariables): MutationRef<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
  operationName: string;
}
export const createAiGeneratedImageRef: CreateAiGeneratedImageRef;

export function createAiGeneratedImage(vars: CreateAiGeneratedImageVariables): MutationPromise<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
export function createAiGeneratedImage(dc: DataConnect, vars: CreateAiGeneratedImageVariables): MutationPromise<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;

interface CreateAiGeneratedGifRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAiGeneratedGifVariables): MutationRef<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAiGeneratedGifVariables): MutationRef<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
  operationName: string;
}
export const createAiGeneratedGifRef: CreateAiGeneratedGifRef;

export function createAiGeneratedGif(vars: CreateAiGeneratedGifVariables): MutationPromise<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
export function createAiGeneratedGif(dc: DataConnect, vars: CreateAiGeneratedGifVariables): MutationPromise<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;

interface CreatePaymentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePaymentVariables): MutationRef<CreatePaymentData, CreatePaymentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreatePaymentVariables): MutationRef<CreatePaymentData, CreatePaymentVariables>;
  operationName: string;
}
export const createPaymentRef: CreatePaymentRef;

export function createPayment(vars: CreatePaymentVariables): MutationPromise<CreatePaymentData, CreatePaymentVariables>;
export function createPayment(dc: DataConnect, vars: CreatePaymentVariables): MutationPromise<CreatePaymentData, CreatePaymentVariables>;

interface CreateAdminActionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAdminActionVariables): MutationRef<CreateAdminActionData, CreateAdminActionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAdminActionVariables): MutationRef<CreateAdminActionData, CreateAdminActionVariables>;
  operationName: string;
}
export const createAdminActionRef: CreateAdminActionRef;

export function createAdminAction(vars: CreateAdminActionVariables): MutationPromise<CreateAdminActionData, CreateAdminActionVariables>;
export function createAdminAction(dc: DataConnect, vars: CreateAdminActionVariables): MutationPromise<CreateAdminActionData, CreateAdminActionVariables>;

interface CreateAnalyticsEntryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAnalyticsEntryVariables): MutationRef<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateAnalyticsEntryVariables): MutationRef<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
  operationName: string;
}
export const createAnalyticsEntryRef: CreateAnalyticsEntryRef;

export function createAnalyticsEntry(vars: CreateAnalyticsEntryVariables): MutationPromise<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
export function createAnalyticsEntry(dc: DataConnect, vars: CreateAnalyticsEntryVariables): MutationPromise<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;

interface LogLegalDisclaimerAcceptanceRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogLegalDisclaimerAcceptanceVariables): MutationRef<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: LogLegalDisclaimerAcceptanceVariables): MutationRef<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
  operationName: string;
}
export const logLegalDisclaimerAcceptanceRef: LogLegalDisclaimerAcceptanceRef;

export function logLegalDisclaimerAcceptance(vars: LogLegalDisclaimerAcceptanceVariables): MutationPromise<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
export function logLegalDisclaimerAcceptance(dc: DataConnect, vars: LogLegalDisclaimerAcceptanceVariables): MutationPromise<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;

interface GetUserProfileRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
  operationName: string;
}
export const getUserProfileRef: GetUserProfileRef;

export function getUserProfile(vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;
export function getUserProfile(dc: DataConnect, vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetStoryWithContentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoryWithContentVariables): QueryRef<GetStoryWithContentData, GetStoryWithContentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetStoryWithContentVariables): QueryRef<GetStoryWithContentData, GetStoryWithContentVariables>;
  operationName: string;
}
export const getStoryWithContentRef: GetStoryWithContentRef;

export function getStoryWithContent(vars: GetStoryWithContentVariables): QueryPromise<GetStoryWithContentData, GetStoryWithContentVariables>;
export function getStoryWithContent(dc: DataConnect, vars: GetStoryWithContentVariables): QueryPromise<GetStoryWithContentData, GetStoryWithContentVariables>;

interface GetAllStoriesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllStoriesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllStoriesData, undefined>;
  operationName: string;
}
export const getAllStoriesRef: GetAllStoriesRef;

export function getAllStories(): QueryPromise<GetAllStoriesData, undefined>;
export function getAllStories(dc: DataConnect): QueryPromise<GetAllStoriesData, undefined>;

interface GetAppSubscriptionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAppSubscriptionVariables): QueryRef<GetAppSubscriptionData, GetAppSubscriptionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAppSubscriptionVariables): QueryRef<GetAppSubscriptionData, GetAppSubscriptionVariables>;
  operationName: string;
}
export const getAppSubscriptionRef: GetAppSubscriptionRef;

export function getAppSubscription(vars: GetAppSubscriptionVariables): QueryPromise<GetAppSubscriptionData, GetAppSubscriptionVariables>;
export function getAppSubscription(dc: DataConnect, vars: GetAppSubscriptionVariables): QueryPromise<GetAppSubscriptionData, GetAppSubscriptionVariables>;

interface GetTemplateRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTemplateVariables): QueryRef<GetTemplateData, GetTemplateVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetTemplateVariables): QueryRef<GetTemplateData, GetTemplateVariables>;
  operationName: string;
}
export const getTemplateRef: GetTemplateRef;

export function getTemplate(vars: GetTemplateVariables): QueryPromise<GetTemplateData, GetTemplateVariables>;
export function getTemplate(dc: DataConnect, vars: GetTemplateVariables): QueryPromise<GetTemplateData, GetTemplateVariables>;

interface GetAllTemplatesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllTemplatesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetAllTemplatesData, undefined>;
  operationName: string;
}
export const getAllTemplatesRef: GetAllTemplatesRef;

export function getAllTemplates(): QueryPromise<GetAllTemplatesData, undefined>;
export function getAllTemplates(dc: DataConnect): QueryPromise<GetAllTemplatesData, undefined>;

interface GetAiGeneratedImageRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAiGeneratedImageVariables): QueryRef<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAiGeneratedImageVariables): QueryRef<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
  operationName: string;
}
export const getAiGeneratedImageRef: GetAiGeneratedImageRef;

export function getAiGeneratedImage(vars: GetAiGeneratedImageVariables): QueryPromise<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
export function getAiGeneratedImage(dc: DataConnect, vars: GetAiGeneratedImageVariables): QueryPromise<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;

interface GetAiGeneratedGifRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAiGeneratedGifVariables): QueryRef<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAiGeneratedGifVariables): QueryRef<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
  operationName: string;
}
export const getAiGeneratedGifRef: GetAiGeneratedGifRef;

export function getAiGeneratedGif(vars: GetAiGeneratedGifVariables): QueryPromise<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
export function getAiGeneratedGif(dc: DataConnect, vars: GetAiGeneratedGifVariables): QueryPromise<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;

interface GetPaymentRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPaymentVariables): QueryRef<GetPaymentData, GetPaymentVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetPaymentVariables): QueryRef<GetPaymentData, GetPaymentVariables>;
  operationName: string;
}
export const getPaymentRef: GetPaymentRef;

export function getPayment(vars: GetPaymentVariables): QueryPromise<GetPaymentData, GetPaymentVariables>;
export function getPayment(dc: DataConnect, vars: GetPaymentVariables): QueryPromise<GetPaymentData, GetPaymentVariables>;

interface GetAdminActionRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAdminActionVariables): QueryRef<GetAdminActionData, GetAdminActionVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAdminActionVariables): QueryRef<GetAdminActionData, GetAdminActionVariables>;
  operationName: string;
}
export const getAdminActionRef: GetAdminActionRef;

export function getAdminAction(vars: GetAdminActionVariables): QueryPromise<GetAdminActionData, GetAdminActionVariables>;
export function getAdminAction(dc: DataConnect, vars: GetAdminActionVariables): QueryPromise<GetAdminActionData, GetAdminActionVariables>;

interface GetAnalyticsEntryRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAnalyticsEntryVariables): QueryRef<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetAnalyticsEntryVariables): QueryRef<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
  operationName: string;
}
export const getAnalyticsEntryRef: GetAnalyticsEntryRef;

export function getAnalyticsEntry(vars: GetAnalyticsEntryVariables): QueryPromise<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
export function getAnalyticsEntry(dc: DataConnect, vars: GetAnalyticsEntryVariables): QueryPromise<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;

interface GetLegalDisclaimerRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLegalDisclaimerVariables): QueryRef<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetLegalDisclaimerVariables): QueryRef<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
  operationName: string;
}
export const getLegalDisclaimerRef: GetLegalDisclaimerRef;

export function getLegalDisclaimer(vars: GetLegalDisclaimerVariables): QueryPromise<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
export function getLegalDisclaimer(dc: DataConnect, vars: GetLegalDisclaimerVariables): QueryPromise<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;

