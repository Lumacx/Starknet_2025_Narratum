import { createUserProfileRef, createStoryRef, createStoryContentRef, createTemplateRef, createAiGeneratedImageRef, createAiGeneratedGifRef, createPaymentRef, createAdminActionRef, createAnalyticsEntryRef, logLegalDisclaimerAcceptanceRef, getUserProfileRef, getStoryWithContentRef, getAllStoriesRef, getAppSubscriptionRef, getTemplateRef, getAllTemplatesRef, getAiGeneratedImageRef, getAiGeneratedGifRef, getPaymentRef, getAdminActionRef, getAnalyticsEntryRef, getLegalDisclaimerRef } from '../../';
import { DataConnect, CallerSdkTypeEnum } from '@angular/fire/data-connect';
import { injectDataConnectQuery, injectDataConnectMutation } from '@tanstack-query-firebase/angular/data-connect';
import { inject, EnvironmentInjector } from '@angular/core';
export function injectCreateUserProfile(args, injector) {
  return injectDataConnectMutation(createUserProfileRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreateStory(args, injector) {
  return injectDataConnectMutation(createStoryRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreateStoryContent(args, injector) {
  return injectDataConnectMutation(createStoryContentRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreateTemplate(args, injector) {
  return injectDataConnectMutation(createTemplateRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreateAiGeneratedImage(args, injector) {
  return injectDataConnectMutation(createAiGeneratedImageRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreateAiGeneratedGif(args, injector) {
  return injectDataConnectMutation(createAiGeneratedGifRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreatePayment(args, injector) {
  return injectDataConnectMutation(createPaymentRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreateAdminAction(args, injector) {
  return injectDataConnectMutation(createAdminActionRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectCreateAnalyticsEntry(args, injector) {
  return injectDataConnectMutation(createAnalyticsEntryRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectLogLegalDisclaimerAcceptance(args, injector) {
  return injectDataConnectMutation(logLegalDisclaimerAcceptanceRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetUserProfile(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getUserProfileRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetStoryWithContent(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getStoryWithContentRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetAllStories(options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getAllStoriesRef(dc),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetAppSubscription(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getAppSubscriptionRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetTemplate(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getTemplateRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetAllTemplates(options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getAllTemplatesRef(dc),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetAiGeneratedImage(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getAiGeneratedImageRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetAiGeneratedGif(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getAiGeneratedGifRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetPayment(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getPaymentRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetAdminAction(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getAdminActionRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetAnalyticsEntry(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getAnalyticsEntryRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

export function injectGetLegalDisclaimer(args, options, injector) {
  const finalInjector = injector || inject(EnvironmentInjector);
  const dc = finalInjector.get(DataConnect);
  const varsFactoryFn = (typeof args === 'function') ? args : () => args;
  return injectDataConnectQuery(() => {
    const addOpn = options && options();
    return {
      queryFn: () =>  getLegalDisclaimerRef(dc, varsFactoryFn()),
      ...addOpn
    };
  }, finalInjector, CallerSdkTypeEnum.GeneratedAngular);
}

