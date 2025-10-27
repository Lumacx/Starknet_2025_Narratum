# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useGetUserProfile, useGetStoryWithContent, useGetAllStories, useGetAppSubscription, useGetTemplate, useGetAllTemplates, useGetAiGeneratedImage, useGetAiGeneratedGif, useGetPayment, useGetAdminAction } from '@firebasegen/default-connector/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useGetUserProfile(getUserProfileVars);

const { data, isPending, isSuccess, isError, error } = useGetStoryWithContent(getStoryWithContentVars);

const { data, isPending, isSuccess, isError, error } = useGetAllStories();

const { data, isPending, isSuccess, isError, error } = useGetAppSubscription(getAppSubscriptionVars);

const { data, isPending, isSuccess, isError, error } = useGetTemplate(getTemplateVars);

const { data, isPending, isSuccess, isError, error } = useGetAllTemplates();

const { data, isPending, isSuccess, isError, error } = useGetAiGeneratedImage(getAiGeneratedImageVars);

const { data, isPending, isSuccess, isError, error } = useGetAiGeneratedGif(getAiGeneratedGifVars);

const { data, isPending, isSuccess, isError, error } = useGetPayment(getPaymentVars);

const { data, isPending, isSuccess, isError, error } = useGetAdminAction(getAdminActionVars);

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
import { getUserProfile, getStoryWithContent, getAllStories, getAppSubscription, getTemplate, getAllTemplates, getAiGeneratedImage, getAiGeneratedGif, getPayment, getAdminAction } from '@firebasegen/default-connector';


// Operation GetUserProfile:  For variables, look at type GetUserProfileVars in ../index.d.ts
const { data } = await GetUserProfile(dataConnect, getUserProfileVars);

// Operation GetStoryWithContent:  For variables, look at type GetStoryWithContentVars in ../index.d.ts
const { data } = await GetStoryWithContent(dataConnect, getStoryWithContentVars);

// Operation GetAllStories: 
const { data } = await GetAllStories(dataConnect);

// Operation GetAppSubscription:  For variables, look at type GetAppSubscriptionVars in ../index.d.ts
const { data } = await GetAppSubscription(dataConnect, getAppSubscriptionVars);

// Operation GetTemplate:  For variables, look at type GetTemplateVars in ../index.d.ts
const { data } = await GetTemplate(dataConnect, getTemplateVars);

// Operation GetAllTemplates: 
const { data } = await GetAllTemplates(dataConnect);

// Operation GetAiGeneratedImage:  For variables, look at type GetAiGeneratedImageVars in ../index.d.ts
const { data } = await GetAiGeneratedImage(dataConnect, getAiGeneratedImageVars);

// Operation GetAiGeneratedGif:  For variables, look at type GetAiGeneratedGifVars in ../index.d.ts
const { data } = await GetAiGeneratedGif(dataConnect, getAiGeneratedGifVars);

// Operation GetPayment:  For variables, look at type GetPaymentVars in ../index.d.ts
const { data } = await GetPayment(dataConnect, getPaymentVars);

// Operation GetAdminAction:  For variables, look at type GetAdminActionVars in ../index.d.ts
const { data } = await GetAdminAction(dataConnect, getAdminActionVars);


```