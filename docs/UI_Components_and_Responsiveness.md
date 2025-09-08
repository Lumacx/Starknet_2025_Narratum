# UI Components and Responsiveness

This document details the key UI components within the Narratum application and their strategies for responsive design, providing technical insights for developers.

## 1. StoryReader.tsx

The `StoryReader.tsx` component is central to displaying interactive stories and incorporates a robust responsive design to ensure an optimal reading experience across various devices.

### Responsive Design Principles

The `StoryReader.tsx` utilizes a combination of CSS techniques and conditional rendering logic to adapt to different screen sizes.

-   **`isNarrow` Logic:** A core part of the responsiveness is the `isNarrow` boolean, derived from the `useMobile` hook. This flag determines whether the device is considered "narrow" (typically mobile or small tablet) and triggers specific layout adjustments.
-   **`clamp()` CSS Function:** The `clamp()` CSS function is extensively used for fluid typography and spacing. This allows elements to scale proportionally between a minimum and maximum size, adapting smoothly to viewport changes without abrupt jumps.
    -   *Example Usage:* `font-size: clamp(1rem, 2vw, 1.5rem);` ensures the font size remains within a readable range.
-   **Dynamic `gridTemplateColumns`:** For larger screens, the layout often employs CSS Grid with `gridTemplateColumns` to arrange content. On narrower screens, this might collapse to a single column or adjust to stacked elements, often controlled by the `isNarrow` flag.

### Component Structure and Key Elements

-   **Main Layout:** The overall layout adjusts to present the story content, controls, and premium features effectively.
-   **Audio Controls:** Buttons and sliders for background music, narration, and page-turn sound effects. These are typically positioned to be easily accessible on all screen sizes.
-   **Font Scaling:** Users can adjust font size via a slider. The component dynamically updates the `font-size` property of the story text based on this input, often overriding or complementing the `clamp()` function.
-   **Dynamic Background Images:** The background image for each page changes based on story data. This is managed to ensure images scale and position appropriately across different aspect ratios.

## 2. CoverImageManager.tsx

The `CoverImageManager.tsx` component is responsible for handling the display, upload, AI description, and regeneration of a story's cover image.

### Role and Functionality

-   **Cover Image Display:** Renders the current cover image for the story draft.
-   **Image Upload:** Allows users to upload a custom cover image, integrating with Firebase Storage for persistence.
-   **AI Description:** Utilizes the `/api/describe-image` endpoint to generate a textual description of the uploaded or generated cover image. This description can be used for accessibility or as input for further AI processing.
-   **AI Image Generation:** Provides functionality to generate a new cover image using AI, typically by sending a prompt to the `/api/generate-image` endpoint.
-   **Integration:** It's typically used within the story creation flow (`/create/begin`) to manage the visual identity of a story.

## 3. GenreMultiSelect.tsx

The `GenreMultiSelect.tsx` component provides a user-friendly interface for selecting multiple genres for a story.

### Functionality

-   **Multiple Selection:** Allows users to choose one or more genres from a predefined list.
-   **User Experience:** Offers a clear and intuitive way to manage genre tags, which are crucial for story categorization and discoverability (especially with semantic search).
-   **Data Binding:** Binds the selected genres to the story's metadata in the Firestore document.

## 4. UploadImageReference.tsx

The `UploadImageReference.tsx` component is a versatile tool used within the `/create/support` section for managing image assets. It has dual modes: an uploader/generator and a gallery viewer.

### Dual Modes

-   **Uploader/Generator Mode:**
    -   **Image Upload:** Allows users to upload images from their local machine to be used as references or assets within their story. These are typically stored in Firebase Storage.
    -   **AI Image Generation:** Integrates with the `/api/generate-image` endpoint, allowing users to generate new images based on textual prompts. This is particularly useful for creating character portraits, location backgrounds, or specific objects.
-   **Gallery Mode:**
    -   **Asset Management:** Displays a collection of previously uploaded or generated images.
    -   **Selection:** Users can select images from their gallery to incorporate into their story or use as part of the AI Scene Composer.

### Integration within `/create/support`

This component is critical for the "AI References & Support" section, enabling users to build a library of visual assets for their stories.

## 5. InfoPopover.tsx

The `InfoPopover.tsx` component is used to display contextual "Generation Tips" and other helpful information to the user.

### Functionality

-   **Contextual Help:** Provides brief, on-demand information related to specific UI elements or features.
-   **Markdown Support:** It can render content written in Markdown, allowing for rich text formatting, lists, and code snippets within the popover.
-   **Integration:** Used in various parts of the application, particularly in story creation and AI generation interfaces, to guide users and improve their prompting skills.
    -   *Example:* In the image generation section, it might display "Pro-Tips for Prompting Images" from `public/info_tips/pro-tips-for-prompting-images.md`.

## 6. Dashboard and Profile UI

The UI components for the Dashboard (`/dashboard`) and Profile (`/profile`) pages are designed to efficiently display user-specific data and story statistics.

### Dashboard UI

-   **Story Comparison Statistics:** Components are designed to render charts and numerical data comparing "All App" vs. "My Stories" performance, breakdowns by genre, story type, and subscription plan. This often involves data visualization libraries.
-   **Data Display:** Clear and concise display of aggregated data, ensuring readability and easy interpretation of trends.

### Profile UI

-   **Avatar Uploader:** A dedicated component (`AvatarUploader.tsx`) for users to upload and manage their profile picture. This integrates with Firebase Storage for image persistence.
-   **Story Lists:** Components to display lists of the user's published stories, drafts, and favorited stories. These often include cover images, titles, and basic metadata.
-   **Real-time Updates:** UI elements are designed to react to real-time updates from Firestore, ensuring that user-specific data (like new favorites or updated drafts) is immediately reflected.

This document serves as a guide for understanding the implementation and responsiveness of these core UI components, facilitating future development and maintenance.
