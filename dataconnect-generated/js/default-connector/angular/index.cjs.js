const { createUserProfileRef, createStoryRef, createStoryContentRef, createTemplateRef, createAiGeneratedImageRef, createAiGeneratedGifRef, createPaymentRef, createAdminActionRef, createAnalyticsEntryRef, logLegalDisclaimerAcceptanceRef, getUserProfileRef, getStoryWithContentRef, getAllStoriesRef, getAppSubscriptionRef, getTemplateRef, getAllTemplatesRef, getAiGeneratedImageRef, getAiGeneratedGifRef, getPaymentRef, getAdminActionRef, getAnalyticsEntryRef, getLegalDisclaimerRef } = require('../');
const { DataConnect, CallerSdkTypeEnum } = require('@angular/fire/data-connect');
const { injectDataConnectQuery, injectDataConnectMutation } = require('@tanstack-query-firebase/angular/data-connect');
const { inject, EnvironmentInjector } = require('@angular/core');

exports.injectCreateUserProfile = function injectCreateUserProfile(args, injector) {
  return injectDataConnectMutation(createUserProfileRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreateStory = function injectCreateStory(args, injector) {
  return injectDataConnectMutation(createStoryRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreateStoryContent = function injectCreateStoryContent(args, injector) {
  return injectDataConnectMutation(createStoryContentRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreateTemplate = function injectCreateTemplate(args, injector) {
  return injectDataConnectMutation(createTemplateRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreateAiGeneratedImage = function injectCreateAiGeneratedImage(args, injector) {
  return injectDataConnectMutation(createAiGeneratedImageRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreateAiGeneratedGif = function injectCreateAiGeneratedGif(args, injector) {
  return injectDataConnectMutation(createAiGeneratedGifRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreatePayment = function injectCreatePayment(args, injector) {
  return injectDataConnectMutation(createPaymentRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreateAdminAction = function injectCreateAdminAction(args, injector) {
  return injectDataConnectMutation(createAdminActionRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectCreateAnalyticsEntry = function injectCreateAnalyticsEntry(args, injector) {
  return injectDataConnectMutation(createAnalyticsEntryRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectLogLegalDisclaimerAcceptance = function injectLogLegalDisclaimerAcceptance(args, injector) {
  return injectDataConnectMutation(logLegalDisclaimerAcceptanceRef, args, injector, CallerSdkTypeEnum.GeneratedAngular);
}

exports.injectGetUserProfile = function injectGetUserProfile(args, options, injector) {
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

exports.injectGetStoryWithContent = function injectGetStoryWithContent(args, options, injector) {
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

exports.injectGetAllStories = function injectGetAllStories(options, injector) {
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

exports.injectGetAppSubscription = function injectGetAppSubscription(args, options, injector) {
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

exports.injectGetTemplate = function injectGetTemplate(args, options, injector) {
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

exports.injectGetAllTemplates = function injectGetAllTemplates(options, injector) {
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

exports.injectGetAiGeneratedImage = function injectGetAiGeneratedImage(args, options, injector) {
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

exports.injectGetAiGeneratedGif = function injectGetAiGeneratedGif(args, options, injector) {
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

exports.injectGetPayment = function injectGetPayment(args, options, injector) {
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

exports.injectGetAdminAction = function injectGetAdminAction(args, options, injector) {
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

exports.injectGetAnalyticsEntry = function injectGetAnalyticsEntry(args, options, injector) {
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

exports.injectGetLegalDisclaimer = function injectGetLegalDisclaimer(args, options, injector) {
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

