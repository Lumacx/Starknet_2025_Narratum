# Table of Contents
- [**Overview**](#generated-javascript-readme)
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

# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `default`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

You can use this generated SDK by importing from the package `@firebasegen/default-connector` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `default`.

You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@firebasegen/default-connector';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetUserProfile
You can execute the `GetUserProfile` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getUserProfile(vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getUserProfile(dc: DataConnect, vars: GetUserProfileVariables): QueryPromise<GetUserProfileData, GetUserProfileVariables>;

interface GetUserProfileRef {
  ...
  (dc: DataConnect, vars: GetUserProfileVariables): QueryRef<GetUserProfileData, GetUserProfileVariables>;
}
export const getUserProfileRef: GetUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getUserProfileRef:
```typescript
const name = getUserProfileRef.operationName;
console.log(name);
```

### Variables
The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetUserProfileVariables {
  userId: string;
}
```
### Return Type
Recall that executing the `GetUserProfile` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetUserProfileData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getUserProfile, GetUserProfileVariables } from '@firebasegen/default-connector';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  userId: ..., 
};

// Call the `getUserProfile()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getUserProfile(getUserProfileVars);
// Variables can be defined inline as well.
const { data } = await getUserProfile({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getUserProfile(dataConnect, getUserProfileVars);

console.log(data.user);

// Or, you can use the `Promise` API.
getUserProfile(getUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

### Using `GetUserProfile`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getUserProfileRef, GetUserProfileVariables } from '@firebasegen/default-connector';

// The `GetUserProfile` query requires an argument of type `GetUserProfileVariables`:
const getUserProfileVars: GetUserProfileVariables = {
  userId: ..., 
};

// Call the `getUserProfileRef()` function to get a reference to the query.
const ref = getUserProfileRef(getUserProfileVars);
// Variables can be defined inline as well.
const ref = getUserProfileRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getUserProfileRef(dataConnect, getUserProfileVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.user);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.user);
});
```

## GetStoryWithContent
You can execute the `GetStoryWithContent` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getStoryWithContent(vars: GetStoryWithContentVariables): QueryPromise<GetStoryWithContentData, GetStoryWithContentVariables>;

interface GetStoryWithContentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetStoryWithContentVariables): QueryRef<GetStoryWithContentData, GetStoryWithContentVariables>;
}
export const getStoryWithContentRef: GetStoryWithContentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getStoryWithContent(dc: DataConnect, vars: GetStoryWithContentVariables): QueryPromise<GetStoryWithContentData, GetStoryWithContentVariables>;

interface GetStoryWithContentRef {
  ...
  (dc: DataConnect, vars: GetStoryWithContentVariables): QueryRef<GetStoryWithContentData, GetStoryWithContentVariables>;
}
export const getStoryWithContentRef: GetStoryWithContentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getStoryWithContentRef:
```typescript
const name = getStoryWithContentRef.operationName;
console.log(name);
```

### Variables
The `GetStoryWithContent` query requires an argument of type `GetStoryWithContentVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetStoryWithContentVariables {
  storyId: string;
}
```
### Return Type
Recall that executing the `GetStoryWithContent` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetStoryWithContentData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetStoryWithContent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getStoryWithContent, GetStoryWithContentVariables } from '@firebasegen/default-connector';

// The `GetStoryWithContent` query requires an argument of type `GetStoryWithContentVariables`:
const getStoryWithContentVars: GetStoryWithContentVariables = {
  storyId: ..., 
};

// Call the `getStoryWithContent()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getStoryWithContent(getStoryWithContentVars);
// Variables can be defined inline as well.
const { data } = await getStoryWithContent({ storyId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getStoryWithContent(dataConnect, getStoryWithContentVars);

console.log(data.story);

// Or, you can use the `Promise` API.
getStoryWithContent(getStoryWithContentVars).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

### Using `GetStoryWithContent`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getStoryWithContentRef, GetStoryWithContentVariables } from '@firebasegen/default-connector';

// The `GetStoryWithContent` query requires an argument of type `GetStoryWithContentVariables`:
const getStoryWithContentVars: GetStoryWithContentVariables = {
  storyId: ..., 
};

// Call the `getStoryWithContentRef()` function to get a reference to the query.
const ref = getStoryWithContentRef(getStoryWithContentVars);
// Variables can be defined inline as well.
const ref = getStoryWithContentRef({ storyId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getStoryWithContentRef(dataConnect, getStoryWithContentVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.story);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.story);
});
```

## GetAllStories
You can execute the `GetAllStories` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getAllStories(): QueryPromise<GetAllStoriesData, undefined>;

interface GetAllStoriesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllStoriesData, undefined>;
}
export const getAllStoriesRef: GetAllStoriesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAllStories(dc: DataConnect): QueryPromise<GetAllStoriesData, undefined>;

interface GetAllStoriesRef {
  ...
  (dc: DataConnect): QueryRef<GetAllStoriesData, undefined>;
}
export const getAllStoriesRef: GetAllStoriesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAllStoriesRef:
```typescript
const name = getAllStoriesRef.operationName;
console.log(name);
```

### Variables
The `GetAllStories` query has no variables.
### Return Type
Recall that executing the `GetAllStories` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAllStoriesData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAllStoriesData {
  stories: ({
    id: string;
    title?: string | null;
    genre?: string | null;
    status: string;
  } & Story_Key)[];
}
```
### Using `GetAllStories`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAllStories } from '@firebasegen/default-connector';


// Call the `getAllStories()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAllStories();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAllStories(dataConnect);

console.log(data.stories);

// Or, you can use the `Promise` API.
getAllStories().then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

### Using `GetAllStories`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAllStoriesRef } from '@firebasegen/default-connector';


// Call the `getAllStoriesRef()` function to get a reference to the query.
const ref = getAllStoriesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAllStoriesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.stories);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.stories);
});
```

## GetAppSubscription
You can execute the `GetAppSubscription` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getAppSubscription(vars: GetAppSubscriptionVariables): QueryPromise<GetAppSubscriptionData, GetAppSubscriptionVariables>;

interface GetAppSubscriptionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAppSubscriptionVariables): QueryRef<GetAppSubscriptionData, GetAppSubscriptionVariables>;
}
export const getAppSubscriptionRef: GetAppSubscriptionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAppSubscription(dc: DataConnect, vars: GetAppSubscriptionVariables): QueryPromise<GetAppSubscriptionData, GetAppSubscriptionVariables>;

interface GetAppSubscriptionRef {
  ...
  (dc: DataConnect, vars: GetAppSubscriptionVariables): QueryRef<GetAppSubscriptionData, GetAppSubscriptionVariables>;
}
export const getAppSubscriptionRef: GetAppSubscriptionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAppSubscriptionRef:
```typescript
const name = getAppSubscriptionRef.operationName;
console.log(name);
```

### Variables
The `GetAppSubscription` query requires an argument of type `GetAppSubscriptionVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAppSubscriptionVariables {
  subscriptionId: string;
}
```
### Return Type
Recall that executing the `GetAppSubscription` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAppSubscriptionData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAppSubscriptionData {
  appSubscription?: {
    id: string;
    name: string;
    price?: number | null;
    featuresJson?: string | null;
  } & AppSubscription_Key;
}
```
### Using `GetAppSubscription`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAppSubscription, GetAppSubscriptionVariables } from '@firebasegen/default-connector';

