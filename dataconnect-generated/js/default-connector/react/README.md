# Table of Contents
- [**Overview**](#generated-react-readme)
- [**TanStack Query Firebase & TanStack React Query**](#tanstack-query-firebase-tanstack-react-query)
  - [*Package Installation*](#installing-tanstack-query-firebase-and-tanstack-react-query-packages)
  - [*Configuring TanStack Query*](#configuring-tanstack-query)
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

# Generated React README
This README will guide you through the process of using the generated React SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@firebasegen/default-connector/react` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#react).

# TanStack Query Firebase & TanStack React Query
This SDK provides [React](https://react.dev/) hooks generated specific to your application, for the operations found in the connector `default`. These hooks are generated using [TanStack Query Firebase](https://react-query-firebase.invertase.dev/) by our partners at Invertase, a library built on top of [TanStack React Query v5](https://tanstack.com/query/v5/docs/framework/react/overview).

***You do not need to be familiar with Tanstack Query or Tanstack Query Firebase to use this SDK.*** However, you may find it useful to learn more about them, as they will empower you as a user of this Generated React SDK.

## Installing TanStack Query Firebase and TanStack React Query Packages
In order to use the React generated SDK, you must install the `TanStack React Query` and `TanStack Query Firebase` packages.
```bash
npm i --save @tanstack/react-query @tanstack-query-firebase/react
```
```bash
npm i --save firebase@latest # Note: React has a peer dependency on ^11.3.0
```

You can also follow the installation instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#tanstack-install), or the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react) and [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/installation).

## Configuring TanStack Query
In order to use the React generated SDK in your application, you must wrap your application's component tree in a `QueryClientProvider` component from TanStack React Query. None of your generated React SDK hooks will work without this provider.

```javascript
import { QueryClientProvider } from '@tanstack/react-query';

// Create a TanStack Query client instance
const queryClient = new QueryClient()

function App() {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>
      <MyApplication />
    </QueryClientProvider>
  )
}
```

To learn more about `QueryClientProvider`, see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/quick-start) and the [TanStack Query Firebase documentation](https://invertase.docs.page/tanstack-query-firebase/react#usage).

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

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#emulator-react-angular).

```javascript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) using the hooks provided from your generated React SDK.

# Queries

The React generated SDK provides Query hook functions that call and return [`useDataConnectQuery`](https://react-query-firebase.invertase.dev/react/data-connect/querying) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and the most recent data returned by the Query, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/querying).

TanStack React Query caches the results of your Queries, so using the same Query hook function in multiple places in your application allows the entire application to automatically see updates to that Query's data.

Query hooks execute their Queries automatically when called, and periodically refresh, unless you change the `queryOptions` for the Query. To learn how to stop a Query from automatically executing, including how to make a query "lazy", see the [TanStack React Query documentation](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

To learn more about TanStack React Query's Queries, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/queries).

## Using Query Hooks
Here's a general overview of how to use the generated Query hooks in your code:

- If the Query has no variables, the Query hook function does not require arguments.
- If the Query has any required variables, the Query hook function will require at least one argument: an object that contains all the required variables for the Query.
- If the Query has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Query's variables are optional, the Query hook function does not require any arguments.
- Query hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Query hooks functions can be called with or without passing in an `options` argument of type `useDataConnectQueryOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/query-options).
  - ***Special case:***  If the Query has all optional variables and you would like to provide an `options` argument to the Query hook function without providing any variables, you must pass `undefined` where you would normally pass the Query's variables, and then may provide the `options` argument.

Below are examples of how to use the `default` connector's generated Query hook functions to execute each Query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## GetUserProfile
You can execute the `GetUserProfile` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetUserProfile(dc: DataConnect, vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetUserProfile(vars: GetUserProfileVariables, options?: useDataConnectQueryOptions<GetUserProfileData>): UseDataConnectQueryResult<GetUserProfileData, GetUserProfileVariables>;
```

### Variables
The `GetUserProfile` Query requires an argument of type `GetUserProfileVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetUserProfileVariables {
  userId: string;
}
```
### Return Type
Recall that calling the `GetUserProfile` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetUserProfile` Query is of type `GetUserProfileData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetUserProfile`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetUserProfileVariables } from '@firebasegen/default-connector';
import { useGetUserProfile } from '@firebasegen/default-connector/react'

export default function GetUserProfileComponent() {
  // The `useGetUserProfile` Query hook requires an argument of type `GetUserProfileVariables`:
  const getUserProfileVars: GetUserProfileVariables = {
    userId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetUserProfile(getUserProfileVars);
  // Variables can be defined inline as well.
  const query = useGetUserProfile({ userId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetUserProfile(dataConnect, getUserProfileVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetUserProfile(getUserProfileVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetUserProfile(dataConnect, getUserProfileVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.user);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetStoryWithContent
You can execute the `GetStoryWithContent` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetStoryWithContent(dc: DataConnect, vars: GetStoryWithContentVariables, options?: useDataConnectQueryOptions<GetStoryWithContentData>): UseDataConnectQueryResult<GetStoryWithContentData, GetStoryWithContentVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetStoryWithContent(vars: GetStoryWithContentVariables, options?: useDataConnectQueryOptions<GetStoryWithContentData>): UseDataConnectQueryResult<GetStoryWithContentData, GetStoryWithContentVariables>;
```

### Variables
The `GetStoryWithContent` Query requires an argument of type `GetStoryWithContentVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetStoryWithContentVariables {
  storyId: string;
}
```
### Return Type
Recall that calling the `GetStoryWithContent` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetStoryWithContent` Query is of type `GetStoryWithContentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetStoryWithContent`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetStoryWithContentVariables } from '@firebasegen/default-connector';
import { useGetStoryWithContent } from '@firebasegen/default-connector/react'

export default function GetStoryWithContentComponent() {
  // The `useGetStoryWithContent` Query hook requires an argument of type `GetStoryWithContentVariables`:
  const getStoryWithContentVars: GetStoryWithContentVariables = {
    storyId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetStoryWithContent(getStoryWithContentVars);
  // Variables can be defined inline as well.
  const query = useGetStoryWithContent({ storyId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetStoryWithContent(dataConnect, getStoryWithContentVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoryWithContent(getStoryWithContentVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetStoryWithContent(dataConnect, getStoryWithContentVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.story);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAllStories
You can execute the `GetAllStories` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetAllStories(dc: DataConnect, options?: useDataConnectQueryOptions<GetAllStoriesData>): UseDataConnectQueryResult<GetAllStoriesData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAllStories(options?: useDataConnectQueryOptions<GetAllStoriesData>): UseDataConnectQueryResult<GetAllStoriesData, undefined>;
```

### Variables
The `GetAllStories` Query has no variables.
### Return Type
Recall that calling the `GetAllStories` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAllStories` Query is of type `GetAllStoriesData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAllStories`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';
import { useGetAllStories } from '@firebasegen/default-connector/react'

export default function GetAllStoriesComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAllStories();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAllStories(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAllStories(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAllStories(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.stories);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAppSubscription
You can execute the `GetAppSubscription` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetAppSubscription(dc: DataConnect, vars: GetAppSubscriptionVariables, options?: useDataConnectQueryOptions<GetAppSubscriptionData>): UseDataConnectQueryResult<GetAppSubscriptionData, GetAppSubscriptionVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAppSubscription(vars: GetAppSubscriptionVariables, options?: useDataConnectQueryOptions<GetAppSubscriptionData>): UseDataConnectQueryResult<GetAppSubscriptionData, GetAppSubscriptionVariables>;
```

### Variables
The `GetAppSubscription` Query requires an argument of type `GetAppSubscriptionVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAppSubscriptionVariables {
  subscriptionId: string;
}
```
### Return Type
Recall that calling the `GetAppSubscription` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAppSubscription` Query is of type `GetAppSubscriptionData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAppSubscription`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAppSubscriptionVariables } from '@firebasegen/default-connector';
import { useGetAppSubscription } from '@firebasegen/default-connector/react'

export default function GetAppSubscriptionComponent() {
  // The `useGetAppSubscription` Query hook requires an argument of type `GetAppSubscriptionVariables`:
  const getAppSubscriptionVars: GetAppSubscriptionVariables = {
    subscriptionId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAppSubscription(getAppSubscriptionVars);
  // Variables can be defined inline as well.
  const query = useGetAppSubscription({ subscriptionId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAppSubscription(dataConnect, getAppSubscriptionVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAppSubscription(getAppSubscriptionVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAppSubscription(dataConnect, getAppSubscriptionVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.appSubscription);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetTemplate
You can execute the `GetTemplate` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetTemplate(dc: DataConnect, vars: GetTemplateVariables, options?: useDataConnectQueryOptions<GetTemplateData>): UseDataConnectQueryResult<GetTemplateData, GetTemplateVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetTemplate(vars: GetTemplateVariables, options?: useDataConnectQueryOptions<GetTemplateData>): UseDataConnectQueryResult<GetTemplateData, GetTemplateVariables>;
```

### Variables
The `GetTemplate` Query requires an argument of type `GetTemplateVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetTemplateVariables {
  templateId: string;
}
```
### Return Type
Recall that calling the `GetTemplate` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetTemplate` Query is of type `GetTemplateData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetTemplateData {
  template?: {
    id: string;
    title?: string | null;
    structureJson?: string | null;
  } & Template_Key;
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetTemplate`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetTemplateVariables } from '@firebasegen/default-connector';
import { useGetTemplate } from '@firebasegen/default-connector/react'

export default function GetTemplateComponent() {
  // The `useGetTemplate` Query hook requires an argument of type `GetTemplateVariables`:
  const getTemplateVars: GetTemplateVariables = {
    templateId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetTemplate(getTemplateVars);
  // Variables can be defined inline as well.
  const query = useGetTemplate({ templateId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetTemplate(dataConnect, getTemplateVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetTemplate(getTemplateVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetTemplate(dataConnect, getTemplateVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.template);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAllTemplates
You can execute the `GetAllTemplates` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetAllTemplates(dc: DataConnect, options?: useDataConnectQueryOptions<GetAllTemplatesData>): UseDataConnectQueryResult<GetAllTemplatesData, undefined>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAllTemplates(options?: useDataConnectQueryOptions<GetAllTemplatesData>): UseDataConnectQueryResult<GetAllTemplatesData, undefined>;
```

### Variables
The `GetAllTemplates` Query has no variables.
### Return Type
Recall that calling the `GetAllTemplates` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAllTemplates` Query is of type `GetAllTemplatesData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAllTemplatesData {
  templates: ({
    id: string;
    title?: string | null;
  } & Template_Key)[];
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAllTemplates`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';
import { useGetAllTemplates } from '@firebasegen/default-connector/react'

export default function GetAllTemplatesComponent() {
  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAllTemplates();

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAllTemplates(dataConnect);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAllTemplates(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAllTemplates(dataConnect, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.templates);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAIGeneratedImage
You can execute the `GetAIGeneratedImage` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetAiGeneratedImage(dc: DataConnect, vars: GetAiGeneratedImageVariables, options?: useDataConnectQueryOptions<GetAiGeneratedImageData>): UseDataConnectQueryResult<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAiGeneratedImage(vars: GetAiGeneratedImageVariables, options?: useDataConnectQueryOptions<GetAiGeneratedImageData>): UseDataConnectQueryResult<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
```

### Variables
The `GetAIGeneratedImage` Query requires an argument of type `GetAiGeneratedImageVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAiGeneratedImageVariables {
  imageId: string;
}
```
### Return Type
Recall that calling the `GetAIGeneratedImage` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAIGeneratedImage` Query is of type `GetAiGeneratedImageData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAIGeneratedImage`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAiGeneratedImageVariables } from '@firebasegen/default-connector';
import { useGetAiGeneratedImage } from '@firebasegen/default-connector/react'

export default function GetAiGeneratedImageComponent() {
  // The `useGetAiGeneratedImage` Query hook requires an argument of type `GetAiGeneratedImageVariables`:
  const getAiGeneratedImageVars: GetAiGeneratedImageVariables = {
    imageId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAiGeneratedImage(getAiGeneratedImageVars);
  // Variables can be defined inline as well.
  const query = useGetAiGeneratedImage({ imageId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAiGeneratedImage(dataConnect, getAiGeneratedImageVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAiGeneratedImage(getAiGeneratedImageVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAiGeneratedImage(dataConnect, getAiGeneratedImageVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.aIGeneratedImage);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAIGeneratedGIF
You can execute the `GetAIGeneratedGIF` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetAiGeneratedGif(dc: DataConnect, vars: GetAiGeneratedGifVariables, options?: useDataConnectQueryOptions<GetAiGeneratedGifData>): UseDataConnectQueryResult<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAiGeneratedGif(vars: GetAiGeneratedGifVariables, options?: useDataConnectQueryOptions<GetAiGeneratedGifData>): UseDataConnectQueryResult<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
```

### Variables
The `GetAIGeneratedGIF` Query requires an argument of type `GetAiGeneratedGifVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAiGeneratedGifVariables {
  gifId: string;
}
```
### Return Type
Recall that calling the `GetAIGeneratedGIF` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAIGeneratedGIF` Query is of type `GetAiGeneratedGifData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAiGeneratedGifData {
  aIGeneratedGIF?: {
    id: string;
    gifUrl?: string | null;
  } & AIGeneratedGIF_Key;
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAIGeneratedGIF`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAiGeneratedGifVariables } from '@firebasegen/default-connector';
import { useGetAiGeneratedGif } from '@firebasegen/default-connector/react'

export default function GetAiGeneratedGifComponent() {
  // The `useGetAiGeneratedGif` Query hook requires an argument of type `GetAiGeneratedGifVariables`:
  const getAiGeneratedGifVars: GetAiGeneratedGifVariables = {
    gifId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAiGeneratedGif(getAiGeneratedGifVars);
  // Variables can be defined inline as well.
  const query = useGetAiGeneratedGif({ gifId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAiGeneratedGif(dataConnect, getAiGeneratedGifVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAiGeneratedGif(getAiGeneratedGifVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAiGeneratedGif(dataConnect, getAiGeneratedGifVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.aIGeneratedGIF);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetPayment
You can execute the `GetPayment` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetPayment(dc: DataConnect, vars: GetPaymentVariables, options?: useDataConnectQueryOptions<GetPaymentData>): UseDataConnectQueryResult<GetPaymentData, GetPaymentVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetPayment(vars: GetPaymentVariables, options?: useDataConnectQueryOptions<GetPaymentData>): UseDataConnectQueryResult<GetPaymentData, GetPaymentVariables>;
```

### Variables
The `GetPayment` Query requires an argument of type `GetPaymentVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetPaymentVariables {
  paymentId: string;
}
```
### Return Type
Recall that calling the `GetPayment` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetPayment` Query is of type `GetPaymentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetPayment`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetPaymentVariables } from '@firebasegen/default-connector';
import { useGetPayment } from '@firebasegen/default-connector/react'

export default function GetPaymentComponent() {
  // The `useGetPayment` Query hook requires an argument of type `GetPaymentVariables`:
  const getPaymentVars: GetPaymentVariables = {
    paymentId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetPayment(getPaymentVars);
  // Variables can be defined inline as well.
  const query = useGetPayment({ paymentId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetPayment(dataConnect, getPaymentVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetPayment(getPaymentVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetPayment(dataConnect, getPaymentVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.payment);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAdminAction
You can execute the `GetAdminAction` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetAdminAction(dc: DataConnect, vars: GetAdminActionVariables, options?: useDataConnectQueryOptions<GetAdminActionData>): UseDataConnectQueryResult<GetAdminActionData, GetAdminActionVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAdminAction(vars: GetAdminActionVariables, options?: useDataConnectQueryOptions<GetAdminActionData>): UseDataConnectQueryResult<GetAdminActionData, GetAdminActionVariables>;
```

### Variables
The `GetAdminAction` Query requires an argument of type `GetAdminActionVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAdminActionVariables {
  actionId: string;
}
```
### Return Type
Recall that calling the `GetAdminAction` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAdminAction` Query is of type `GetAdminActionData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAdminAction`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAdminActionVariables } from '@firebasegen/default-connector';
import { useGetAdminAction } from '@firebasegen/default-connector/react'

export default function GetAdminActionComponent() {
  // The `useGetAdminAction` Query hook requires an argument of type `GetAdminActionVariables`:
  const getAdminActionVars: GetAdminActionVariables = {
    actionId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAdminAction(getAdminActionVars);
  // Variables can be defined inline as well.
  const query = useGetAdminAction({ actionId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAdminAction(dataConnect, getAdminActionVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAdminAction(getAdminActionVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAdminAction(dataConnect, getAdminActionVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.adminAction);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetAnalyticsEntry
You can execute the `GetAnalyticsEntry` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetAnalyticsEntry(dc: DataConnect, vars: GetAnalyticsEntryVariables, options?: useDataConnectQueryOptions<GetAnalyticsEntryData>): UseDataConnectQueryResult<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetAnalyticsEntry(vars: GetAnalyticsEntryVariables, options?: useDataConnectQueryOptions<GetAnalyticsEntryData>): UseDataConnectQueryResult<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
```

### Variables
The `GetAnalyticsEntry` Query requires an argument of type `GetAnalyticsEntryVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetAnalyticsEntryVariables {
  analyticsId: string;
}
```
### Return Type
Recall that calling the `GetAnalyticsEntry` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetAnalyticsEntry` Query is of type `GetAnalyticsEntryData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface GetAnalyticsEntryData {
  analytics?: {
    id: string;
    action: string;
    actionTimestamp: TimestampString;
  } & Analytics_Key;
}
```

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetAnalyticsEntry`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetAnalyticsEntryVariables } from '@firebasegen/default-connector';
import { useGetAnalyticsEntry } from '@firebasegen/default-connector/react'

export default function GetAnalyticsEntryComponent() {
  // The `useGetAnalyticsEntry` Query hook requires an argument of type `GetAnalyticsEntryVariables`:
  const getAnalyticsEntryVars: GetAnalyticsEntryVariables = {
    analyticsId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetAnalyticsEntry(getAnalyticsEntryVars);
  // Variables can be defined inline as well.
  const query = useGetAnalyticsEntry({ analyticsId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetAnalyticsEntry(dataConnect, getAnalyticsEntryVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetAnalyticsEntry(getAnalyticsEntryVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetAnalyticsEntry(dataConnect, getAnalyticsEntryVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.analytics);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## GetLegalDisclaimer
You can execute the `GetLegalDisclaimer` Query using the following Query hook function, which is defined in [default-connector/react/index.d.ts](./index.d.ts):

```javascript
useGetLegalDisclaimer(dc: DataConnect, vars: GetLegalDisclaimerVariables, options?: useDataConnectQueryOptions<GetLegalDisclaimerData>): UseDataConnectQueryResult<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
```
You can also pass in a `DataConnect` instance to the Query hook function.
```javascript
useGetLegalDisclaimer(vars: GetLegalDisclaimerVariables, options?: useDataConnectQueryOptions<GetLegalDisclaimerData>): UseDataConnectQueryResult<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
```

### Variables
The `GetLegalDisclaimer` Query requires an argument of type `GetLegalDisclaimerVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface GetLegalDisclaimerVariables {
  disclaimerId: string;
}
```
### Return Type
Recall that calling the `GetLegalDisclaimer` Query hook function returns a `UseQueryResult` object. This object holds the state of your Query, including whether the Query is loading, has completed, or has succeeded/failed, and any data returned by the Query, among other things.

To check the status of a Query, use the `UseQueryResult.status` field. You can also check for pending / success / error status using the `UseQueryResult.isPending`, `UseQueryResult.isSuccess`, and `UseQueryResult.isError` fields.

To access the data returned by a Query, use the `UseQueryResult.data` field. The data for the `GetLegalDisclaimer` Query is of type `GetLegalDisclaimerData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
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

To learn more about the `UseQueryResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery).

### Using `GetLegalDisclaimer`'s Query hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, GetLegalDisclaimerVariables } from '@firebasegen/default-connector';
import { useGetLegalDisclaimer } from '@firebasegen/default-connector/react'

export default function GetLegalDisclaimerComponent() {
  // The `useGetLegalDisclaimer` Query hook requires an argument of type `GetLegalDisclaimerVariables`:
  const getLegalDisclaimerVars: GetLegalDisclaimerVariables = {
    disclaimerId: ..., 
  };

  // You don't have to do anything to "execute" the Query.
  // Call the Query hook function to get a `UseQueryResult` object which holds the state of your Query.
  const query = useGetLegalDisclaimer(getLegalDisclaimerVars);
  // Variables can be defined inline as well.
  const query = useGetLegalDisclaimer({ disclaimerId: ..., });

  // You can also pass in a `DataConnect` instance to the Query hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const query = useGetLegalDisclaimer(dataConnect, getLegalDisclaimerVars);

  // You can also pass in a `useDataConnectQueryOptions` object to the Query hook function.
  const options = { staleTime: 5 * 1000 };
  const query = useGetLegalDisclaimer(getLegalDisclaimerVars, options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectQueryOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = { staleTime: 5 * 1000 };
  const query = useGetLegalDisclaimer(dataConnect, getLegalDisclaimerVars, options);

  // Then, you can render your component dynamically based on the status of the Query.
  if (query.isPending) {
    return <div>Loading...</div>;
  }

  if (query.isError) {
    return <div>Error: {query.error.message}</div>;
  }

  // If the Query is successful, you can access the data returned using the `UseQueryResult.data` field.
  if (query.isSuccess) {
    console.log(query.data.legalDisclaimer);
  }
  return <div>Query execution {query.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

# Mutations

The React generated SDK provides Mutations hook functions that call and return [`useDataConnectMutation`](https://react-query-firebase.invertase.dev/react/data-connect/mutations) hooks from TanStack Query Firebase.

Calling these hook functions will return a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, and the most recent data returned by the Mutation, among other things. To learn more about these hooks and how to use them, see the [TanStack Query Firebase documentation](https://react-query-firebase.invertase.dev/react/data-connect/mutations).

Mutation hooks do not execute their Mutations automatically when called. Rather, after calling the Mutation hook function and getting a `UseMutationResult` object, you must call the `UseMutationResult.mutate()` function to execute the Mutation.

To learn more about TanStack React Query's Mutations, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations).

## Using Mutation Hooks
Here's a general overview of how to use the generated Mutation hooks in your code:

- Mutation hook functions are not called with the arguments to the Mutation. Instead, arguments are passed to `UseMutationResult.mutate()`.
- If the Mutation has no variables, the `mutate()` function does not require arguments.
- If the Mutation has any required variables, the `mutate()` function will require at least one argument: an object that contains all the required variables for the Mutation.
- If the Mutation has some required and some optional variables, only required variables are necessary in the variables argument object, and optional variables may be provided as well.
- If all of the Mutation's variables are optional, the Mutation hook function does not require any arguments.
- Mutation hook functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.
- Mutation hooks also accept an `options` argument of type `useDataConnectMutationOptions`. To learn more about the `options` argument, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/guides/mutations#mutation-side-effects).
  - `UseMutationResult.mutate()` also accepts an `options` argument of type `useDataConnectMutationOptions`.
  - ***Special case:*** If the Mutation has no arguments (or all optional arguments and you wish to provide none), and you want to pass `options` to `UseMutationResult.mutate()`, you must pass `undefined` where you would normally pass the Mutation's arguments, and then may provide the options argument.

Below are examples of how to use the `default` connector's generated Mutation hook functions to execute each Mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#operations-react-angular).

## CreateUserProfile
You can execute the `CreateUserProfile` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateUserProfile(options?: useDataConnectMutationOptions<CreateUserProfileData, FirebaseError, CreateUserProfileVariables>): UseDataConnectMutationResult<CreateUserProfileData, CreateUserProfileVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateUserProfile(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserProfileData, FirebaseError, CreateUserProfileVariables>): UseDataConnectMutationResult<CreateUserProfileData, CreateUserProfileVariables>;
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
Recall that calling the `CreateUserProfile` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateUserProfile` Mutation is of type `CreateUserProfileData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateUserProfileData {
  user_insert: User_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateUserProfile`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateUserProfileVariables } from '@firebasegen/default-connector';
import { useCreateUserProfile } from '@firebasegen/default-connector/react'

export default function CreateUserProfileComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateUserProfile();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateUserProfile(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateUserProfile(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateUserProfile(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateUserProfile` Mutation requires an argument of type `CreateUserProfileVariables`:
  const createUserProfileVars: CreateUserProfileVariables = {
    username: ..., 
    email: ..., 
    displayname: ..., 
    avatarUrl: ..., // optional
  };
  mutation.mutate(createUserProfileVars);
  // Variables can be defined inline as well.
  mutation.mutate({ username: ..., email: ..., displayname: ..., avatarUrl: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createUserProfileVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.user_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateStory
You can execute the `CreateStory` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateStory(options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateStory(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoryData, FirebaseError, CreateStoryVariables>): UseDataConnectMutationResult<CreateStoryData, CreateStoryVariables>;
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
Recall that calling the `CreateStory` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateStory` Mutation is of type `CreateStoryData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateStoryData {
  story_insert: Story_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateStory`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateStoryVariables } from '@firebasegen/default-connector';
import { useCreateStory } from '@firebasegen/default-connector/react'

export default function CreateStoryComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateStory();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateStory(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStory(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStory(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateStory` Mutation requires an argument of type `CreateStoryVariables`:
  const createStoryVars: CreateStoryVariables = {
    creatorId: ..., 
    title: ..., // optional
    genre: ..., // optional
    description: ..., // optional
    coverImageUrl: ..., // optional
  };
  mutation.mutate(createStoryVars);
  // Variables can be defined inline as well.
  mutation.mutate({ creatorId: ..., title: ..., genre: ..., description: ..., coverImageUrl: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createStoryVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.story_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateStoryContent
You can execute the `CreateStoryContent` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateStoryContent(options?: useDataConnectMutationOptions<CreateStoryContentData, FirebaseError, CreateStoryContentVariables>): UseDataConnectMutationResult<CreateStoryContentData, CreateStoryContentVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateStoryContent(dc: DataConnect, options?: useDataConnectMutationOptions<CreateStoryContentData, FirebaseError, CreateStoryContentVariables>): UseDataConnectMutationResult<CreateStoryContentData, CreateStoryContentVariables>;
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
Recall that calling the `CreateStoryContent` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateStoryContent` Mutation is of type `CreateStoryContentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateStoryContentData {
  storyContent_insert: StoryContent_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateStoryContent`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateStoryContentVariables } from '@firebasegen/default-connector';
import { useCreateStoryContent } from '@firebasegen/default-connector/react'

export default function CreateStoryContentComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateStoryContent();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateStoryContent(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStoryContent(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateStoryContent(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateStoryContent` Mutation requires an argument of type `CreateStoryContentVariables`:
  const createStoryContentVars: CreateStoryContentVariables = {
    storyId: ..., 
    textContent: ..., // optional
    pageNumber: ..., // optional
    imageUrl: ..., // optional
    audioUrl: ..., // optional
  };
  mutation.mutate(createStoryContentVars);
  // Variables can be defined inline as well.
  mutation.mutate({ storyId: ..., textContent: ..., pageNumber: ..., imageUrl: ..., audioUrl: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createStoryContentVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.storyContent_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateTemplate
You can execute the `CreateTemplate` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateTemplate(options?: useDataConnectMutationOptions<CreateTemplateData, FirebaseError, CreateTemplateVariables>): UseDataConnectMutationResult<CreateTemplateData, CreateTemplateVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateTemplate(dc: DataConnect, options?: useDataConnectMutationOptions<CreateTemplateData, FirebaseError, CreateTemplateVariables>): UseDataConnectMutationResult<CreateTemplateData, CreateTemplateVariables>;
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
Recall that calling the `CreateTemplate` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateTemplate` Mutation is of type `CreateTemplateData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateTemplateData {
  template_insert: Template_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateTemplate`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateTemplateVariables } from '@firebasegen/default-connector';
import { useCreateTemplate } from '@firebasegen/default-connector/react'

export default function CreateTemplateComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateTemplate();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateTemplate(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateTemplate(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateTemplate(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateTemplate` Mutation requires an argument of type `CreateTemplateVariables`:
  const createTemplateVars: CreateTemplateVariables = {
    title: ..., 
    structureJson: ..., // optional
    exampleStoryId: ..., // optional
  };
  mutation.mutate(createTemplateVars);
  // Variables can be defined inline as well.
  mutation.mutate({ title: ..., structureJson: ..., exampleStoryId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createTemplateVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.template_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateAIGeneratedImage
You can execute the `CreateAIGeneratedImage` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateAiGeneratedImage(options?: useDataConnectMutationOptions<CreateAiGeneratedImageData, FirebaseError, CreateAiGeneratedImageVariables>): UseDataConnectMutationResult<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateAiGeneratedImage(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAiGeneratedImageData, FirebaseError, CreateAiGeneratedImageVariables>): UseDataConnectMutationResult<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
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
Recall that calling the `CreateAIGeneratedImage` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateAIGeneratedImage` Mutation is of type `CreateAiGeneratedImageData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAiGeneratedImageData {
  aIGeneratedImage_insert: AIGeneratedImage_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateAIGeneratedImage`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateAiGeneratedImageVariables } from '@firebasegen/default-connector';
import { useCreateAiGeneratedImage } from '@firebasegen/default-connector/react'

export default function CreateAiGeneratedImageComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateAiGeneratedImage();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateAiGeneratedImage(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAiGeneratedImage(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAiGeneratedImage(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateAiGeneratedImage` Mutation requires an argument of type `CreateAiGeneratedImageVariables`:
  const createAiGeneratedImageVars: CreateAiGeneratedImageVariables = {
    imageId: ..., 
    userId: ..., 
    promptText: ..., // optional
    sketchUrl: ..., // optional
    generatedImageUrl: ..., // optional
  };
  mutation.mutate(createAiGeneratedImageVars);
  // Variables can be defined inline as well.
  mutation.mutate({ imageId: ..., userId: ..., promptText: ..., sketchUrl: ..., generatedImageUrl: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createAiGeneratedImageVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.aIGeneratedImage_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateAIGeneratedGIF
You can execute the `CreateAIGeneratedGIF` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateAiGeneratedGif(options?: useDataConnectMutationOptions<CreateAiGeneratedGifData, FirebaseError, CreateAiGeneratedGifVariables>): UseDataConnectMutationResult<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateAiGeneratedGif(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAiGeneratedGifData, FirebaseError, CreateAiGeneratedGifVariables>): UseDataConnectMutationResult<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
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
Recall that calling the `CreateAIGeneratedGIF` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateAIGeneratedGIF` Mutation is of type `CreateAiGeneratedGifData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAiGeneratedGifData {
  aIGeneratedGIF_insert: AIGeneratedGIF_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateAIGeneratedGIF`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateAiGeneratedGifVariables } from '@firebasegen/default-connector';
import { useCreateAiGeneratedGif } from '@firebasegen/default-connector/react'

export default function CreateAiGeneratedGifComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateAiGeneratedGif();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateAiGeneratedGif(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAiGeneratedGif(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAiGeneratedGif(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateAiGeneratedGif` Mutation requires an argument of type `CreateAiGeneratedGifVariables`:
  const createAiGeneratedGifVars: CreateAiGeneratedGifVariables = {
    imageId: ..., 
    gifUrl: ..., 
  };
  mutation.mutate(createAiGeneratedGifVars);
  // Variables can be defined inline as well.
  mutation.mutate({ imageId: ..., gifUrl: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createAiGeneratedGifVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.aIGeneratedGIF_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreatePayment
You can execute the `CreatePayment` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreatePayment(options?: useDataConnectMutationOptions<CreatePaymentData, FirebaseError, CreatePaymentVariables>): UseDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreatePayment(dc: DataConnect, options?: useDataConnectMutationOptions<CreatePaymentData, FirebaseError, CreatePaymentVariables>): UseDataConnectMutationResult<CreatePaymentData, CreatePaymentVariables>;
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
Recall that calling the `CreatePayment` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreatePayment` Mutation is of type `CreatePaymentData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreatePaymentData {
  payment_insert: Payment_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreatePayment`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreatePaymentVariables } from '@firebasegen/default-connector';
import { useCreatePayment } from '@firebasegen/default-connector/react'

export default function CreatePaymentComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreatePayment();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreatePayment(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreatePayment(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreatePayment(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreatePayment` Mutation requires an argument of type `CreatePaymentVariables`:
  const createPaymentVars: CreatePaymentVariables = {
    userId: ..., 
    appSubscriptionId: ..., 
    amount: ..., 
  };
  mutation.mutate(createPaymentVars);
  // Variables can be defined inline as well.
  mutation.mutate({ userId: ..., appSubscriptionId: ..., amount: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createPaymentVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.payment_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateAdminAction
You can execute the `CreateAdminAction` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateAdminAction(options?: useDataConnectMutationOptions<CreateAdminActionData, FirebaseError, CreateAdminActionVariables>): UseDataConnectMutationResult<CreateAdminActionData, CreateAdminActionVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateAdminAction(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAdminActionData, FirebaseError, CreateAdminActionVariables>): UseDataConnectMutationResult<CreateAdminActionData, CreateAdminActionVariables>;
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
Recall that calling the `CreateAdminAction` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateAdminAction` Mutation is of type `CreateAdminActionData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAdminActionData {
  adminAction_insert: AdminAction_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateAdminAction`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateAdminActionVariables } from '@firebasegen/default-connector';
import { useCreateAdminAction } from '@firebasegen/default-connector/react'

export default function CreateAdminActionComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateAdminAction();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateAdminAction(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAdminAction(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAdminAction(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateAdminAction` Mutation requires an argument of type `CreateAdminActionVariables`:
  const createAdminActionVars: CreateAdminActionVariables = {
    adminId: ..., 
    actionType: ..., 
    targetId: ..., // optional
    description: ..., // optional
  };
  mutation.mutate(createAdminActionVars);
  // Variables can be defined inline as well.
  mutation.mutate({ adminId: ..., actionType: ..., targetId: ..., description: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createAdminActionVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.adminAction_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## CreateAnalyticsEntry
You can execute the `CreateAnalyticsEntry` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useCreateAnalyticsEntry(options?: useDataConnectMutationOptions<CreateAnalyticsEntryData, FirebaseError, CreateAnalyticsEntryVariables>): UseDataConnectMutationResult<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useCreateAnalyticsEntry(dc: DataConnect, options?: useDataConnectMutationOptions<CreateAnalyticsEntryData, FirebaseError, CreateAnalyticsEntryVariables>): UseDataConnectMutationResult<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
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
Recall that calling the `CreateAnalyticsEntry` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `CreateAnalyticsEntry` Mutation is of type `CreateAnalyticsEntryData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface CreateAnalyticsEntryData {
  analytics_insert: Analytics_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `CreateAnalyticsEntry`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, CreateAnalyticsEntryVariables } from '@firebasegen/default-connector';
import { useCreateAnalyticsEntry } from '@firebasegen/default-connector/react'

export default function CreateAnalyticsEntryComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useCreateAnalyticsEntry();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useCreateAnalyticsEntry(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAnalyticsEntry(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useCreateAnalyticsEntry(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useCreateAnalyticsEntry` Mutation requires an argument of type `CreateAnalyticsEntryVariables`:
  const createAnalyticsEntryVars: CreateAnalyticsEntryVariables = {
    userId: ..., 
    storyId: ..., 
    action: ..., 
  };
  mutation.mutate(createAnalyticsEntryVars);
  // Variables can be defined inline as well.
  mutation.mutate({ userId: ..., storyId: ..., action: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(createAnalyticsEntryVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.analytics_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

## LogLegalDisclaimerAcceptance
You can execute the `LogLegalDisclaimerAcceptance` Mutation using the `UseMutationResult` object returned by the following Mutation hook function (which is defined in [default-connector/react/index.d.ts](./index.d.ts)):
```javascript
useLogLegalDisclaimerAcceptance(options?: useDataConnectMutationOptions<LogLegalDisclaimerAcceptanceData, FirebaseError, LogLegalDisclaimerAcceptanceVariables>): UseDataConnectMutationResult<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
```
You can also pass in a `DataConnect` instance to the Mutation hook function.
```javascript
useLogLegalDisclaimerAcceptance(dc: DataConnect, options?: useDataConnectMutationOptions<LogLegalDisclaimerAcceptanceData, FirebaseError, LogLegalDisclaimerAcceptanceVariables>): UseDataConnectMutationResult<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
```

### Variables
The `LogLegalDisclaimerAcceptance` Mutation requires an argument of type `LogLegalDisclaimerAcceptanceVariables`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:

```javascript
export interface LogLegalDisclaimerAcceptanceVariables {
  userId: string;
}
```
### Return Type
Recall that calling the `LogLegalDisclaimerAcceptance` Mutation hook function returns a `UseMutationResult` object. This object holds the state of your Mutation, including whether the Mutation is loading, has completed, or has succeeded/failed, among other things.

To check the status of a Mutation, use the `UseMutationResult.status` field. You can also check for pending / success / error status using the `UseMutationResult.isPending`, `UseMutationResult.isSuccess`, and `UseMutationResult.isError` fields.

To execute the Mutation, call `UseMutationResult.mutate()`. This function executes the Mutation, but does not return the data from the Mutation.

To access the data returned by a Mutation, use the `UseMutationResult.data` field. The data for the `LogLegalDisclaimerAcceptance` Mutation is of type `LogLegalDisclaimerAcceptanceData`, which is defined in [default-connector/index.d.ts](../index.d.ts). It has the following fields:
```javascript
export interface LogLegalDisclaimerAcceptanceData {
  legalDisclaimer_insert: LegalDisclaimer_Key;
}
```

To learn more about the `UseMutationResult` object, see the [TanStack React Query documentation](https://tanstack.com/query/v5/docs/framework/react/reference/useMutation).

### Using `LogLegalDisclaimerAcceptance`'s Mutation hook function

```javascript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, LogLegalDisclaimerAcceptanceVariables } from '@firebasegen/default-connector';
import { useLogLegalDisclaimerAcceptance } from '@firebasegen/default-connector/react'

export default function LogLegalDisclaimerAcceptanceComponent() {
  // Call the Mutation hook function to get a `UseMutationResult` object which holds the state of your Mutation.
  const mutation = useLogLegalDisclaimerAcceptance();

  // You can also pass in a `DataConnect` instance to the Mutation hook function.
  const dataConnect = getDataConnect(connectorConfig);
  const mutation = useLogLegalDisclaimerAcceptance(dataConnect);

  // You can also pass in a `useDataConnectMutationOptions` object to the Mutation hook function.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useLogLegalDisclaimerAcceptance(options);

  // You can also pass both a `DataConnect` instance and a `useDataConnectMutationOptions` object.
  const dataConnect = getDataConnect(connectorConfig);
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  const mutation = useLogLegalDisclaimerAcceptance(dataConnect, options);

  // After calling the Mutation hook function, you must call `UseMutationResult.mutate()` to execute the Mutation.
  // The `useLogLegalDisclaimerAcceptance` Mutation requires an argument of type `LogLegalDisclaimerAcceptanceVariables`:
  const logLegalDisclaimerAcceptanceVars: LogLegalDisclaimerAcceptanceVariables = {
    userId: ..., 
  };
  mutation.mutate(logLegalDisclaimerAcceptanceVars);
  // Variables can be defined inline as well.
  mutation.mutate({ userId: ..., });

  // You can also pass in a `useDataConnectMutationOptions` object to `UseMutationResult.mutate()`.
  const options = {
    onSuccess: () => { console.log('Mutation succeeded!'); }
  };
  mutation.mutate(logLegalDisclaimerAcceptanceVars, options);

  // Then, you can render your component dynamically based on the status of the Mutation.
  if (mutation.isPending) {
    return <div>Loading...</div>;
  }

  if (mutation.isError) {
    return <div>Error: {mutation.error.message}</div>;
  }

  // If the Mutation is successful, you can access the data returned using the `UseMutationResult.data` field.
  if (mutation.isSuccess) {
    console.log(mutation.data.legalDisclaimer_insert);
  }
  return <div>Mutation execution {mutation.isSuccess ? 'successful' : 'failed'}!</div>;
}
```

