import { CreateUserProfileData, CreateUserProfileVariables, CreateStoryData, CreateStoryVariables, CreateStoryContentData, CreateStoryContentVariables, CreateTemplateData, CreateTemplateVariables, CreateAiGeneratedImageData, CreateAiGeneratedImageVariables, CreateAiGeneratedGifData, CreateAiGeneratedGifVariables, CreatePaymentData, CreatePaymentVariables, CreateAdminActionData, CreateAdminActionVariables, CreateAnalyticsEntryData, CreateAnalyticsEntryVariables, LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables, GetUserProfileData, GetUserProfileVariables, GetStoryWithContentData, GetStoryWithContentVariables, GetAllStoriesData, GetAppSubscriptionData, GetAppSubscriptionVariables, GetTemplateData, GetTemplateVariables, GetAllTemplatesData, GetAiGeneratedImageData, GetAiGeneratedImageVariables, GetAiGeneratedGifData, GetAiGeneratedGifVariables, GetPaymentData, GetPaymentVariables, GetAdminActionData, GetAdminActionVariables, GetAnalyticsEntryData, GetAnalyticsEntryVariables, GetLegalDisclaimerData, GetLegalDisclaimerVariables } from '../';
import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise} from '@angular/fire/data-connect';
import { CreateQueryResult, CreateMutationResult} from '@tanstack/angular-query-experimental';
import { CreateDataConnectQueryResult, CreateDataConnectQueryOptions, CreateDataConnectMutationResult, DataConnectMutationOptionsUndefinedMutationFn } from '@tanstack-query-firebase/angular/data-connect';
import { FirebaseError } from 'firebase/app';
import { Injector } from '@angular/core';

type CreateUserProfileOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateUserProfileData, FirebaseError, CreateUserProfileVariables>;
export function injectCreateUserProfile(options?: CreateUserProfileOptions, injector?: Injector): CreateDataConnectMutationResult<CreateUserProfileData, CreateUserProfileVariables, CreateUserProfileVariables>;

type CreateStoryOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateStoryData, FirebaseError, CreateStoryVariables>;
export function injectCreateStory(options?: CreateStoryOptions, injector?: Injector): CreateDataConnectMutationResult<CreateStoryData, CreateStoryVariables, CreateStoryVariables>;

type CreateStoryContentOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateStoryContentData, FirebaseError, CreateStoryContentVariables>;
export function injectCreateStoryContent(options?: CreateStoryContentOptions, injector?: Injector): CreateDataConnectMutationResult<CreateStoryContentData, CreateStoryContentVariables, CreateStoryContentVariables>;

type CreateTemplateOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateTemplateData, FirebaseError, CreateTemplateVariables>;
export function injectCreateTemplate(options?: CreateTemplateOptions, injector?: Injector): CreateDataConnectMutationResult<CreateTemplateData, CreateTemplateVariables, CreateTemplateVariables>;

type CreateAiGeneratedImageOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateAiGeneratedImageData, FirebaseError, CreateAiGeneratedImageVariables>;
export function injectCreateAiGeneratedImage(options?: CreateAiGeneratedImageOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables, CreateAiGeneratedImageVariables>;

type CreateAiGeneratedGifOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateAiGeneratedGifData, FirebaseError, CreateAiGeneratedGifVariables>;
export function injectCreateAiGeneratedGif(options?: CreateAiGeneratedGifOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables, CreateAiGeneratedGifVariables>;

type CreatePaymentOptions = DataConnectMutationOptionsUndefinedMutationFn<CreatePaymentData, FirebaseError, CreatePaymentVariables>;
export function injectCreatePayment(options?: CreatePaymentOptions, injector?: Injector): CreateDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables, CreatePaymentVariables>;

type CreateAdminActionOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateAdminActionData, FirebaseError, CreateAdminActionVariables>;
export function injectCreateAdminAction(options?: CreateAdminActionOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAdminActionData, CreateAdminActionVariables, CreateAdminActionVariables>;

type CreateAnalyticsEntryOptions = DataConnectMutationOptionsUndefinedMutationFn<CreateAnalyticsEntryData, FirebaseError, CreateAnalyticsEntryVariables>;
export function injectCreateAnalyticsEntry(options?: CreateAnalyticsEntryOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables, CreateAnalyticsEntryVariables>;

type LogLegalDisclaimerAcceptanceOptions = DataConnectMutationOptionsUndefinedMutationFn<LogLegalDisclaimerAcceptanceData, FirebaseError, LogLegalDisclaimerAcceptanceVariables>;
export function injectLogLegalDisclaimerAcceptance(options?: LogLegalDisclaimerAcceptanceOptions, injector?: Injector): CreateDataConnectMutationResult<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables, LogLegalDisclaimerAcceptanceVariables>;

type GetUserProfileArgs = GetUserProfileVariables | (() => GetUserProfileVariables);
export type GetUserProfileOptions = () => Omit<CreateDataConnectQueryOptions<GetUserProfileData, GetUserProfileVariables>, 'queryFn'>;
export function injectGetUserProfile(args: GetUserProfileArgs, options?: GetUserProfileOptions, injector?: Injector): CreateDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;

type GetStoryWithContentArgs = GetStoryWithContentVariables | (() => GetStoryWithContentVariables);
export type GetStoryWithContentOptions = () => Omit<CreateDataConnectQueryOptions<GetStoryWithContentData, GetStoryWithContentVariables>, 'queryFn'>;
export function injectGetStoryWithContent(args: GetStoryWithContentArgs, options?: GetStoryWithContentOptions, injector?: Injector): CreateDataConnectQueryResult<GetStoryWithContentData, GetStoryWithContentVariables>;

export type GetAllStoriesOptions = () => Omit<CreateDataConnectQueryOptions<GetAllStoriesData, undefined>, 'queryFn'>;
export function injectGetAllStories(options?: GetAllStoriesOptions, injector?: Injector): CreateDataConnectQueryResult<GetAllStoriesData, undefined>;

type GetAppSubscriptionArgs = GetAppSubscriptionVariables | (() => GetAppSubscriptionVariables);
export type GetAppSubscriptionOptions = () => Omit<CreateDataConnectQueryOptions<GetAppSubscriptionData, GetAppSubscriptionVariables>, 'queryFn'>;
export function injectGetAppSubscription(args: GetAppSubscriptionArgs, options?: GetAppSubscriptionOptions, injector?: Injector): CreateDataConnectQueryResult<GetAppSubscriptionData, GetAppSubscriptionVariables>;

type GetTemplateArgs = GetTemplateVariables | (() => GetTemplateVariables);
export type GetTemplateOptions = () => Omit<CreateDataConnectQueryOptions<GetTemplateData, GetTemplateVariables>, 'queryFn'>;
export function injectGetTemplate(args: GetTemplateArgs, options?: GetTemplateOptions, injector?: Injector): CreateDataConnectQueryResult<GetTemplateData, GetTemplateVariables>;

export type GetAllTemplatesOptions = () => Omit<CreateDataConnectQueryOptions<GetAllTemplatesData, undefined>, 'queryFn'>;
export function injectGetAllTemplates(options?: GetAllTemplatesOptions, injector?: Injector): CreateDataConnectQueryResult<GetAllTemplatesData, undefined>;

type GetAiGeneratedImageArgs = GetAiGeneratedImageVariables | (() => GetAiGeneratedImageVariables);
export type GetAiGeneratedImageOptions = () => Omit<CreateDataConnectQueryOptions<GetAiGeneratedImageData, GetAiGeneratedImageVariables>, 'queryFn'>;
export function injectGetAiGeneratedImage(args: GetAiGeneratedImageArgs, options?: GetAiGeneratedImageOptions, injector?: Injector): CreateDataConnectQueryResult<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;

type GetAiGeneratedGifArgs = GetAiGeneratedGifVariables | (() => GetAiGeneratedGifVariables);
export type GetAiGeneratedGifOptions = () => Omit<CreateDataConnectQueryOptions<GetAiGeneratedGifData, GetAiGeneratedGifVariables>, 'queryFn'>;
export function injectGetAiGeneratedGif(args: GetAiGeneratedGifArgs, options?: GetAiGeneratedGifOptions, injector?: Injector): CreateDataConnectQueryResult<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;

type GetPaymentArgs = GetPaymentVariables | (() => GetPaymentVariables);
export type GetPaymentOptions = () => Omit<CreateDataConnectQueryOptions<GetPaymentData, GetPaymentVariables>, 'queryFn'>;
export function injectGetPayment(args: GetPaymentArgs, options?: GetPaymentOptions, injector?: Injector): CreateDataConnectQueryResult<GetPaymentData, GetPaymentVariables>;

type GetAdminActionArgs = GetAdminActionVariables | (() => GetAdminActionVariables);
export type GetAdminActionOptions = () => Omit<CreateDataConnectQueryOptions<GetAdminActionData, GetAdminActionVariables>, 'queryFn'>;
export function injectGetAdminAction(args: GetAdminActionArgs, options?: GetAdminActionOptions, injector?: Injector): CreateDataConnectQueryResult<GetAdminActionData, GetAdminActionVariables>;

type GetAnalyticsEntryArgs = GetAnalyticsEntryVariables | (() => GetAnalyticsEntryVariables);
export type GetAnalyticsEntryOptions = () => Omit<CreateDataConnectQueryOptions<GetAnalyticsEntryData, GetAnalyticsEntryVariables>, 'queryFn'>;
export function injectGetAnalyticsEntry(args: GetAnalyticsEntryArgs, options?: GetAnalyticsEntryOptions, injector?: Injector): CreateDataConnectQueryResult<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;

type GetLegalDisclaimerArgs = GetLegalDisclaimerVariables | (() => GetLegalDisclaimerVariables);
export type GetLegalDisclaimerOptions = () => Omit<CreateDataConnectQueryOptions<GetLegalDisclaimerData, GetLegalDisclaimerVariables>, 'queryFn'>;
export function injectGetLegalDisclaimer(args: GetLegalDisclaimerArgs, options?: GetLegalDisclaimerOptions, injector?: Injector): CreateDataConnectQueryResult<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