// The `GetAppSubscription` query requires an argument of type `GetAppSubscriptionVariables`:
const getAppSubscriptionVars: GetAppSubscriptionVariables = {
  subscriptionId: ..., 
};

// Call the `getAppSubscription()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAppSubscription(getAppSubscriptionVars);
// Variables can be defined inline as well.
const { data } = await getAppSubscription({ subscriptionId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAppSubscription(dataConnect, getAppSubscriptionVars);

console.log(data.appSubscription);

// Or, you can use the `Promise` API.
getAppSubscription(getAppSubscriptionVars).then((response) => {
  const data = response.data;
  console.log(data.appSubscription);
});
```

### Using `GetAppSubscription`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAppSubscriptionRef, GetAppSubscriptionVariables } from '@firebasegen/default-connector';

// The `GetAppSubscription` query requires an argument of type `GetAppSubscriptionVariables`:
const getAppSubscriptionVars: GetAppSubscriptionVariables = {
  subscriptionId: ..., 
};

// Call the `getAppSubscriptionRef()` function to get a reference to the query.
const ref = getAppSubscriptionRef(getAppSubscriptionVars);
// Variables can be defined inline as well.
const ref = getAppSubscriptionRef({ subscriptionId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAppSubscriptionRef(dataConnect, getAppSubscriptionVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.appSubscription);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.appSubscription);
});
```

## GetTemplate
You can execute the `GetTemplate` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getTemplate(vars: GetTemplateVariables): QueryPromise<GetTemplateData, GetTemplateVariables>;

interface GetTemplateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetTemplateVariables): QueryRef<GetTemplateData, GetTemplateVariables>;
}
export const getTemplateRef: GetTemplateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getTemplate(dc: DataConnect, vars: GetTemplateVariables): QueryPromise<GetTemplateData, GetTemplateVariables>;

interface GetTemplateRef {
  ...
  (dc: DataConnect, vars: GetTemplateVariables): QueryRef<GetTemplateData, GetTemplateVariables>;
}
export const getTemplateRef: GetTemplateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getTemplateRef:
```typescript
const name = getTemplateRef.operationName;
console.log(name);
```

### Variables
The `GetTemplate` query requires an argument of type `GetTemplateVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetTemplateVariables {
  templateId: string;
}
```
### Return Type
Recall that executing the `GetTemplate` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetTemplateData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetTemplateData {
  template?: {
    id: string;
    title?: string | null;
    structureJson?: string | null;
  } & Template_Key;
}
```
### Using `GetTemplate`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getTemplate, GetTemplateVariables } from '@firebasegen/default-connector';

// The `GetTemplate` query requires an argument of type `GetTemplateVariables`:
const getTemplateVars: GetTemplateVariables = {
  templateId: ..., 
};

// Call the `getTemplate()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getTemplate(getTemplateVars);
// Variables can be defined inline as well.
const { data } = await getTemplate({ templateId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getTemplate(dataConnect, getTemplateVars);

console.log(data.template);

// Or, you can use the `Promise` API.
getTemplate(getTemplateVars).then((response) => {
  const data = response.data;
  console.log(data.template);
});
```

### Using `GetTemplate`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getTemplateRef, GetTemplateVariables } from '@firebasegen/default-connector';

// The `GetTemplate` query requires an argument of type `GetTemplateVariables`:
const getTemplateVars: GetTemplateVariables = {
  templateId: ..., 
};

// Call the `getTemplateRef()` function to get a reference to the query.
const ref = getTemplateRef(getTemplateVars);
// Variables can be defined inline as well.
const ref = getTemplateRef({ templateId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getTemplateRef(dataConnect, getTemplateVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.template);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.template);
});
```

## GetAllTemplates
You can execute the `GetAllTemplates` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getAllTemplates(): QueryPromise<GetAllTemplatesData, undefined>;

interface GetAllTemplatesRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetAllTemplatesData, undefined>;
}
export const getAllTemplatesRef: GetAllTemplatesRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAllTemplates(dc: DataConnect): QueryPromise<GetAllTemplatesData, undefined>;

interface GetAllTemplatesRef {
  ...
  (dc: DataConnect): QueryRef<GetAllTemplatesData, undefined>;
}
export const getAllTemplatesRef: GetAllTemplatesRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAllTemplatesRef:
```typescript
const name = getAllTemplatesRef.operationName;
console.log(name);
```

### Variables
The `GetAllTemplates` query has no variables.
### Return Type
Recall that executing the `GetAllTemplates` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAllTemplatesData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAllTemplatesData {
  templates: ({
    id: string;
    title?: string | null;
  } & Template_Key)[];
}
```
### Using `GetAllTemplates`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAllTemplates } from '@firebasegen/default-connector';


// Call the `getAllTemplates()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAllTemplates();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAllTemplates(dataConnect);

console.log(data.templates);

// Or, you can use the `Promise` API.
getAllTemplates().then((response) => {
  const data = response.data;
  console.log(data.templates);
});
```

### Using `GetAllTemplates`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAllTemplatesRef } from '@firebasegen/default-connector';


// Call the `getAllTemplatesRef()` function to get a reference to the query.
const ref = getAllTemplatesRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAllTemplatesRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.templates);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.templates);
});
```

## GetAIGeneratedImage
You can execute the `GetAIGeneratedImage` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getAiGeneratedImage(vars: GetAiGeneratedImageVariables): QueryPromise<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;

interface GetAiGeneratedImageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAiGeneratedImageVariables): QueryRef<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
}
export const getAiGeneratedImageRef: GetAiGeneratedImageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAiGeneratedImage(dc: DataConnect, vars: GetAiGeneratedImageVariables): QueryPromise<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;

interface GetAiGeneratedImageRef {
  ...
  (dc: DataConnect, vars: GetAiGeneratedImageVariables): QueryRef<GetAiGeneratedImageData, GetAiGeneratedImageVariables>;
}
export const getAiGeneratedImageRef: GetAiGeneratedImageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAiGeneratedImageRef:
```typescript
const name = getAiGeneratedImageRef.operationName;
console.log(name);
```

### Variables
The `GetAIGeneratedImage` query requires an argument of type `GetAiGeneratedImageVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAiGeneratedImageVariables {
  imageId: string;
}
```
### Return Type
Recall that executing the `GetAIGeneratedImage` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAiGeneratedImageData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetAIGeneratedImage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAiGeneratedImage, GetAiGeneratedImageVariables } from '@firebasegen/default-connector';

// The `GetAIGeneratedImage` query requires an argument of type `GetAiGeneratedImageVariables`:
const getAiGeneratedImageVars: GetAiGeneratedImageVariables = {
  imageId: ..., 
};

