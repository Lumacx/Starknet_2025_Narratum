# Table of Contents
- [**Overview**](#generated-angular-readme)
- [**TanStack Query Firebase & TanStack Angular Query**](#tanstack-query-firebase-tanstack-angular-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-angular-query-packages)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetUserProfile*](#getuserprofile)
  - [*GetStoryWithContent*](#getstorywithcontent)
  - [*GetAllStories*](#getallstories)
  - [*GetAppSubscription*](#getappsubscription)
  - [*GetTemplate*](#gettemplate)
  - [*GetAllTemplates*](#getalltemplates)
  - [*GetAIGeneratedImage*](#getaigeneratedimage)
  - [*GetAIGeneratedGIF*](#getaigeneratedgif)
  - [*GetPayment*](#getpayment)
  - [*GetAdminAction*](#getadminaction)
  - [*GetAnalyticsEntry*](#getanalyticsentry)
  - [*GetLegalDisclaimer*](#getlegaldisclaimer)
- [**Mutations**](#mutations)
  - [*CreateUserProfile*](#createuserprofile)
  - [*CreateStory*](#createstory)
  - [*CreateStoryContent*](#createstorycontent)
  - [*CreateTemplate*](#createtemplate)
  - [*CreateAIGeneratedImage*](#createaigeneratedimage)
  - [*CreateAIGeneratedGIF*](#createaigeneratedgif)
  - [*CreatePayment*](#createpayment)
  - [*CreateAdminAction*](#createadminaction)
  - [*CreateAnalyticsEntry*](#createanalyticsentry)
  - [*LogLegalDisclaimerAcceptance*](#loglegaldisclaimeracceptance)

# Generated Angular README
This README will guide you through the process of using the generated Angular SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@firebasegen/default-connector/angular` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#angular).

# TanStack Query Firebase & TanStack Angular Query
This SDK provides [Angular](https://angular.dev/) injectors generated specific to your application, for the operations found in the connector `default`. These injectors are generated using [TanStack Query Firebase](https://react-query-firebase.invertase.dev/) by our partners at Invertase, a library built on top of [TanStack Angular Query v5](https://tanstack.com/query/v5/docs/framework/angular/overview) and [AngularFire](https://github.com/angular/angularfire/tree/main).

***You do not need to be familiar with Tanstack Query or Tanstack Query Firebase to use this SDK.*** However, you may find it useful to learn more about them, as they will empower you as a user of this Generated Angular SDK.

## Installing TanStack Query Firebase and TanStack Angular Query Packages
In order to use the Angular generated SDK, you must install `AngularFire` and select `Data Connect` during the setup.

You can install `AngularFire` using the [Angular CLI](https://angular.dev/installation#install-angular-cli). You can also follow the installation instructions from the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/angular#automatic-setup).

```bash
npm install -g @angular/cli
```
```bash
ng add @angular/fire
# select Data Connect during setup!
```

This should handle configuring your project to use TanStack Query. However, if you need to set up manually, please follow the [TanStack Query Firebase documentation](https://invertase.docs.page/tanstack-query-firebase/angular#usage).

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`.

You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, edit your `main.ts` file and your `app/app.config.ts` file and update your `provideDataConnect` provider:
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
... // other imports
// update your imports to include the function that connects to the emulator
import { getDataConnect, provideDataConnect, connectDataConnectEmulator } from '@angular/fire/data-connect';

// update the `provideDataConnect` provider to provide an instance of `DataConnect` which uses the emulator:
export const appConfig: ApplicationConfig = {
  providers: [
    ... // other providers
    // Firebase Data Connect providers
    ...
    provideDataConnect(() => {
      const dataConnect = getDataConnect(connectorConfig);
      connectDataConnectEmulator(dataConnect, 'localhost', 9399);
      return dataConnect;
    }),
  ],
};
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) using the injectors provided from your generated Angular SDK.

# Queries

The Angular generated SDK provides Query injectors that call [`injectDataConnectQuery`](https://react-query-firebase.invertase.dev/angular/data-connect/querying) from TanStack Query Firebase.

Calling these injectors will return a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and the most recent data returned by the Query, among other things. To learn more about these injectors and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/angular/data-connect/querying).

TanStack Angular Query caches the results of your Queries, so using the same Query injector in multiple places in your application allows the entire application to automatically see updates to that Query's data.

Query injectors execute their Queries automatically when called, and periodically refresh, unless you change the `queryOptions` for the Query. To learn how to stop a Query from automatically executing, including how to make a query "lazy", see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/disabling-queries).

To learn more about TanStack Angular Query's Queries, see the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/guides/queries).

## Using Query Injectors
Here's a general overview of how to use the generated Query injectors in your code:

- If the Query has no variables, the Query injector does not require arguments.
- If the Query has any required variables, the Query injector will require at least one argument: an object that contains all the required variables for the Query.
- If the Query has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Query's variables are optional, the Query injector does not require any arguments.
- The Angular generated SDK's Query injectors do not accept `DataConnect` instances as arguments.
- Query injector functions can be called with or without passing in an `options` argument, whose type is a function which returns an object. The type is generated alongside the operation's injector function in [default-connector/angular/index.d.ts](./index.d.ts). To learn more about the `options` argument, see the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/guides/query-options).
  - ***Special case:***  If the Query has all optional variables and you would like to provide an `options` argument to the Query injector without providing any variables, you must pass `undefined` where you would normally pass the Query's variables, and then may provide the `options` argument.

Below are examples of how to use the `default` connector's generated Query injectors to execute each Query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## GetUserProfile
You can execute the `GetUserProfile` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetUserProfile(args: GetUserProfileArgs, options?: GetUserProfileOptions, injector?: Injector): CreateDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
```

### Variables
The `GetUserProfile` Query requires an argument of type `GetUserProfileVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetUserProfileVariables {
  userId: string;
}
```
### Return Type
Recall that calling the `GetUserProfile` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetUserProfile` Query is of type `GetUserProfileData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
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
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetUserProfile`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetUserProfileVariables } from '@firebasegen/default-connector';
import { injectGetUserProfile, GetUserProfileOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetUserProfile` Query requires an argument of type `GetUserProfileVariables`:
  getUserProfileVars: GetUserProfileVariables = {
    userId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetUserProfile(this.getUserProfileVars);
  // Variables can be defined inline as well.
  query = injectGetUserProfile({ userId: ..., });

  // You can also pass in an options function (not object) of type `GetUserProfileOptions` to the Query injector function.
  options: GetUserProfileOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetUserProfile(this.getUserProfileVars, this.options);
}
```

## GetStoryWithContent
You can execute the `GetStoryWithContent` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetStoryWithContent(args: GetStoryWithContentArgs, options?: GetStoryWithContentOptions, injector?: Injector): CreateDataConnectQueryResult<GetStoryWithContentData, GetStoryWithContentVariables>;
```

### Variables
The `GetStoryWithContent` Query requires an argument of type `GetStoryWithContentVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetStoryWithContentVariables {
  storyId: string;
}
```
### Return Type
Recall that calling the `GetStoryWithContent` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetStoryWithContent` Query is of type `GetStoryWithContentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetStoryWithContentData {
  story?: {
    id: string;
    title?: string | null;
    genre?: string | null;
    description?: string | null;
    coverImageUrl?: string | null;
    status: string;
    createdAt: TimestampString;
  } & Story_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetStoryWithContent`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetStoryWithContentVariables } from '@firebasegen/default-connector';
import { injectGetStoryWithContent, GetStoryWithContentOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetStoryWithContent` Query requires an argument of type `GetStoryWithContentVariables`:
  getStoryWithContentVars: GetStoryWithContentVariables = {
    storyId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetStoryWithContent(this.getStoryWithContentVars);
  // Variables can be defined inline as well.
  query = injectGetStoryWithContent({ storyId: ..., });

  // You can also pass in an options function (not object) of type `GetStoryWithContentOptions` to the Query injector function.
  options: GetStoryWithContentOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetStoryWithContent(this.getStoryWithContentVars, this.options);
}
```

## GetAllStories
You can execute the `GetAllStories` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetAllStories(options?: GetAllStoriesOptions, injector?: Injector): CreateDataConnectQueryResult<GetAllStoriesData, undefined>;
```

### Variables
The `GetAllStories` Query has no variables.
### Return Type
Recall that calling the `GetAllStories` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetAllStories` Query is of type `GetAllStoriesData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAllStoriesData {
  stories: ({
    id: string;
    title?: string | null;
    genre?: string | null;
    status: string;
  } & Story_Key)[];
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetAllStories`'s Query injector

```javascript
... // other imports
import { connectorConfig } from '@firebasegen/default-connector';
import { injectGetAllStories, GetAllStoriesOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetAllStories();

  // You can also pass in an options function (not object) of type `GetAllStoriesOptions` to the Query injector function.
  options: GetAllStoriesOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetAllStories(this.options);
}
```

## GetAppSubscription
You can execute the `GetAppSubscription` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetAppSubscription(args: GetAppSubscriptionArgs, options?: GetAppSubscriptionOptions, injector?: Injector): CreateDataConnectQueryResult<GetAppSubscriptionData, GetAppSubscriptionVariables>;
```

### Variables
The `GetAppSubscription` Query requires an argument of type `GetAppSubscriptionVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAppSubscriptionVariables {
  subscriptionId: string;
}
```
### Return Type
Recall that calling the `GetAppSubscription` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetAppSubscription` Query is of type `GetAppSubscriptionData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAppSubscriptionData {
  appSubscription?: {
    id: string;
    name: string;
    price?: number | null;
    featuresJson?: string | null;
  } & AppSubscription_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetAppSubscription`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetAppSubscriptionVariables } from '@firebasegen/default-connector';
import { injectGetAppSubscription, GetAppSubscriptionOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetAppSubscription` Query requires an argument of type `GetAppSubscriptionVariables`:
  getAppSubscriptionVars: GetAppSubscriptionVariables = {
    subscriptionId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetAppSubscription(this.getAppSubscriptionVars);
  // Variables can be defined inline as well.
  query = injectGetAppSubscription({ subscriptionId: ..., });

  // You can also pass in an options function (not object) of type `GetAppSubscriptionOptions` to the Query injector function.
  options: GetAppSubscriptionOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetAppSubscription(this.getAppSubscriptionVars, this.options);
}
```

## GetTemplate
You can execute the `GetTemplate` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetTemplate(args: GetTemplateArgs, options?: GetTemplateOptions, injector?: Injector): CreateDataConnectQueryResult<GetTemplateData, GetTemplateVariables>;
```

### Variables
The `GetTemplate` Query requires an argument of type `GetTemplateVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetTemplateVariables {
  templateId: string;
}
```
### Return Type
Recall that calling the `GetTemplate` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetTemplate` Query is of type `GetTemplateData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetTemplateData {
  template?: {
    id: string;
    title?: string | null;
    structureJson?: string | null;
  } & Template_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetTemplate`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetTemplateVariables } from '@firebasegen/default-connector';
import { injectGetTemplate, GetTemplateOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetTemplate` Query requires an argument of type `GetTemplateVariables`:
  getTemplateVars: GetTemplateVariables = {
    templateId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetTemplate(this.getTemplateVars);
  // Variables can be defined inline as well.
  query = injectGetTemplate({ templateId: ..., });

  // You can also pass in an options function (not object) of type `GetTemplateOptions` to the Query injector function.
  options: GetTemplateOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetTemplate(this.getTemplateVars, this.options);
}
```

## GetAllTemplates
You can execute the `GetAllTemplates` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetAllTemplates(options?: GetAllTemplatesOptions, injector?: Injector): CreateDataConnectQueryResult<GetAllTemplatesData, undefined>;
```

### Variables
The `GetAllTemplates` Query has no variables.
### Return Type
Recall that calling the `GetAllTemplates` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetAllTemplates` Query is of type `GetAllTemplatesData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAllTemplatesData {
  templates: ({
    id: string;
    title?: string | null;
  } & Template_Key)[];
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetAllTemplates`'s Query injector

```javascript
... // other imports
import { connectorConfig } from '@firebasegen/default-connector';
import { injectGetAllTemplates, GetAllTemplatesOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetAllTemplates();

  // You can also pass in an options function (not object) of type `GetAllTemplatesOptions` to the Query injector function.
  options: GetAllTemplatesOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetAllTemplates(this.options);
}
```

## GetAIGeneratedImage
You can execute the `GetAIGeneratedImage` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetAiGeneratedImage(args: GetAiGeneratedImageArgs, options?: GetAiGeneratedImageOptions, injector?: Injector): CreateDataConnectQueryResult<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
```

### Variables
The `GetAIGeneratedImage` Query requires an argument of type `GetAiGeneratedImageVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAiGeneratedImageVariables {
  imageId: string;
}
```
### Return Type
Recall that calling the `GetAIGeneratedImage` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetAIGeneratedImage` Query is of type `GetAiGeneratedImageData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAiGeneratedImageData {
  aIGeneratedImage?: {
    id: string;
    promptText?: string | null;
    sketchUrl?: string | null;
    generatedImageUrl?: string | null;
    status: string;
  } & AIGeneratedImage_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetAIGeneratedImage`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetAiGeneratedImageVariables } from '@firebasegen/default-connector';
import { injectGetAiGeneratedImage, GetAiGeneratedImageOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetAiGeneratedImage` Query requires an argument of type `GetAiGeneratedImageVariables`:
  getAiGeneratedImageVars: GetAiGeneratedImageVariables = {
    imageId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetAiGeneratedImage(this.getAiGeneratedImageVars);
  // Variables can be defined inline as well.
  query = injectGetAiGeneratedImage({ imageId: ..., });

  // You can also pass in an options function (not object) of type `GetAiGeneratedImageOptions` to the Query injector function.
  options: GetAiGeneratedImageOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetAiGeneratedImage(this.getAiGeneratedImageVars, this.options);
}
```

## GetAIGeneratedGIF
You can execute the `GetAIGeneratedGIF` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetAiGeneratedGif(args: GetAiGeneratedGifArgs, options?: GetAiGeneratedGifOptions, injector?: Injector): CreateDataConnectQueryResult<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
```

### Variables
The `GetAIGeneratedGIF` Query requires an argument of type `GetAiGeneratedGifVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAiGeneratedGifVariables {
  gifId: string;
}
```
### Return Type
Recall that calling the `GetAIGeneratedGIF` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetAIGeneratedGIF` Query is of type `GetAiGeneratedGifData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAiGeneratedGifData {
  aIGeneratedGIF?: {
    id: string;
    gifUrl?: string | null;
  } & AIGeneratedGIF_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetAIGeneratedGIF`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetAiGeneratedGifVariables } from '@firebasegen/default-connector';
import { injectGetAiGeneratedGif, GetAiGeneratedGifOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetAiGeneratedGif` Query requires an argument of type `GetAiGeneratedGifVariables`:
  getAiGeneratedGifVars: GetAiGeneratedGifVariables = {
    gifId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetAiGeneratedGif(this.getAiGeneratedGifVars);
  // Variables can be defined inline as well.
  query = injectGetAiGeneratedGif({ gifId: ..., });

  // You can also pass in an options function (not object) of type `GetAiGeneratedGifOptions` to the Query injector function.
  options: GetAiGeneratedGifOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetAiGeneratedGif(this.getAiGeneratedGifVars, this.options);
}
```

## GetPayment
You can execute the `GetPayment` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetPayment(args: GetPaymentArgs, options?: GetPaymentOptions, injector?: Injector): CreateDataConnectQueryResult<GetPaymentData, GetPaymentVariables>;
```

### Variables
The `GetPayment` Query requires an argument of type `GetPaymentVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetPaymentVariables {
  paymentId: string;
}
```
### Return Type
Recall that calling the `GetPayment` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetPayment` Query is of type `GetPaymentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetPaymentData {
  payment?: {
    id: string;
    amount?: number | null;
    status: string;
    paymentDate: TimestampString;
  } & Payment_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetPayment`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetPaymentVariables } from '@firebasegen/default-connector';
import { injectGetPayment, GetPaymentOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetPayment` Query requires an argument of type `GetPaymentVariables`:
  getPaymentVars: GetPaymentVariables = {
    paymentId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetPayment(this.getPaymentVars);
  // Variables can be defined inline as well.
  query = injectGetPayment({ paymentId: ..., });

  // You can also pass in an options function (not object) of type `GetPaymentOptions` to the Query injector function.
  options: GetPaymentOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetPayment(this.getPaymentVars, this.options);
}
```

## GetAdminAction
You can execute the `GetAdminAction` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetAdminAction(args: GetAdminActionArgs, options?: GetAdminActionOptions, injector?: Injector): CreateDataConnectQueryResult<GetAdminActionData, GetAdminActionVariables>;
```

### Variables
The `GetAdminAction` Query requires an argument of type `GetAdminActionVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAdminActionVariables {
  actionId: string;
}
```
### Return Type
Recall that calling the `GetAdminAction` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetAdminAction` Query is of type `GetAdminActionData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAdminActionData {
  adminAction?: {
    id: string;
    actionType: string;
    targetId?: string | null;
    description?: string | null;
    actionDate: TimestampString;
  } & AdminAction_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetAdminAction`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetAdminActionVariables } from '@firebasegen/default-connector';
import { injectGetAdminAction, GetAdminActionOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetAdminAction` Query requires an argument of type `GetAdminActionVariables`:
  getAdminActionVars: GetAdminActionVariables = {
    actionId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetAdminAction(this.getAdminActionVars);
  // Variables can be defined inline as well.
  query = injectGetAdminAction({ actionId: ..., });

  // You can also pass in an options function (not object) of type `GetAdminActionOptions` to the Query injector function.
  options: GetAdminActionOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetAdminAction(this.getAdminActionVars, this.options);
}
```

## GetAnalyticsEntry
You can execute the `GetAnalyticsEntry` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetAnalyticsEntry(args: GetAnalyticsEntryArgs, options?: GetAnalyticsEntryOptions, injector?: Injector): CreateDataConnectQueryResult<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
```

### Variables
The `GetAnalyticsEntry` Query requires an argument of type `GetAnalyticsEntryVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAnalyticsEntryVariables {
  analyticsId: string;
}
```
### Return Type
Recall that calling the `GetAnalyticsEntry` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetAnalyticsEntry` Query is of type `GetAnalyticsEntryData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAnalyticsEntryData {
  analytics?: {
    id: string;
    action: string;
    actionTimestamp: TimestampString;
  } & Analytics_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetAnalyticsEntry`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetAnalyticsEntryVariables } from '@firebasegen/default-connector';
import { injectGetAnalyticsEntry, GetAnalyticsEntryOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetAnalyticsEntry` Query requires an argument of type `GetAnalyticsEntryVariables`:
  getAnalyticsEntryVars: GetAnalyticsEntryVariables = {
    analyticsId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetAnalyticsEntry(this.getAnalyticsEntryVars);
  // Variables can be defined inline as well.
  query = injectGetAnalyticsEntry({ analyticsId: ..., });

  // You can also pass in an options function (not object) of type `GetAnalyticsEntryOptions` to the Query injector function.
  options: GetAnalyticsEntryOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetAnalyticsEntry(this.getAnalyticsEntryVars, this.options);
}
```

## GetLegalDisclaimer
You can execute the `GetLegalDisclaimer` Query using the following Query injector, which is defined in [default-connector/angular/index.d.ts](./index.d.ts):

```javascript
injectGetLegalDisclaimer(args: GetLegalDisclaimerArgs, options?: GetLegalDisclaimerOptions, injector?: Injector): CreateDataConnectQueryResult<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
```

### Variables
The `GetLegalDisclaimer` Query requires an argument of type `GetLegalDisclaimerVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetLegalDisclaimerVariables {
  disclaimerId: string;
}
```
### Return Type
Recall that calling the `GetLegalDisclaimer` Query injector returns a `CreateDataConnectQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `CreateDataConnectQueryResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectQueryResult.isPending()`, `CreateDataConnectQueryResult.isSuccess()`, and `CreateDataConnectQueryResult.isError()` functions.

To access the data returned by a Query, use the `CreateDataConnectQueryResult.data()` function. The data for the `GetLegalDisclaimer` Query is of type `GetLegalDisclaimerData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetLegalDisclaimerData {
  legalDisclaimer?: {
    id: string;
    accepted: boolean;
    acceptedDate?: TimestampString | null;
    createdAt: TimestampString;
  } & LegalDisclaimer_Key;
}
```

To learn more about the `CreateDataConnectQueryResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectQuery) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectquery).

### Using `GetLegalDisclaimer`'s Query injector

```javascript
... // other imports
import { connectorConfig, GetLegalDisclaimerVariables } from '@firebasegen/default-connector';
import { injectGetLegalDisclaimer, GetLegalDisclaimerOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Query. -->
    @if (query.isPending()) {
      Loading...
    }
    @if (query.error()) {
      An error has occurred: {{ query.error() }}
    }
    <!-- If the Query is successful, you can access the data returned using
      the CreateDataConnectQueryResult.data() function. -->
    @if (query.data(); as data) {
      <!-- use your data to display something -->
            <div>Query successful!</div>
    }
  `,
})
export class MyComponent {
  // The `GetLegalDisclaimer` Query requires an argument of type `GetLegalDisclaimerVariables`:
  getLegalDisclaimerVars: GetLegalDisclaimerVariables = {
    disclaimerId: ..., 
  };

  // Since the execution of the query is eager, you don't have to call `execute` to "execute" the Query.
  // Call the Query injector function to get a `CreateDataConnectQueryResult` object which holds the state of your Query.
  query = injectGetLegalDisclaimer(this.getLegalDisclaimerVars);
  // Variables can be defined inline as well.
  query = injectGetLegalDisclaimer({ disclaimerId: ..., });

  // You can also pass in an options function (not object) of type `GetLegalDisclaimerOptions` to the Query injector function.
  options: GetLegalDisclaimerOptions = () => {
    return {
      staleTime: 5 * 1000
    };
  };
  query = injectGetLegalDisclaimer(this.getLegalDisclaimerVars, this.options);
}
```

# Mutations

The Angular generated SDK provides Mutations injectors that call [`injectDataConnectMutation`](https://react-query-firebase.invertase.dev/angular/data-connect/mutations) from TanStack Query Firebase.

Calling these injectors will return a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, and the most recent data returned by the Mutation, among other things. To learn more about these injectors and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/angular/data-connect/mutations).

Mutation injectors do not execute their Mutations automatically when called. Rather, after calling the Mutation injector and getting a `CreateDataConnectMutationResult` object, you must call the `CreateDataConnectMutationResult.mutate()` function to execute the Mutation.

To learn more about TanStack Angular Query's Mutations, see the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/guides/mutations).

## Using Mutation Injectors
Here's a general overview of how to use the generated Mutation injectors in your code:

- Mutation injectors are not called with the arguments to the Mutation. Instead, arguments are passed to `CreateDataConnectMutationResult.mutate()`.
- If the Mutation has no variables, the `mutate()` function does not require arguments.
- If the Mutation has any required variables, the `mutate()` function will require at least one argument: an object that contains all the required variables for the Mutation.
- If the Mutation has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Mutation's variables are optional, the Mutation injector does not require any arguments.
- The Angular generated SDK's Mutation injectors do not accept `DataConnect` instances as arguments.
- Mutation injector functions can be called with or without passing in an `options` argument, whose type is a function which returns an object. The type is generated alongside the operation's injector function in [default-connector/angular/index.d.ts](./index.d.ts). The type is generated alongside the operation's injector function. To learn more about the `options` argument, see the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/guides/mutations#mutation-side-effects).
  - `CreateDataConnectMutationResult.mutate()` also accepts an `options` argument. It's type is not a function which returns an object, but the object itself.
  - ***Special case:*** If the Mutation has no arguments (or all optional arguments and you wish to provide none), and you want to pass `options` to `CreateDataConnectMutationResult.mutate()`, you must pass `undefined` where you would normally pass the Mutation's arguments, and then may provide the options argument.

Below are examples of how to use the `default` connector's generated Mutation injectors to execute each Mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## CreateUserProfile
You can execute the `CreateUserProfile` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateUserProfile(options?: CreateUserProfileOptions, injector?: Injector): CreateDataConnectMutationResult<CreateUserProfileData, CreateUserProfileVariables, CreateUserProfileVariables>;
```

### Variables
The `CreateUserProfile` Mutation requires an argument of type `CreateUserProfileVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateUserProfileVariables {
  username: string;
  email: string;
  displayname: string;
  avatarUrl?: string | null;
}
```
### Return Type
Recall that calling the `CreateUserProfile` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateUserProfile` Mutation is of type `CreateUserProfileData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateUserProfileData {
  user_insert: User_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateUserProfile`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateUserProfileVariables } from '@firebasegen/default-connector';
import { injectCreateUserProfile, CreateUserProfileOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateUserProfile();

  // You can also pass in a `CreateUserProfileOptions` function (not object) to the Mutation injector function.
  options: CreateUserProfileOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateUserProfile(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateUserProfile` Mutation requires an argument of type `CreateUserProfileVariables`:
    const createUserProfileVars: CreateUserProfileVariables = {
      username: ..., 
      email: ..., 
      displayname: ..., 
      avatarUrl: ..., // optional
    };
    this.mutation.mutate(createUserProfileVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ username: ..., email: ..., displayname: ..., avatarUrl: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createUserProfileVars);

    // You can also pass in a `CreateUserProfileOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createUserProfileVars, this.options());
  }
}
```

## CreateStory
You can execute the `CreateStory` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateStory(options?: CreateStoryOptions, injector?: Injector): CreateDataConnectMutationResult<CreateStoryData, CreateStoryVariables, CreateStoryVariables>;
```

### Variables
The `CreateStory` Mutation requires an argument of type `CreateStoryVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateStoryVariables {
  creatorId: string;
  title?: string | null;
  genre?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
}
```
### Return Type
Recall that calling the `CreateStory` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateStory` Mutation is of type `CreateStoryData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateStoryData {
  story_insert: Story_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateStory`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateStoryVariables } from '@firebasegen/default-connector';
import { injectCreateStory, CreateStoryOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateStory();

  // You can also pass in a `CreateStoryOptions` function (not object) to the Mutation injector function.
  options: CreateStoryOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateStory(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateStory` Mutation requires an argument of type `CreateStoryVariables`:
    const createStoryVars: CreateStoryVariables = {
      creatorId: ..., 
      title: ..., // optional
      genre: ..., // optional
      description: ..., // optional
      coverImageUrl: ..., // optional
    };
    this.mutation.mutate(createStoryVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ creatorId: ..., title: ..., genre: ..., description: ..., coverImageUrl: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createStoryVars);

    // You can also pass in a `CreateStoryOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createStoryVars, this.options());
  }
}
```

## CreateStoryContent
You can execute the `CreateStoryContent` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateStoryContent(options?: CreateStoryContentOptions, injector?: Injector): CreateDataConnectMutationResult<CreateStoryContentData, CreateStoryContentVariables, CreateStoryContentVariables>;
```

### Variables
The `CreateStoryContent` Mutation requires an argument of type `CreateStoryContentVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateStoryContentVariables {
  storyId: string;
  textContent?: string | null;
  pageNumber?: number | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
}
```
### Return Type
Recall that calling the `CreateStoryContent` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateStoryContent` Mutation is of type `CreateStoryContentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateStoryContentData {
  storyContent_insert: StoryContent_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateStoryContent`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateStoryContentVariables } from '@firebasegen/default-connector';
import { injectCreateStoryContent, CreateStoryContentOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateStoryContent();

  // You can also pass in a `CreateStoryContentOptions` function (not object) to the Mutation injector function.
  options: CreateStoryContentOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateStoryContent(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateStoryContent` Mutation requires an argument of type `CreateStoryContentVariables`:
    const createStoryContentVars: CreateStoryContentVariables = {
      storyId: ..., 
      textContent: ..., // optional
      pageNumber: ..., // optional
      imageUrl: ..., // optional
      audioUrl: ..., // optional
    };
    this.mutation.mutate(createStoryContentVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ storyId: ..., textContent: ..., pageNumber: ..., imageUrl: ..., audioUrl: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createStoryContentVars);

    // You can also pass in a `CreateStoryContentOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createStoryContentVars, this.options());
  }
}
```

## CreateTemplate
You can execute the `CreateTemplate` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateTemplate(options?: CreateTemplateOptions, injector?: Injector): CreateDataConnectMutationResult<CreateTemplateData, CreateTemplateVariables, CreateTemplateVariables>;
```

### Variables
The `CreateTemplate` Mutation requires an argument of type `CreateTemplateVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateTemplateVariables {
  title: string;
  structureJson?: string | null;
  exampleStoryId?: string | null;
}
```
### Return Type
Recall that calling the `CreateTemplate` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateTemplate` Mutation is of type `CreateTemplateData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateTemplateData {
  template_insert: Template_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateTemplate`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateTemplateVariables } from '@firebasegen/default-connector';
import { injectCreateTemplate, CreateTemplateOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateTemplate();

  // You can also pass in a `CreateTemplateOptions` function (not object) to the Mutation injector function.
  options: CreateTemplateOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateTemplate(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateTemplate` Mutation requires an argument of type `CreateTemplateVariables`:
    const createTemplateVars: CreateTemplateVariables = {
      title: ..., 
      structureJson: ..., // optional
      exampleStoryId: ..., // optional
    };
    this.mutation.mutate(createTemplateVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ title: ..., structureJson: ..., exampleStoryId: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createTemplateVars);

    // You can also pass in a `CreateTemplateOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createTemplateVars, this.options());
  }
}
```

## CreateAIGeneratedImage
You can execute the `CreateAIGeneratedImage` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateAiGeneratedImage(options?: CreateAiGeneratedImageOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables, CreateAiGeneratedImageVariables>;
```

### Variables
The `CreateAIGeneratedImage` Mutation requires an argument of type `CreateAiGeneratedImageVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateAiGeneratedImageVariables {
  imageId: string;
  userId: string;
  promptText?: string | null;
  sketchUrl?: string | null;
  generatedImageUrl?: string | null;
}
```
### Return Type
Recall that calling the `CreateAIGeneratedImage` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateAIGeneratedImage` Mutation is of type `CreateAiGeneratedImageData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAiGeneratedImageData {
  aIGeneratedImage_insert: AIGeneratedImage_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateAIGeneratedImage`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateAiGeneratedImageVariables } from '@firebasegen/default-connector';
import { injectCreateAiGeneratedImage, CreateAiGeneratedImageOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateAiGeneratedImage();

  // You can also pass in a `CreateAiGeneratedImageOptions` function (not object) to the Mutation injector function.
  options: CreateAiGeneratedImageOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateAiGeneratedImage(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateAiGeneratedImage` Mutation requires an argument of type `CreateAiGeneratedImageVariables`:
    const createAiGeneratedImageVars: CreateAiGeneratedImageVariables = {
      imageId: ..., 
      userId: ..., 
      promptText: ..., // optional
      sketchUrl: ..., // optional
      generatedImageUrl: ..., // optional
    };
    this.mutation.mutate(createAiGeneratedImageVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ imageId: ..., userId: ..., promptText: ..., sketchUrl: ..., generatedImageUrl: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createAiGeneratedImageVars);

    // You can also pass in a `CreateAiGeneratedImageOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createAiGeneratedImageVars, this.options());
  }
}
```

## CreateAIGeneratedGIF
You can execute the `CreateAIGeneratedGIF` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateAiGeneratedGif(options?: CreateAiGeneratedGifOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables, CreateAiGeneratedGifVariables>;
```

### Variables
The `CreateAIGeneratedGIF` Mutation requires an argument of type `CreateAiGeneratedGifVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateAiGeneratedGifVariables {
  imageId: string;
  gifUrl: string;
}
```
### Return Type
Recall that calling the `CreateAIGeneratedGIF` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateAIGeneratedGIF` Mutation is of type `CreateAiGeneratedGifData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAiGeneratedGifData {
  aIGeneratedGIF_insert: AIGeneratedGIF_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateAIGeneratedGIF`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateAiGeneratedGifVariables } from '@firebasegen/default-connector';
import { injectCreateAiGeneratedGif, CreateAiGeneratedGifOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateAiGeneratedGif();

  // You can also pass in a `CreateAiGeneratedGifOptions` function (not object) to the Mutation injector function.
  options: CreateAiGeneratedGifOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateAiGeneratedGif(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateAiGeneratedGif` Mutation requires an argument of type `CreateAiGeneratedGifVariables`:
    const createAiGeneratedGifVars: CreateAiGeneratedGifVariables = {
      imageId: ..., 
      gifUrl: ..., 
    };
    this.mutation.mutate(createAiGeneratedGifVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ imageId: ..., gifUrl: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createAiGeneratedGifVars);

    // You can also pass in a `CreateAiGeneratedGifOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createAiGeneratedGifVars, this.options());
  }
}
```

## CreatePayment
You can execute the `CreatePayment` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreatePayment(options?: CreatePaymentOptions, injector?: Injector): CreateDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables, CreatePaymentVariables>;
```

### Variables
The `CreatePayment` Mutation requires an argument of type `CreatePaymentVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreatePaymentVariables {
  userId: string;
  appSubscriptionId: string;
  amount: number;
}
```
### Return Type
Recall that calling the `CreatePayment` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreatePayment` Mutation is of type `CreatePaymentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreatePaymentData {
  payment_insert: Payment_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreatePayment`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreatePaymentVariables } from '@firebasegen/default-connector';
import { injectCreatePayment, CreatePaymentOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreatePayment();

  // You can also pass in a `CreatePaymentOptions` function (not object) to the Mutation injector function.
  options: CreatePaymentOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreatePayment(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreatePayment` Mutation requires an argument of type `CreatePaymentVariables`:
    const createPaymentVars: CreatePaymentVariables = {
      userId: ..., 
      appSubscriptionId: ..., 
      amount: ..., 
    };
    this.mutation.mutate(createPaymentVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ userId: ..., appSubscriptionId: ..., amount: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createPaymentVars);

    // You can also pass in a `CreatePaymentOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createPaymentVars, this.options());
  }
}
```

## CreateAdminAction
You can execute the `CreateAdminAction` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateAdminAction(options?: CreateAdminActionOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAdminActionData, CreateAdminActionVariables, CreateAdminActionVariables>;
```

### Variables
The `CreateAdminAction` Mutation requires an argument of type `CreateAdminActionVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateAdminActionVariables {
  adminId: string;
  actionType: string;
  targetId?: string | null;
  description?: string | null;
}
```
### Return Type
Recall that calling the `CreateAdminAction` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateAdminAction` Mutation is of type `CreateAdminActionData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAdminActionData {
  adminAction_insert: AdminAction_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateAdminAction`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateAdminActionVariables } from '@firebasegen/default-connector';
import { injectCreateAdminAction, CreateAdminActionOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateAdminAction();

  // You can also pass in a `CreateAdminActionOptions` function (not object) to the Mutation injector function.
  options: CreateAdminActionOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateAdminAction(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateAdminAction` Mutation requires an argument of type `CreateAdminActionVariables`:
    const createAdminActionVars: CreateAdminActionVariables = {
      adminId: ..., 
      actionType: ..., 
      targetId: ..., // optional
      description: ..., // optional
    };
    this.mutation.mutate(createAdminActionVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ adminId: ..., actionType: ..., targetId: ..., description: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createAdminActionVars);

    // You can also pass in a `CreateAdminActionOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createAdminActionVars, this.options());
  }
}
```

## CreateAnalyticsEntry
You can execute the `CreateAnalyticsEntry` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectCreateAnalyticsEntry(options?: CreateAnalyticsEntryOptions, injector?: Injector): CreateDataConnectMutationResult<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables, CreateAnalyticsEntryVariables>;
```

### Variables
The `CreateAnalyticsEntry` Mutation requires an argument of type `CreateAnalyticsEntryVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface CreateAnalyticsEntryVariables {
  userId: string;
  storyId: string;
  action: string;
}
```
### Return Type
Recall that calling the `CreateAnalyticsEntry` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `CreateAnalyticsEntry` Mutation is of type `CreateAnalyticsEntryData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAnalyticsEntryData {
  analytics_insert: Analytics_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `CreateAnalyticsEntry`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, CreateAnalyticsEntryVariables } from '@firebasegen/default-connector';
import { injectCreateAnalyticsEntry, CreateAnalyticsEntryOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectCreateAnalyticsEntry();

  // You can also pass in a `CreateAnalyticsEntryOptions` function (not object) to the Mutation injector function.
  options: CreateAnalyticsEntryOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectCreateAnalyticsEntry(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `CreateAnalyticsEntry` Mutation requires an argument of type `CreateAnalyticsEntryVariables`:
    const createAnalyticsEntryVars: CreateAnalyticsEntryVariables = {
      userId: ..., 
      storyId: ..., 
      action: ..., 
    };
    this.mutation.mutate(createAnalyticsEntryVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ userId: ..., storyId: ..., action: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(createAnalyticsEntryVars);

    // You can also pass in a `CreateAnalyticsEntryOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(createAnalyticsEntryVars, this.options());
  }
}
```

## LogLegalDisclaimerAcceptance
You can execute the `LogLegalDisclaimerAcceptance` Mutation using the `CreateDataConnectMutationResult` object returned by the following Mutation injector (which is defined in [default-connector/angular/index.d.ts](./index.d.ts)):
```javascript
injectLogLegalDisclaimerAcceptance(options?: LogLegalDisclaimerAcceptanceOptions, injector?: Injector): CreateDataConnectMutationResult<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables, LogLegalDisclaimerAcceptanceVariables>;
```

### Variables
The `LogLegalDisclaimerAcceptance` Mutation requires an argument of type `LogLegalDisclaimerAcceptanceVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface LogLegalDisclaimerAcceptanceVariables {
  userId: string;
}
```
### Return Type
Recall that calling the `LogLegalDisclaimerAcceptance` Mutation injector returns a `CreateDataConnectMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `CreateDataConnectMutationResult.status()` function. You can also check for pending / success / error status using the `CreateDataConnectMutationResult.isPending()`, `CreateDataConnectMutationResult.isSuccess()`, and `CreateDataConnectMutationResult.isError()` functions.

To execute the Mutation, call `CreateDataConnectMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation. 

To access the data returned by a Mutation, use the `CreateDataConnectMutationResult.data()` function. The data for the `LogLegalDisclaimerAcceptance` Mutation is of type `LogLegalDisclaimerAcceptanceData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface LogLegalDisclaimerAcceptanceData {
  legalDisclaimer_insert: LegalDisclaimer_Key;
}
```

You can also call `CreateDataConnectMutationResult.mutateAsync()`, which executes the Mutation and returns a promise with the data returned from the Mutation. To learn more, see the [TanStack Angular Query documentation](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations#promises).

To learn more about the `CreateDataConnectMutationResult` object, see the [TanStack Query Firebase documentation](https://docs.page/invertase/tanstack-query-firebase/angular/data-connect/functions/injectDataConnectMutation) and the [TanStack Angular Query documentation](https://tanstack.com/query/v5/docs/framework/angular/reference/functions/injectmutation).

### Using `LogLegalDisclaimerAcceptance`'s Mutation injector

```javascript
... // other imports
import { connectorConfig, LogLegalDisclaimerAcceptanceVariables } from '@firebasegen/default-connector';
import { injectLogLegalDisclaimerAcceptance, LogLegalDisclaimerAcceptanceOptions } from '@firebasegen/default-connector/angular'
import { DataConnect } from '@angular/fire/data-connect';
import { initializeApp } from '@angular/fire/app';

@Component({
  ... // other component fields
  template: `
    <!-- You can render your component dynamically based on the status of the Mutation. -->
    @if (mutation.isPending()) {
      Loading...
    }
    @if (mutation.error()) {
      An error has occurred: {{ mutation.error() }}
    }
    <!-- If the Mutation is successful, you can access the data returned using
      the CreateDataConnectMutationResult.data() function. -->
    @if (mutation.data(); as data) {
      <!-- Use your data to display something -->
      <div>Mutation successful!</div>
    }
    <!-- Let's create a button that executes our mutation when clicked. -->
    <button
      (disabled)="mutation.isPending()"
      (click)="executeMutation()"
    >
      {{ mutation.isPending() ? 'Pending...' : 'Mutate!' }}
    </button>
  `,
})
export class MyComponent {
  // Call the Mutation injector function to get a `CreateDataConnectMutationResult` object which holds the state of your Mutation.
  mutation = injectLogLegalDisclaimerAcceptance();

  // You can also pass in a `LogLegalDisclaimerAcceptanceOptions` function (not object) to the Mutation injector function.
  options: LogLegalDisclaimerAcceptanceOptions = () => {
    return {
      onSuccess: () => { console.log('Mutation succeeded!'); }
    };
  };
  mutation = injectLogLegalDisclaimerAcceptance(this.options);

  // After calling the Mutation injector function, you must call `CreateDataConnectMutationResult.mutate()` to execute the Mutation.
  executeMutation() {
    // The `LogLegalDisclaimerAcceptance` Mutation requires an argument of type `LogLegalDisclaimerAcceptanceVariables`:
    const logLegalDisclaimerAcceptanceVars: LogLegalDisclaimerAcceptanceVariables = {
      userId: ..., 
    };
    this.mutation.mutate(logLegalDisclaimerAcceptanceVars);
    // Variables can be defined inline as well.
    this.mutation.mutate({ userId: ..., });

    // You can call `CreateDataConnectMutationResult.mutateAsync()` to execute the Mutation and return a promise with the data returned from the Mutation.
    this.mutation.mutateAsync(logLegalDisclaimerAcceptanceVars);

    // You can also pass in a `LogLegalDisclaimerAcceptanceOptions` object (not function) to `CreateDataConnectMutationResult.mutate()`.
    this.mutation.mutate(logLegalDisclaimerAcceptanceVars, this.options());
  }
}
```

