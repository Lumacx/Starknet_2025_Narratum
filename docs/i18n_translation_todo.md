# i18n Translation To-Do List

This document outlines the plan and progress for implementing internationalization (i18n) to support English and Spanish languages.

**High-Level Plan:**

1.  **Create i18n Infrastructure:**
    *   Create a `LocaleContext.tsx` file to manage the current language state and provide a translation function. (Completed in previous steps)
    *   Create a `public/locales` directory containing `en.json` and `es.json` files for translations. (Completed in previous steps)
    *   Wrap the entire application with the `LocaleProvider` in `src/app/layout.tsx`. (Completed)

2.  **Modify Header Component:** Update `src/components/header.tsx` to use the `LocaleContext` for all its visible text elements, replacing hardcoded strings with translation keys. (Completed)

3.  **Iterate Through Pages/Components:** For each identified page or component, I will:
    *   Read the file content.
    *   Identify all hardcoded UI text.
    *   Add corresponding English and Spanish translations to `en.json` and `es.json` respectively.
    *   Replace the hardcoded text in the component with calls to the translation function (e.g., `t('translation_key')`).

## List of Pages/Components to Modify

This list focuses on files likely to contain significant user-facing text, starting with common elements and core functionalities. This list will be adjusted as needed during the process.

### Core Pages & Components

- [x] `src/app/layout.tsx`: To integrate the `LocaleProvider`.
- [x] `src/components/header.tsx`: The global header, which now includes the language toggle.
- [x] `src/app/page.tsx`: The main landing page.
- [x] `src/components/layout/Footer.tsx`: Common footer text.
- [x] `src/app/login/page.tsx`: Login form and related messages.
- [x] `src/app/signup/page.tsx`: Sign-up form and related messages.
- [x] `src/app/discover/page.tsx`: Story discovery interface.
- [x] `src/app/buy-credits/page.tsx`: Credit purchase page.
- [x] `src/app/subscription/page.tsx`: Subscription management page.
- [x] `src/app/profile/page.tsx`: User profile information.
- [x] `src/app/create/begin/page.tsx`: Initial story creation steps.
- [x] `src/app/create/scenes/page.tsx`: Story scene creation interface.
- [x] `src/app/create/support/page.tsx`: Support/help content for creation.
- [x] `src/app/legal/page.tsx`: Legal documents (e.g., terms of service, privacy policy).
- [x] `src/app/dashboard/page.tsx`: User dashboard.
- [ ] `src/app/ereader/page.tsx`: E-reader interface.
- [ ] `src/app/reader/page.tsx`: Story reader interface.
- [ ] `src/app/about/page.tsx`: About us page.
- [ ] `src/app/checkout/page.tsx`: Checkout process.
- [ ] `src/app/story/[storyId]/page.tsx`: Displaying an individual story.
- [ ] `src/app/story/edit/[storyId]/page.tsx`: Editing an individual story.

### Components with Potential UI Text (to be addressed after pages)

- [ ] `src/components/AvatarUploader.tsx`
- [ ] `src/components/Community.tsx`
- [ ] `src/components/CoverImageManager.tsx`
- [ ] `src/components/GSIButton.tsx`
- [ ] `src/components/GenreMultiSelect.tsx`
- [ ] `src/components/ImageGenPanel.tsx`
- [ ] `src/components/InfoPopover.tsx`
- [ ] `src/components/PayPalProviderClient.tsx`
- [ ] `src/components/ReaderSkinPicker.tsx`
- [ ] `src/components/StoryReader.tsx`
- [ ] `src/components/UploadImageReference.tsx`
- [ ] `src/components/YoutubeVideoPlayer.tsx`
- [ ] `src/components/ai-writing-prompts.tsx`
- [ ] `src/components/interactive-story-display.tsx`
- [ ] `src/components/template-driven-story-creation.tsx`
- [ ] `src/components/Starknet/StarknetProviderComponent.tsx`
- [ ] `src/components/premium/ElevenLabsConvai.tsx`
- [ ] Any relevant `src/components/ui/*.tsx` components as they are encountered.