// Call the `getAiGeneratedImage()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAiGeneratedImage(getAiGeneratedImageVars);
// Variables can be defined inline as well.
const { data } = await getAiGeneratedImage({ imageId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAiGeneratedImage(dataConnect, getAiGeneratedImageVars);

console.log(data.aIGeneratedImage);

// Or, you can use the `Promise` API.
getAiGeneratedImage(getAiGeneratedImageVars).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedImage);
});
```

### Using `GetAIGeneratedImage`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAiGeneratedImageRef, GetAiGeneratedImageVariables } from '@firebasegen/default-connector';

// The `GetAIGeneratedImage` query requires an argument of type `GetAiGeneratedImageVariables`:
const getAiGeneratedImageVars: GetAiGeneratedImageVariables = {
  imageId: ..., 
};

// Call the `getAiGeneratedImageRef()` function to get a reference to the query.
const ref = getAiGeneratedImageRef(getAiGeneratedImageVars);
// Variables can be defined inline as well.
const ref = getAiGeneratedImageRef({ imageId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAiGeneratedImageRef(dataConnect, getAiGeneratedImageVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.aIGeneratedImage);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedImage);
});
```

## GetAIGeneratedGIF
You can execute the `GetAIGeneratedGIF` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getAiGeneratedGif(vars: GetAiGeneratedGifVariables): QueryPromise<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;

interface GetAiGeneratedGifRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAiGeneratedGifVariables): QueryRef<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
}
export const getAiGeneratedGifRef: GetAiGeneratedGifRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAiGeneratedGif(dc: DataConnect, vars: GetAiGeneratedGifVariables): QueryPromise<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;

interface GetAiGeneratedGifRef {
  ...
  (dc: DataConnect, vars: GetAiGeneratedGifVariables): QueryRef<GetAiGeneratedGifData, GetAiGeneratedGifVariables>;
}
export const getAiGeneratedGifRef: GetAiGeneratedGifRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAiGeneratedGifRef:
```typescript
const name = getAiGeneratedGifRef.operationName;
console.log(name);
```

### Variables
The `GetAIGeneratedGIF` query requires an argument of type `GetAiGeneratedGifVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAiGeneratedGifVariables {
  gifId: string;
}
```
### Return Type
Recall that executing the `GetAIGeneratedGIF` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAiGeneratedGifData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAiGeneratedGifData {
  aIGeneratedGIF?: {
    id: string;
    gifUrl?: string | null;
  } & AIGeneratedGIF_Key;
}
```
### Using `GetAIGeneratedGIF`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAiGeneratedGif, GetAiGeneratedGifVariables } from '@firebasegen/default-connector';

// The `GetAIGeneratedGIF` query requires an argument of type `GetAiGeneratedGifVariables`:
const getAiGeneratedGifVars: GetAiGeneratedGifVariables = {
  gifId: ..., 
};

// Call the `getAiGeneratedGif()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAiGeneratedGif(getAiGeneratedGifVars);
// Variables can be defined inline as well.
const { data } = await getAiGeneratedGif({ gifId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAiGeneratedGif(dataConnect, getAiGeneratedGifVars);

console.log(data.aIGeneratedGIF);

// Or, you can use the `Promise` API.
getAiGeneratedGif(getAiGeneratedGifVars).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedGIF);
});
```

### Using `GetAIGeneratedGIF`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAiGeneratedGifRef, GetAiGeneratedGifVariables } from '@firebasegen/default-connector';

// The `GetAIGeneratedGIF` query requires an argument of type `GetAiGeneratedGifVariables`:
const getAiGeneratedGifVars: GetAiGeneratedGifVariables = {
  gifId: ..., 
};

// Call the `getAiGeneratedGifRef()` function to get a reference to the query.
const ref = getAiGeneratedGifRef(getAiGeneratedGifVars);
// Variables can be defined inline as well.
const ref = getAiGeneratedGifRef({ gifId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAiGeneratedGifRef(dataConnect, getAiGeneratedGifVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.aIGeneratedGIF);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedGIF);
});
```

## GetPayment
You can execute the `GetPayment` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getPayment(vars: GetPaymentVariables): QueryPromise<GetPaymentData, GetPaymentVariables>;

interface GetPaymentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetPaymentVariables): QueryRef<GetPaymentData, GetPaymentVariables>;
}
export const getPaymentRef: GetPaymentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPayment(dc: DataConnect, vars: GetPaymentVariables): QueryPromise<GetPaymentData, GetPaymentVariables>;

interface GetPaymentRef {
  ...
  (dc: DataConnect, vars: GetPaymentVariables): QueryRef<GetPaymentData, GetPaymentVariables>;
}
export const getPaymentRef: GetPaymentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPaymentRef:
```typescript
const name = getPaymentRef.operationName;
console.log(name);
```

### Variables
The `GetPayment` query requires an argument of type `GetPaymentVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetPaymentVariables {
  paymentId: string;
}
```
### Return Type
Recall that executing the `GetPayment` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPaymentData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPaymentData {
  payment?: {
    id: string;
    amount?: number | null;
    status: string;
    paymentDate: TimestampString;
  } & Payment_Key;
}
```
### Using `GetPayment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPayment, GetPaymentVariables } from '@firebasegen/default-connector';

// The `GetPayment` query requires an argument of type `GetPaymentVariables`:
const getPaymentVars: GetPaymentVariables = {
  paymentId: ..., 
};

// Call the `getPayment()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPayment(getPaymentVars);
// Variables can be defined inline as well.
const { data } = await getPayment({ paymentId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPayment(dataConnect, getPaymentVars);

console.log(data.payment);

// Or, you can use the `Promise` API.
getPayment(getPaymentVars).then((response) => {
  const data = response.data;
  console.log(data.payment);
});
```

### Using `GetPayment`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPaymentRef, GetPaymentVariables } from '@firebasegen/default-connector';

// The `GetPayment` query requires an argument of type `GetPaymentVariables`:
const getPaymentVars: GetPaymentVariables = {
  paymentId: ..., 
};

// Call the `getPaymentRef()` function to get a reference to the query.
const ref = getPaymentRef(getPaymentVars);
// Variables can be defined inline as well.
const ref = getPaymentRef({ paymentId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPaymentRef(dataConnect, getPaymentVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.payment);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.payment);
});
```

## GetAdminAction
You can execute the `GetAdminAction` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getAdminAction(vars: GetAdminActionVariables): QueryPromise<GetAdminActionData, GetAdminActionVariables>;

interface GetAdminActionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAdminActionVariables): QueryRef<GetAdminActionData, GetAdminActionVariables>;
}
export const getAdminActionRef: GetAdminActionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAdminAction(dc: DataConnect, vars: GetAdminActionVariables): QueryPromise<GetAdminActionData, GetAdminActionVariables>;

interface GetAdminActionRef {
  ...
  (dc: DataConnect, vars: GetAdminActionVariables): QueryRef<GetAdminActionData, GetAdminActionVariables>;
}
export const getAdminActionRef: GetAdminActionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAdminActionRef:
```typescript
const name = getAdminActionRef.operationName;
console.log(name);
```

### Variables
The `GetAdminAction` query requires an argument of type `GetAdminActionVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAdminActionVariables {
  actionId: string;
}
```
### Return Type
Recall that executing the `GetAdminAction` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAdminActionData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
### Using `GetAdminAction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAdminAction, GetAdminActionVariables } from '@firebasegen/default-connector';

// The `GetAdminAction` query requires an argument of type `GetAdminActionVariables`:
const getAdminActionVars: GetAdminActionVariables = {
  actionId: ..., 
};

