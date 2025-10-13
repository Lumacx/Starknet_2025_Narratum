# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useCreateUserProfile, useCreateStory, useCreateStoryContent, useCreateTemplate, useCreateAiGeneratedImage, useCreateAiGeneratedGif, useCreatePayment, useCreateAdminAction, useCreateAnalyticsEntry, useLogLegalDisclaimerAcceptance } from '@firebasegen/default-connector/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useCreateUserProfile(createUserProfileVars);

const { data, isPending, isSuccess, isError, error } = useCreateStory(createStoryVars);

const { data, isPending, isSuccess, isError, error } = useCreateStoryContent(createStoryContentVars);

const { data, isPending, isSuccess, isError, error } = useCreateTemplate(createTemplateVars);

const { data, isPending, isSuccess, isError, error } = useCreateAiGeneratedImage(createAiGeneratedImageVars);

const { data, isPending, isSuccess, isError, error } = useCreateAiGeneratedGif(createAiGeneratedGifVars);

const { data, isPending, isSuccess, isError, error } = useCreatePayment(createPaymentVars);

const { data, isPending, isSuccess, isError, error } = useCreateAdminAction(createAdminActionVars);

const { data, isPending, isSuccess, isError, error } = useCreateAnalyticsEntry(createAnalyticsEntryVars);

const { data, isPending, isSuccess, isError, error } = useLogLegalDisclaimerAcceptance(logLegalDisclaimerAcceptanceVars);

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { createUserProfile, createStory, createStoryContent, createTemplate, createAiGeneratedImage, createAiGeneratedGif, createPayment, createAdminAction, createAnalyticsEntry, logLegalDisclaimerAcceptance } from '@firebasegen/default-connector';


// Operation CreateUserProfile:  For variables, look at type CreateUserProfileVars in ../index.d.ts
const { data } = await CreateUserProfile(dataConnect, createUserProfileVars);

// Operation CreateStory:  For variables, look at type CreateStoryVars in ../index.d.ts
const { data } = await CreateStory(dataConnect, createStoryVars);

// Operation CreateStoryContent:  For variables, look at type CreateStoryContentVars in ../index.d.ts
const { data } = await CreateStoryContent(dataConnect, createStoryContentVars);

// Operation CreateTemplate:  For variables, look at type CreateTemplateVars in ../index.d.ts
const { data } = await CreateTemplate(dataConnect, createTemplateVars);

// Operation CreateAiGeneratedImage:  For variables, look at type CreateAiGeneratedImageVars in ../index.d.ts
const { data } = await CreateAiGeneratedImage(dataConnect, createAiGeneratedImageVars);

// Operation CreateAiGeneratedGif:  For variables, look at type CreateAiGeneratedGifVars in ../index.d.ts
const { data } = await CreateAiGeneratedGif(dataConnect, createAiGeneratedGifVars);

// Operation CreatePayment:  For variables, look at type CreatePaymentVars in ../index.d.ts
const { data } = await CreatePayment(dataConnect, createPaymentVars);

// Operation CreateAdminAction:  For variables, look at type CreateAdminActionVars in ../index.d.ts
const { data } = await CreateAdminAction(dataConnect, createAdminActionVars);

// Operation CreateAnalyticsEntry:  For variables, look at type CreateAnalyticsEntryVars in ../index.d.ts
const { data } = await CreateAnalyticsEntry(dataConnect, createAnalyticsEntryVars);

// Operation LogLegalDisclaimerAcceptance:  For variables, look at type LogLegalDisclaimerAcceptanceVars in ../index.d.ts
const { data } = await LogLegalDisclaimerAcceptance(dataConnect, logLegalDisclaimerAcceptanceVars);


```