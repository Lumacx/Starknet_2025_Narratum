import { CreateUserProfileData, CreateUserProfileVariables, CreateStoryData, CreateStoryVariables, CreateStoryContentData, CreateStoryContentVariables, CreateTemplateData, CreateTemplateVariables, CreateAiGeneratedImageData, CreateAiGeneratedImageVariables, CreateAiGeneratedGifData, CreateAiGeneratedGifVariables, CreatePaymentData, CreatePaymentVariables, CreateAdminActionData, CreateAdminActionVariables, CreateAnalyticsEntryData, CreateAnalyticsEntryVariables, LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables, GetUserProfileData, GetUserProfileVariables, GetStoryWithContentData, GetStoryWithContentVariables, GetAllStoriesData, GetAppSubscriptionData, GetAppSubscriptionVariables, GetTemplateData, GetTemplateVariables, GetAllTemplatesData, GetAiGeneratedImageData, GetAiGeneratedImageVariables, GetAiGeneratedGifData, GetAiGeneratedGifVariables, GetPaymentData, GetPaymentVariables, GetAdminActionData, GetAdminActionVariables, GetAnalyticsEntryData, GetAnalyticsEntryVariables, GetLegalDisclaimerData, GetLegalDisclaimerVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useCreateUserProfile(options?: useDataConnectMutationOptions<CreateUserProfileData, FirebaseError, CreateUserProfileVariables>): UseDataConnectMutationResult<CreateUserProfileData, CreateUserProfileVariables>;
export function useCreateUserProfile(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserProfileData, FirebaseError, CreateUserProfileVariables>): UseDataConnectMutationResult<CreateUserProfileData, CreateUserProfileVariables>;

export function useCreateStory(options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;
export function useCreateStory(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;

export function useCreateStoryContent(options?: useDataConnectMutationOptions<CreateStoryContentData, FirebaseError, CreateStoryContentVariables>): UseDataConnectMutationResult<CreateStoryContentData, CreateStoryContentVariables>;
export function useCreateStoryContent(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoryContentData, FirebaseError, CreateStoryContentVariables>): UseDataConnectMutationResult<CreateStoryContentData, CreateStoryContentVariables>;

export function useCreateTemplate(options?: useDataConnectMutationOptions<CreateTemplateData, FirebaseError, CreateTemplateVariables>): UseDataConnectMutationResult<CreateTemplateData, CreateTemplateVariables>;
export function useCreateTemplate(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTemplateData, FirebaseError, CreateTemplateVariables>): UseDataConnectMutationResult<CreateTemplateData, CreateTemplateVariables>;

export function useCreateAiGeneratedImage(options?: useDataConnectMutationOptions<CreateAiGeneratedImageData, FirebaseError, CreateAiGeneratedImageVariables>): UseDataConnectMutationResult<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
export function useCreateAiGeneratedImage(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAiGeneratedImageData, FirebaseError, CreateAiGeneratedImageVariables>): UseDataConnectMutationResult<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;

export function useCreateAiGeneratedGif(options?: useDataConnectMutationOptions<CreateAiGeneratedGifData, FirebaseError, CreateAiGeneratedGifVariables>): UseDataConnectMutationResult<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
export function useCreateAiGeneratedGif(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAiGeneratedGifData, FirebaseError, CreateAiGeneratedGifVariables>): UseDataConnectMutationResult<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;

export function useCreatePayment(options?: useDataConnectMutationOptions<CreatePaymentData, FirebaseError, CreatePaymentVariables>): UseDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables>;
export function useCreatePayment(dc: DataConnect, options?: useDataConnectMutationOptions<CreatePaymentData, FirebaseError, CreatePaymentVariables>): UseDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables>;

export function useCreateAdminAction(options?: useDataConnectMutationOptions<CreateAdminActionData, FirebaseError, CreateAdminActionVariables>): UseDataConnectMutationResult<CreateAdminActionData, CreateAdminActionVariables>;
export function useCreateAdminAction(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAdminActionData, FirebaseError, CreateAdminActionVariables>): UseDataConnectMutationResult<CreateAdminActionData, CreateAdminActionVariables>;

export function useCreateAnalyticsEntry(options?: useDataConnectMutationOptions<CreateAnalyticsEntryData, FirebaseError, CreateAnalyticsEntryVariables>): UseDataConnectMutationResult<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
export function useCreateAnalyticsEntry(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAnalyticsEntryData, FirebaseError, CreateAnalyticsEntryVariables>): UseDataConnectMutationResult<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;

export function useLogLegalDisclaimerAcceptance(options?: useDataConnectMutationOptions<LogLegalDisclaimerAcceptanceData, FirebaseError, LogLegalDisclaimerAcceptanceVariables>): UseDataConnectMutationResult<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
export function useLogLegalDisclaimerAcceptance(dc: DataConnect, options?: useDataConnectMutationOptions<LogLegalDisclaimerAcceptanceData, FirebaseError, LogLegalDisclaimerAcceptanceVariables>): UseDataConnectMutationResult<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;

export function useGetUserProfile(vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
export function useGetUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;

export function useGetStoryWithContent(vars: GetStoryWithContentVariables, options?: useDataConnectQueryOptions<GetStoryWithContentData>): UseDataConnectQueryResult<GetStoryWithContentData, GetStoryWithContentVariables>;
export function useGetStoryWithContent(dc: DataConnect, vars: GetStoryWithContentVariables, options?: useDataConnectQueryOptions<GetStoryWithContentData>): UseDataConnectQueryResult<GetStoryWithContentData, GetStoryWithContentVariables>;

export function useGetAllStories(options?: useDataConnectQueryOptions<GetAllStoriesData>): UseDataConnectQueryResult<GetAllStoriesData, undefined>;
export function useGetAllStories(dc: DataConnect, options?: useDataConnectQueryOptions<GetAllStoriesData>): UseDataConnectQueryResult<GetAllStoriesData, undefined>;

export function useGetAppSubscription(vars: GetAppSubscriptionVariables, options?: useDataConnectQueryOptions<GetAppSubscriptionData>): UseDataConnectQueryResult<GetAppSubscriptionData, GetAppSubscriptionVariables>;
export function useGetAppSubscription(dc: DataConnect, vars: GetAppSubscriptionVariables, options?: useDataConnectQueryOptions<GetAppSubscriptionData>): UseDataConnectQueryResult<GetAppSubscriptionData, GetAppSubscriptionVariables>;

export function useGetTemplate(vars: GetTemplateVariables, options?: useDataConnectQueryOptions<GetTemplateData>): UseDataConnectQueryResult<GetTemplateData, GetTemplateVariables>;
export function useGetTemplate(dc: DataConnect, vars: GetTemplateVariables, options?: useDataConnectQueryOptions<GetTemplateData>): UseDataConnectQueryResult<GetTemplateData, GetTemplateVariables>;

export function useGetAllTemplates(options?: useDataConnectQueryOptions<GetAllTemplatesData>): UseDataConnectQueryResult<GetAllTemplatesData, undefined>;
export function useGetAllTemplates(dc: DataConnect, options?: useDataConnectQueryOptions<GetAllTemplatesData>): UseDataConnectQueryResult<GetAllTemplatesData, undefined>;

export function useGetAiGeneratedImage(vars: GetAiGeneratedImageVariables, options?: useDataConnectQueryOptions<GetAiGeneratedImageData>): UseDataConnectQueryResult<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
export function useGetAiGeneratedImage(dc: DataConnect, vars: GetAiGeneratedImageVariables, options?: useDataConnectQueryOptions<GetAiGeneratedImageData>): UseDataConnectQueryResult<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;

export function useGetAiGeneratedGif(vars: GetAiGeneratedGifVariables, options?: useDataConnectQueryOptions<GetAiGeneratedGifData>): UseDataConnectQueryResult<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
export function useGetAiGeneratedGif(dc: DataConnect, vars: GetAiGeneratedGifVariables, options?: useDataConnectQueryOptions<GetAiGeneratedGifData>): UseDataConnectQueryResult<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;

export function useGetPayment(vars: GetPaymentVariables, options?: useDataConnectQueryOptions<GetPaymentData>): UseDataConnectQueryResult<GetPaymentData, GetPaymentVariables>;
export function useGetPayment(dc: DataConnect, vars: GetPaymentVariables, options?: useDataConnectQueryOptions<GetPaymentData>): UseDataConnectQueryResult<GetPaymentData, GetPaymentVariables>;

export function useGetAdminAction(vars: GetAdminActionVariables, options?: useDataConnectQueryOptions<GetAdminActionData>): UseDataConnectQueryResult<GetAdminActionData, GetAdminActionVariables>;
export function useGetAdminAction(dc: DataConnect, vars: GetAdminActionVariables, options?: useDataConnectQueryOptions<GetAdminActionData>): UseDataConnectQueryResult<GetAdminActionData, GetAdminActionVariables>;

export function useGetAnalyticsEntry(vars: GetAnalyticsEntryVariables, options?: useDataConnectQueryOptions<GetAnalyticsEntryData>): UseDataConnectQueryResult<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
export function useGetAnalyticsEntry(dc: DataConnect, vars: GetAnalyticsEntryVariables, options?: useDataConnectQueryOptions<GetAnalyticsEntryData>): UseDataConnectQueryResult<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;

export function useGetLegalDisclaimer(vars: GetLegalDisclaimerVariables, options?: useDataConnectQueryOptions<GetLegalDisclaimerData>): UseDataConnectQueryResult<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
export function useGetLegalDisclaimer(dc: DataConnect, vars: GetLegalDisclaimerVariables, options?: useDataConnectQueryOptions<GetLegalDisclaimerData>): UseDataConnectQueryResult<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