// Call the `getAdminAction()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAdminAction(getAdminActionVars);
// Variables can be defined inline as well.
const { data } = await getAdminAction({ actionId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAdminAction(dataConnect, getAdminActionVars);

console.log(data.adminAction);

// Or, you can use the `Promise` API.
getAdminAction(getAdminActionVars).then((response) => {
  const data = response.data;
  console.log(data.adminAction);
});
```

### Using `GetAdminAction`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAdminActionRef, GetAdminActionVariables } from '@firebasegen/default-connector';

// The `GetAdminAction` query requires an argument of type `GetAdminActionVariables`:
const getAdminActionVars: GetAdminActionVariables = {
  actionId: ..., 
};

// Call the `getAdminActionRef()` function to get a reference to the query.
const ref = getAdminActionRef(getAdminActionVars);
// Variables can be defined inline as well.
const ref = getAdminActionRef({ actionId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAdminActionRef(dataConnect, getAdminActionVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.adminAction);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.adminAction);
});
```

## GetAnalyticsEntry
You can execute the `GetAnalyticsEntry` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getAnalyticsEntry(vars: GetAnalyticsEntryVariables): QueryPromise<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;

interface GetAnalyticsEntryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetAnalyticsEntryVariables): QueryRef<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
}
export const getAnalyticsEntryRef: GetAnalyticsEntryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getAnalyticsEntry(dc: DataConnect, vars: GetAnalyticsEntryVariables): QueryPromise<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;

interface GetAnalyticsEntryRef {
  ...
  (dc: DataConnect, vars: GetAnalyticsEntryVariables): QueryRef<GetAnalyticsEntryData, GetAnalyticsEntryVariables>;
}
export const getAnalyticsEntryRef: GetAnalyticsEntryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getAnalyticsEntryRef:
```typescript
const name = getAnalyticsEntryRef.operationName;
console.log(name);
```

### Variables
The `GetAnalyticsEntry` query requires an argument of type `GetAnalyticsEntryVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetAnalyticsEntryVariables {
  analyticsId: string;
}
```
### Return Type
Recall that executing the `GetAnalyticsEntry` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetAnalyticsEntryData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetAnalyticsEntryData {
  analytics?: {
    id: string;
    action: string;
    actionTimestamp: TimestampString;
  } & Analytics_Key;
}
```
### Using `GetAnalyticsEntry`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getAnalyticsEntry, GetAnalyticsEntryVariables } from '@firebasegen/default-connector';

// The `GetAnalyticsEntry` query requires an argument of type `GetAnalyticsEntryVariables`:
const getAnalyticsEntryVars: GetAnalyticsEntryVariables = {
  analyticsId: ..., 
};

// Call the `getAnalyticsEntry()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getAnalyticsEntry(getAnalyticsEntryVars);
// Variables can be defined inline as well.
const { data } = await getAnalyticsEntry({ analyticsId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getAnalyticsEntry(dataConnect, getAnalyticsEntryVars);

console.log(data.analytics);

// Or, you can use the `Promise` API.
getAnalyticsEntry(getAnalyticsEntryVars).then((response) => {
  const data = response.data;
  console.log(data.analytics);
});
```

### Using `GetAnalyticsEntry`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getAnalyticsEntryRef, GetAnalyticsEntryVariables } from '@firebasegen/default-connector';

// The `GetAnalyticsEntry` query requires an argument of type `GetAnalyticsEntryVariables`:
const getAnalyticsEntryVars: GetAnalyticsEntryVariables = {
  analyticsId: ..., 
};

// Call the `getAnalyticsEntryRef()` function to get a reference to the query.
const ref = getAnalyticsEntryRef(getAnalyticsEntryVars);
// Variables can be defined inline as well.
const ref = getAnalyticsEntryRef({ analyticsId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getAnalyticsEntryRef(dataConnect, getAnalyticsEntryVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.analytics);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.analytics);
});
```

## GetLegalDisclaimer
You can execute the `GetLegalDisclaimer` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
getLegalDisclaimer(vars: GetLegalDisclaimerVariables): QueryPromise<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;

interface GetLegalDisclaimerRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetLegalDisclaimerVariables): QueryRef<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
}
export const getLegalDisclaimerRef: GetLegalDisclaimerRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getLegalDisclaimer(dc: DataConnect, vars: GetLegalDisclaimerVariables): QueryPromise<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;

interface GetLegalDisclaimerRef {
  ...
  (dc: DataConnect, vars: GetLegalDisclaimerVariables): QueryRef<GetLegalDisclaimerData, GetLegalDisclaimerVariables>;
}
export const getLegalDisclaimerRef: GetLegalDisclaimerRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getLegalDisclaimerRef:
```typescript
const name = getLegalDisclaimerRef.operationName;
console.log(name);
```

### Variables
The `GetLegalDisclaimer` query requires an argument of type `GetLegalDisclaimerVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetLegalDisclaimerVariables {
  disclaimerId: string;
}
```
### Return Type
Recall that executing the `GetLegalDisclaimer` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetLegalDisclaimerData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetLegalDisclaimerData {
  legalDisclaimer?: {
    id: string;
    accepted: boolean;
    acceptedDate?: TimestampString | null;
    createdAt: TimestampString;
  } & LegalDisclaimer_Key;
}
```
### Using `GetLegalDisclaimer`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getLegalDisclaimer, GetLegalDisclaimerVariables } from '@firebasegen/default-connector';

// The `GetLegalDisclaimer` query requires an argument of type `GetLegalDisclaimerVariables`:
const getLegalDisclaimerVars: GetLegalDisclaimerVariables = {
  disclaimerId: ..., 
};

// Call the `getLegalDisclaimer()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getLegalDisclaimer(getLegalDisclaimerVars);
// Variables can be defined inline as well.
const { data } = await getLegalDisclaimer({ disclaimerId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getLegalDisclaimer(dataConnect, getLegalDisclaimerVars);

console.log(data.legalDisclaimer);

// Or, you can use the `Promise` API.
getLegalDisclaimer(getLegalDisclaimerVars).then((response) => {
  const data = response.data;
  console.log(data.legalDisclaimer);
});
```

### Using `GetLegalDisclaimer`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getLegalDisclaimerRef, GetLegalDisclaimerVariables } from '@firebasegen/default-connector';

// The `GetLegalDisclaimer` query requires an argument of type `GetLegalDisclaimerVariables`:
const getLegalDisclaimerVars: GetLegalDisclaimerVariables = {
  disclaimerId: ..., 
};

// Call the `getLegalDisclaimerRef()` function to get a reference to the query.
const ref = getLegalDisclaimerRef(getLegalDisclaimerVars);
// Variables can be defined inline as well.
const ref = getLegalDisclaimerRef({ disclaimerId: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getLegalDisclaimerRef(dataConnect, getLegalDisclaimerVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.legalDisclaimer);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.legalDisclaimer);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `default` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateUserProfile
You can execute the `CreateUserProfile` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createUserProfile(vars: CreateUserProfileVariables): MutationPromise<CreateUserProfileData, CreateUserProfileVariables>;

interface CreateUserProfileRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserProfileVariables): MutationRef<CreateUserProfileData, CreateUserProfileVariables>;
}
export const createUserProfileRef: CreateUserProfileRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUserProfile(dc: DataConnect, vars: CreateUserProfileVariables): MutationPromise<CreateUserProfileData, CreateUserProfileVariables>;

interface CreateUserProfileRef {
  ...
  (dc: DataConnect, vars: CreateUserProfileVariables): MutationRef<CreateUserProfileData, CreateUserProfileVariables>;
}
export const createUserProfileRef: CreateUserProfileRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserProfileRef:
```typescript
const name = createUserProfileRef.operationName;
console.log(name);
```

### Variables
The `CreateUserProfile` mutation requires an argument of type `CreateUserProfileVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserProfileVariables {
  username: string;
  email: string;
  displayname: string;
  avatarUrl?: string | null;
}
```
### Return Type
Recall that executing the `CreateUserProfile` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserProfileData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserProfileData {
  user_insert: User_Key;
}
```
### Using `CreateUserProfile`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUserProfile, CreateUserProfileVariables } from '@firebasegen/default-connector';

// The `CreateUserProfile` mutation requires an argument of type `CreateUserProfileVariables`:
const createUserProfileVars: CreateUserProfileVariables = {
  username: ..., 
  email: ..., 
  displayname: ..., 
  avatarUrl: ..., // optional
};

// Call the `createUserProfile()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUserProfile(createUserProfileVars);
// Variables can be defined inline as well.
const { data } = await createUserProfile({ username: ..., email: ..., displayname: ..., avatarUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUserProfile(dataConnect, createUserProfileVars);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
createUserProfile(createUserProfileVars).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

### Using `CreateUserProfile`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserProfileRef, CreateUserProfileVariables } from '@firebasegen/default-connector';

// The `CreateUserProfile` mutation requires an argument of type `CreateUserProfileVariables`:
const createUserProfileVars: CreateUserProfileVariables = {
  username: ..., 
  email: ..., 
  displayname: ..., 
  avatarUrl: ..., // optional
};

// Call the `createUserProfileRef()` function to get a reference to the mutation.
const ref = createUserProfileRef(createUserProfileVars);
// Variables can be defined inline as well.
const ref = createUserProfileRef({ username: ..., email: ..., displayname: ..., avatarUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserProfileRef(dataConnect, createUserProfileVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.user_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.user_insert);
});
```

## CreateStory
You can execute the `CreateStory` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createStory(vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;

interface CreateStoryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
}
export const createStoryRef: CreateStoryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createStory(dc: DataConnect, vars: CreateStoryVariables): MutationPromise<CreateStoryData, CreateStoryVariables>;

interface CreateStoryRef {
  ...
  (dc: DataConnect, vars: CreateStoryVariables): MutationRef<CreateStoryData, CreateStoryVariables>;
}
export const createStoryRef: CreateStoryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createStoryRef:
```typescript
const name = createStoryRef.operationName;
console.log(name);
```

### Variables
The `CreateStory` mutation requires an argument of type `CreateStoryVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateStoryVariables {
  creatorId: string;
  title?: string | null;
  genre?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
}
```
### Return Type
Recall that executing the `CreateStory` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateStoryData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateStoryData {
  story_insert: Story_Key;
}
```
### Using `CreateStory`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createStory, CreateStoryVariables } from '@firebasegen/default-connector';

// The `CreateStory` mutation requires an argument of type `CreateStoryVariables`:
const createStoryVars: CreateStoryVariables = {
  creatorId: ..., 
  title: ..., // optional
  genre: ..., // optional
  description: ..., // optional
  coverImageUrl: ..., // optional
};

// Call the `createStory()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createStory(createStoryVars);
// Variables can be defined inline as well.
const { data } = await createStory({ creatorId: ..., title: ..., genre: ..., description: ..., coverImageUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createStory(dataConnect, createStoryVars);

console.log(data.story_insert);

// Or, you can use the `Promise` API.
createStory(createStoryVars).then((response) => {
  const data = response.data;
  console.log(data.story_insert);
});
```

### Using `CreateStory`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createStoryRef, CreateStoryVariables } from '@firebasegen/default-connector';

// The `CreateStory` mutation requires an argument of type `CreateStoryVariables`:
const createStoryVars: CreateStoryVariables = {
  creatorId: ..., 
  title: ..., // optional
  genre: ..., // optional
  description: ..., // optional
  coverImageUrl: ..., // optional
};

// Call the `createStoryRef()` function to get a reference to the mutation.
const ref = createStoryRef(createStoryVars);
// Variables can be defined inline as well.
const ref = createStoryRef({ creatorId: ..., title: ..., genre: ..., description: ..., coverImageUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createStoryRef(dataConnect, createStoryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.story_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.story_insert);
});
```

## CreateStoryContent
You can execute the `CreateStoryContent` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createStoryContent(vars: CreateStoryContentVariables): MutationPromise<CreateStoryContentData, CreateStoryContentVariables>;

interface CreateStoryContentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateStoryContentVariables): MutationRef<CreateStoryContentData, CreateStoryContentVariables>;
}
export const createStoryContentRef: CreateStoryContentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createStoryContent(dc: DataConnect, vars: CreateStoryContentVariables): MutationPromise<CreateStoryContentData, CreateStoryContentVariables>;

interface CreateStoryContentRef {
  ...
  (dc: DataConnect, vars: CreateStoryContentVariables): MutationRef<CreateStoryContentData, CreateStoryContentVariables>;
}
export const createStoryContentRef: CreateStoryContentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createStoryContentRef:
```typescript
const name = createStoryContentRef.operationName;
console.log(name);
```

### Variables
The `CreateStoryContent` mutation requires an argument of type `CreateStoryContentVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateStoryContentVariables {
  storyId: string;
  textContent?: string | null;
  pageNumber?: number | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
}
```
### Return Type
Recall that executing the `CreateStoryContent` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateStoryContentData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateStoryContentData {
  storyContent_insert: StoryContent_Key;
}
```
### Using `CreateStoryContent`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createStoryContent, CreateStoryContentVariables } from '@firebasegen/default-connector';

// The `CreateStoryContent` mutation requires an argument of type `CreateStoryContentVariables`:
const createStoryContentVars: CreateStoryContentVariables = {
  storyId: ..., 
  textContent: ..., // optional
  pageNumber: ..., // optional
  imageUrl: ..., // optional
  audioUrl: ..., // optional
};

// Call the `createStoryContent()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createStoryContent(createStoryContentVars);
// Variables can be defined inline as well.
const { data } = await createStoryContent({ storyId: ..., textContent: ..., pageNumber: ..., imageUrl: ..., audioUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createStoryContent(dataConnect, createStoryContentVars);

console.log(data.storyContent_insert);

// Or, you can use the `Promise` API.
createStoryContent(createStoryContentVars).then((response) => {
  const data = response.data;
  console.log(data.storyContent_insert);
});
```

### Using `CreateStoryContent`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createStoryContentRef, CreateStoryContentVariables } from '@firebasegen/default-connector';

// The `CreateStoryContent` mutation requires an argument of type `CreateStoryContentVariables`:
const createStoryContentVars: CreateStoryContentVariables = {
  storyId: ..., 
  textContent: ..., // optional
  pageNumber: ..., // optional
  imageUrl: ..., // optional
  audioUrl: ..., // optional
};

// Call the `createStoryContentRef()` function to get a reference to the mutation.
const ref = createStoryContentRef(createStoryContentVars);
// Variables can be defined inline as well.
const ref = createStoryContentRef({ storyId: ..., textContent: ..., pageNumber: ..., imageUrl: ..., audioUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createStoryContentRef(dataConnect, createStoryContentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.storyContent_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.storyContent_insert);
});
```

## CreateTemplate
You can execute the `CreateTemplate` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createTemplate(vars: CreateTemplateVariables): MutationPromise<CreateTemplateData, CreateTemplateVariables>;

interface CreateTemplateRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateTemplateVariables): MutationRef<CreateTemplateData, CreateTemplateVariables>;
}
export const createTemplateRef: CreateTemplateRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createTemplate(dc: DataConnect, vars: CreateTemplateVariables): MutationPromise<CreateTemplateData, CreateTemplateVariables>;

interface CreateTemplateRef {
  ...
  (dc: DataConnect, vars: CreateTemplateVariables): MutationRef<CreateTemplateData, CreateTemplateVariables>;
}
export const createTemplateRef: CreateTemplateRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createTemplateRef:
```typescript
const name = createTemplateRef.operationName;
console.log(name);
```

### Variables
The `CreateTemplate` mutation requires an argument of type `CreateTemplateVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateTemplateVariables {
  title: string;
  structureJson?: string | null;
  exampleStoryId?: string | null;
}
```
### Return Type
Recall that executing the `CreateTemplate` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateTemplateData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateTemplateData {
  template_insert: Template_Key;
}
```
### Using `CreateTemplate`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createTemplate, CreateTemplateVariables } from '@firebasegen/default-connector';

// The `CreateTemplate` mutation requires an argument of type `CreateTemplateVariables`:
const createTemplateVars: CreateTemplateVariables = {
  title: ..., 
  structureJson: ..., // optional
  exampleStoryId: ..., // optional
};

// Call the `createTemplate()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createTemplate(createTemplateVars);
// Variables can be defined inline as well.
const { data } = await createTemplate({ title: ..., structureJson: ..., exampleStoryId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createTemplate(dataConnect, createTemplateVars);

console.log(data.template_insert);

// Or, you can use the `Promise` API.
createTemplate(createTemplateVars).then((response) => {
  const data = response.data;
  console.log(data.template_insert);
});
```

### Using `CreateTemplate`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createTemplateRef, CreateTemplateVariables } from '@firebasegen/default-connector';

// The `CreateTemplate` mutation requires an argument of type `CreateTemplateVariables`:
const createTemplateVars: CreateTemplateVariables = {
  title: ..., 
  structureJson: ..., // optional
  exampleStoryId: ..., // optional
};

// Call the `createTemplateRef()` function to get a reference to the mutation.
const ref = createTemplateRef(createTemplateVars);
// Variables can be defined inline as well.
const ref = createTemplateRef({ title: ..., structureJson: ..., exampleStoryId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createTemplateRef(dataConnect, createTemplateVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.template_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.template_insert);
});
```

## CreateAIGeneratedImage
You can execute the `CreateAIGeneratedImage` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createAiGeneratedImage(vars: CreateAiGeneratedImageVariables): MutationPromise<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;

interface CreateAiGeneratedImageRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAiGeneratedImageVariables): MutationRef<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
}
export const createAiGeneratedImageRef: CreateAiGeneratedImageRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAiGeneratedImage(dc: DataConnect, vars: CreateAiGeneratedImageVariables): MutationPromise<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;

interface CreateAiGeneratedImageRef {
  ...
  (dc: DataConnect, vars: CreateAiGeneratedImageVariables): MutationRef<CreateAiGeneratedImageData, CreateAiGeneratedImageVariables>;
}
export const createAiGeneratedImageRef: CreateAiGeneratedImageRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAiGeneratedImageRef:
```typescript
const name = createAiGeneratedImageRef.operationName;
console.log(name);
```

### Variables
The `CreateAIGeneratedImage` mutation requires an argument of type `CreateAiGeneratedImageVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAiGeneratedImageVariables {
  imageId: string;
  userId: string;
  promptText?: string | null;
  sketchUrl?: string | null;
  generatedImageUrl?: string | null;
}
```
### Return Type
Recall that executing the `CreateAIGeneratedImage` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAiGeneratedImageData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAiGeneratedImageData {
  aIGeneratedImage_insert: AIGeneratedImage_Key;
}
```
### Using `CreateAIGeneratedImage`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAiGeneratedImage, CreateAiGeneratedImageVariables } from '@firebasegen/default-connector';

// The `CreateAIGeneratedImage` mutation requires an argument of type `CreateAiGeneratedImageVariables`:
const createAiGeneratedImageVars: CreateAiGeneratedImageVariables = {
  imageId: ..., 
  userId: ..., 
  promptText: ..., // optional
  sketchUrl: ..., // optional
  generatedImageUrl: ..., // optional
};

// Call the `createAiGeneratedImage()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAiGeneratedImage(createAiGeneratedImageVars);
// Variables can be defined inline as well.
const { data } = await createAiGeneratedImage({ imageId: ..., userId: ..., promptText: ..., sketchUrl: ..., generatedImageUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAiGeneratedImage(dataConnect, createAiGeneratedImageVars);

console.log(data.aIGeneratedImage_insert);

// Or, you can use the `Promise` API.
createAiGeneratedImage(createAiGeneratedImageVars).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedImage_insert);
});
```

### Using `CreateAIGeneratedImage`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAiGeneratedImageRef, CreateAiGeneratedImageVariables } from '@firebasegen/default-connector';

// The `CreateAIGeneratedImage` mutation requires an argument of type `CreateAiGeneratedImageVariables`:
const createAiGeneratedImageVars: CreateAiGeneratedImageVariables = {
  imageId: ..., 
  userId: ..., 
  promptText: ..., // optional
  sketchUrl: ..., // optional
  generatedImageUrl: ..., // optional
};

// Call the `createAiGeneratedImageRef()` function to get a reference to the mutation.
const ref = createAiGeneratedImageRef(createAiGeneratedImageVars);
// Variables can be defined inline as well.
const ref = createAiGeneratedImageRef({ imageId: ..., userId: ..., promptText: ..., sketchUrl: ..., generatedImageUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAiGeneratedImageRef(dataConnect, createAiGeneratedImageVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.aIGeneratedImage_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedImage_insert);
});
```

## CreateAIGeneratedGIF
You can execute the `CreateAIGeneratedGIF` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createAiGeneratedGif(vars: CreateAiGeneratedGifVariables): MutationPromise<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;

interface CreateAiGeneratedGifRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAiGeneratedGifVariables): MutationRef<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
}
export const createAiGeneratedGifRef: CreateAiGeneratedGifRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAiGeneratedGif(dc: DataConnect, vars: CreateAiGeneratedGifVariables): MutationPromise<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;

interface CreateAiGeneratedGifRef {
  ...
  (dc: DataConnect, vars: CreateAiGeneratedGifVariables): MutationRef<CreateAiGeneratedGifData, CreateAiGeneratedGifVariables>;
}
export const createAiGeneratedGifRef: CreateAiGeneratedGifRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAiGeneratedGifRef:
```typescript
const name = createAiGeneratedGifRef.operationName;
console.log(name);
```

### Variables
The `CreateAIGeneratedGIF` mutation requires an argument of type `CreateAiGeneratedGifVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAiGeneratedGifVariables {
  imageId: string;
  gifUrl: string;
}
```
### Return Type
Recall that executing the `CreateAIGeneratedGIF` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAiGeneratedGifData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAiGeneratedGifData {
  aIGeneratedGIF_insert: AIGeneratedGIF_Key;
}
```
### Using `CreateAIGeneratedGIF`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAiGeneratedGif, CreateAiGeneratedGifVariables } from '@firebasegen/default-connector';

// The `CreateAIGeneratedGIF` mutation requires an argument of type `CreateAiGeneratedGifVariables`:
const createAiGeneratedGifVars: CreateAiGeneratedGifVariables = {
  imageId: ..., 
  gifUrl: ..., 
};

// Call the `createAiGeneratedGif()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAiGeneratedGif(createAiGeneratedGifVars);
// Variables can be defined inline as well.
const { data } = await createAiGeneratedGif({ imageId: ..., gifUrl: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAiGeneratedGif(dataConnect, createAiGeneratedGifVars);

console.log(data.aIGeneratedGIF_insert);

// Or, you can use the `Promise` API.
createAiGeneratedGif(createAiGeneratedGifVars).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedGIF_insert);
});
```

### Using `CreateAIGeneratedGIF`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAiGeneratedGifRef, CreateAiGeneratedGifVariables } from '@firebasegen/default-connector';

// The `CreateAIGeneratedGIF` mutation requires an argument of type `CreateAiGeneratedGifVariables`:
const createAiGeneratedGifVars: CreateAiGeneratedGifVariables = {
  imageId: ..., 
  gifUrl: ..., 
};

// Call the `createAiGeneratedGifRef()` function to get a reference to the mutation.
const ref = createAiGeneratedGifRef(createAiGeneratedGifVars);
// Variables can be defined inline as well.
const ref = createAiGeneratedGifRef({ imageId: ..., gifUrl: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAiGeneratedGifRef(dataConnect, createAiGeneratedGifVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.aIGeneratedGIF_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.aIGeneratedGIF_insert);
});
```

## CreatePayment
You can execute the `CreatePayment` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createPayment(vars: CreatePaymentVariables): MutationPromise<CreatePaymentData, CreatePaymentVariables>;

interface CreatePaymentRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreatePaymentVariables): MutationRef<CreatePaymentData, CreatePaymentVariables>;
}
export const createPaymentRef: CreatePaymentRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createPayment(dc: DataConnect, vars: CreatePaymentVariables): MutationPromise<CreatePaymentData, CreatePaymentVariables>;

interface CreatePaymentRef {
  ...
  (dc: DataConnect, vars: CreatePaymentVariables): MutationRef<CreatePaymentData, CreatePaymentVariables>;
}
export const createPaymentRef: CreatePaymentRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createPaymentRef:
```typescript
const name = createPaymentRef.operationName;
console.log(name);
```

### Variables
The `CreatePayment` mutation requires an argument of type `CreatePaymentVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreatePaymentVariables {
  userId: string;
  appSubscriptionId: string;
  amount: number;
}
```
### Return Type
Recall that executing the `CreatePayment` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreatePaymentData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreatePaymentData {
  payment_insert: Payment_Key;
}
```
### Using `CreatePayment`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createPayment, CreatePaymentVariables } from '@firebasegen/default-connector';

// The `CreatePayment` mutation requires an argument of type `CreatePaymentVariables`:
const createPaymentVars: CreatePaymentVariables = {
  userId: ..., 
  appSubscriptionId: ..., 
  amount: ..., 
};

// Call the `createPayment()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createPayment(createPaymentVars);
// Variables can be defined inline as well.
const { data } = await createPayment({ userId: ..., appSubscriptionId: ..., amount: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createPayment(dataConnect, createPaymentVars);

console.log(data.payment_insert);

// Or, you can use the `Promise` API.
createPayment(createPaymentVars).then((response) => {
  const data = response.data;
  console.log(data.payment_insert);
});
```

### Using `CreatePayment`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createPaymentRef, CreatePaymentVariables } from '@firebasegen/default-connector';

// The `CreatePayment` mutation requires an argument of type `CreatePaymentVariables`:
const createPaymentVars: CreatePaymentVariables = {
  userId: ..., 
  appSubscriptionId: ..., 
  amount: ..., 
};

// Call the `createPaymentRef()` function to get a reference to the mutation.
const ref = createPaymentRef(createPaymentVars);
// Variables can be defined inline as well.
const ref = createPaymentRef({ userId: ..., appSubscriptionId: ..., amount: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createPaymentRef(dataConnect, createPaymentVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.payment_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.payment_insert);
});
```

## CreateAdminAction
You can execute the `CreateAdminAction` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createAdminAction(vars: CreateAdminActionVariables): MutationPromise<CreateAdminActionData, CreateAdminActionVariables>;

interface CreateAdminActionRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAdminActionVariables): MutationRef<CreateAdminActionData, CreateAdminActionVariables>;
}
export const createAdminActionRef: CreateAdminActionRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAdminAction(dc: DataConnect, vars: CreateAdminActionVariables): MutationPromise<CreateAdminActionData, CreateAdminActionVariables>;

interface CreateAdminActionRef {
  ...
  (dc: DataConnect, vars: CreateAdminActionVariables): MutationRef<CreateAdminActionData, CreateAdminActionVariables>;
}
export const createAdminActionRef: CreateAdminActionRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAdminActionRef:
```typescript
const name = createAdminActionRef.operationName;
console.log(name);
```

### Variables
The `CreateAdminAction` mutation requires an argument of type `CreateAdminActionVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAdminActionVariables {
  adminId: string;
  actionType: string;
  targetId?: string | null;
  description?: string | null;
}
```
### Return Type
Recall that executing the `CreateAdminAction` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAdminActionData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAdminActionData {
  adminAction_insert: AdminAction_Key;
}
```
### Using `CreateAdminAction`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAdminAction, CreateAdminActionVariables } from '@firebasegen/default-connector';

// The `CreateAdminAction` mutation requires an argument of type `CreateAdminActionVariables`:
const createAdminActionVars: CreateAdminActionVariables = {
  adminId: ..., 
  actionType: ..., 
  targetId: ..., // optional
  description: ..., // optional
};

// Call the `createAdminAction()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAdminAction(createAdminActionVars);
// Variables can be defined inline as well.
const { data } = await createAdminAction({ adminId: ..., actionType: ..., targetId: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAdminAction(dataConnect, createAdminActionVars);

console.log(data.adminAction_insert);

// Or, you can use the `Promise` API.
createAdminAction(createAdminActionVars).then((response) => {
  const data = response.data;
  console.log(data.adminAction_insert);
});
```

### Using `CreateAdminAction`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAdminActionRef, CreateAdminActionVariables } from '@firebasegen/default-connector';

// The `CreateAdminAction` mutation requires an argument of type `CreateAdminActionVariables`:
const createAdminActionVars: CreateAdminActionVariables = {
  adminId: ..., 
  actionType: ..., 
  targetId: ..., // optional
  description: ..., // optional
};

// Call the `createAdminActionRef()` function to get a reference to the mutation.
const ref = createAdminActionRef(createAdminActionVars);
// Variables can be defined inline as well.
const ref = createAdminActionRef({ adminId: ..., actionType: ..., targetId: ..., description: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAdminActionRef(dataConnect, createAdminActionVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.adminAction_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.adminAction_insert);
});
```

## CreateAnalyticsEntry
You can execute the `CreateAnalyticsEntry` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
createAnalyticsEntry(vars: CreateAnalyticsEntryVariables): MutationPromise<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;

interface CreateAnalyticsEntryRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateAnalyticsEntryVariables): MutationRef<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
}
export const createAnalyticsEntryRef: CreateAnalyticsEntryRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAnalyticsEntry(dc: DataConnect, vars: CreateAnalyticsEntryVariables): MutationPromise<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;

interface CreateAnalyticsEntryRef {
  ...
  (dc: DataConnect, vars: CreateAnalyticsEntryVariables): MutationRef<CreateAnalyticsEntryData, CreateAnalyticsEntryVariables>;
}
export const createAnalyticsEntryRef: CreateAnalyticsEntryRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAnalyticsEntryRef:
```typescript
const name = createAnalyticsEntryRef.operationName;
console.log(name);
```

### Variables
The `CreateAnalyticsEntry` mutation requires an argument of type `CreateAnalyticsEntryVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateAnalyticsEntryVariables {
  userId: string;
  storyId: string;
  action: string;
}
```
### Return Type
Recall that executing the `CreateAnalyticsEntry` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAnalyticsEntryData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAnalyticsEntryData {
  analytics_insert: Analytics_Key;
}
```
### Using `CreateAnalyticsEntry`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAnalyticsEntry, CreateAnalyticsEntryVariables } from '@firebasegen/default-connector';

// The `CreateAnalyticsEntry` mutation requires an argument of type `CreateAnalyticsEntryVariables`:
const createAnalyticsEntryVars: CreateAnalyticsEntryVariables = {
  userId: ..., 
  storyId: ..., 
  action: ..., 
};

// Call the `createAnalyticsEntry()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAnalyticsEntry(createAnalyticsEntryVars);
// Variables can be defined inline as well.
const { data } = await createAnalyticsEntry({ userId: ..., storyId: ..., action: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAnalyticsEntry(dataConnect, createAnalyticsEntryVars);

console.log(data.analytics_insert);

// Or, you can use the `Promise` API.
createAnalyticsEntry(createAnalyticsEntryVars).then((response) => {
  const data = response.data;
  console.log(data.analytics_insert);
});
```

### Using `CreateAnalyticsEntry`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAnalyticsEntryRef, CreateAnalyticsEntryVariables } from '@firebasegen/default-connector';

// The `CreateAnalyticsEntry` mutation requires an argument of type `CreateAnalyticsEntryVariables`:
const createAnalyticsEntryVars: CreateAnalyticsEntryVariables = {
  userId: ..., 
  storyId: ..., 
  action: ..., 
};

// Call the `createAnalyticsEntryRef()` function to get a reference to the mutation.
const ref = createAnalyticsEntryRef(createAnalyticsEntryVars);
// Variables can be defined inline as well.
const ref = createAnalyticsEntryRef({ userId: ..., storyId: ..., action: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAnalyticsEntryRef(dataConnect, createAnalyticsEntryVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.analytics_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.analytics_insert);
});
```

## LogLegalDisclaimerAcceptance
You can execute the `LogLegalDisclaimerAcceptance` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [default-connector/index.d.ts](./index.d.ts):
```typescript
logLegalDisclaimerAcceptance(vars: LogLegalDisclaimerAcceptanceVariables): MutationPromise<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;

interface LogLegalDisclaimerAcceptanceRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogLegalDisclaimerAcceptanceVariables): MutationRef<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
}
export const logLegalDisclaimerAcceptanceRef: LogLegalDisclaimerAcceptanceRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
logLegalDisclaimerAcceptance(dc: DataConnect, vars: LogLegalDisclaimerAcceptanceVariables): MutationPromise<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;

interface LogLegalDisclaimerAcceptanceRef {
  ...
  (dc: DataConnect, vars: LogLegalDisclaimerAcceptanceVariables): MutationRef<LogLegalDisclaimerAcceptanceData, LogLegalDisclaimerAcceptanceVariables>;
}
export const logLegalDisclaimerAcceptanceRef: LogLegalDisclaimerAcceptanceRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the logLegalDisclaimerAcceptanceRef:
```typescript
const name = logLegalDisclaimerAcceptanceRef.operationName;
console.log(name);
```

### Variables
The `LogLegalDisclaimerAcceptance` mutation requires an argument of type `LogLegalDisclaimerAcceptanceVariables`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface LogLegalDisclaimerAcceptanceVariables {
  userId: string;
}
```
### Return Type
Recall that executing the `LogLegalDisclaimerAcceptance` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `LogLegalDisclaimerAcceptanceData`, which is defined in [default-connector/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface LogLegalDisclaimerAcceptanceData {
  legalDisclaimer_insert: LegalDisclaimer_Key;
}
```
### Using `LogLegalDisclaimerAcceptance`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, logLegalDisclaimerAcceptance, LogLegalDisclaimerAcceptanceVariables } from '@firebasegen/default-connector';

// The `LogLegalDisclaimerAcceptance` mutation requires an argument of type `LogLegalDisclaimerAcceptanceVariables`:
const logLegalDisclaimerAcceptanceVars: LogLegalDisclaimerAcceptanceVariables = {
  userId: ..., 
};

// Call the `logLegalDisclaimerAcceptance()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await logLegalDisclaimerAcceptance(logLegalDisclaimerAcceptanceVars);
// Variables can be defined inline as well.
const { data } = await logLegalDisclaimerAcceptance({ userId: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await logLegalDisclaimerAcceptance(dataConnect, logLegalDisclaimerAcceptanceVars);

console.log(data.legalDisclaimer_insert);

// Or, you can use the `Promise` API.
logLegalDisclaimerAcceptance(logLegalDisclaimerAcceptanceVars).then((response) => {
  const data = response.data;
  console.log(data.legalDisclaimer_insert);
});
```

### Using `LogLegalDisclaimerAcceptance`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, logLegalDisclaimerAcceptanceRef, LogLegalDisclaimerAcceptanceVariables } from '@firebasegen/default-connector';

// The `LogLegalDisclaimerAcceptance` mutation requires an argument of type `LogLegalDisclaimerAcceptanceVariables`:
const logLegalDisclaimerAcceptanceVars: LogLegalDisclaimerAcceptanceVariables = {
  userId: ..., 
};

// Call the `logLegalDisclaimerAcceptanceRef()` function to get a reference to the mutation.
const ref = logLegalDisclaimerAcceptanceRef(logLegalDisclaimerAcceptanceVars);
// Variables can be defined inline as well.
const ref = logLegalDisclaimerAcceptanceRef({ userId: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = logLegalDisclaimerAcceptanceRef(dataConnect, logLegalDisclaimerAcceptanceVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.legalDisclaimer_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.legalDisclaimer_insert);
});
```

