# eReader Integration Documentation

This document outlines the planned integration tasks to combine the "HTML Code for eReader Nice" functionality with the "Story_Reader" look and feel, specifically for the "View Full Storybook" pop-up, and to integrate the Firebase Backend for persistent storage of stories, images, and audio.

## 1. Integrate "HTML Code for eReader Nice" with "Story_Reader" Look and Feel

**Objective:** To seamlessly merge the interactive eReader experience from "HTML Code for eReader Nice" with the visual design and user experience of the existing "Story_Reader" component, particularly for the "View Full Storybook" pop-up.

**Key Tasks:**

*   **Analyze UI/UX of `Integrations/HTML Code for eReader Nice`:**
    *   Identify core styling, layout, and interactive elements (e.g., navigation buttons, theme switcher, story content display).
    *   Review CSS rules and HTML structure, especially related to responsiveness and dark/light mode.
*   **Analyze UI/UX of `Integrations/Story_Reader/Index.html`:**
    *   Understand the visual components, font styles, color schemes, and overall aesthetic.
    *   Note how pages are displayed, navigation within a story, and any interactive elements.
*   **Merge Styles and Components:**
    *   Adapt the CSS from "HTML Code for eReader Nice" to align with the "Story_Reader"'s design language.
    *   Refactor HTML elements to use components or classes consistent with the "Story_Reader" if applicable.
    *   Ensure the "View Full Storybook" pop-up inherits the desired look and feel, including transitions and animations.
    *   Pay attention to scrollbar styling, navigation button active states, and overall body background/text colors as seen in the provided snippet.

## 2. Integrate Firebase Backend for Multiple Stories (Images and Audio)

**Objective:** To enable the saving and retrieval of multiple stories, each with its associated images and audio files, using Firebase services.

**Key Tasks:**

*   **Firebase Project Setup (if not already done):**
    *   Ensure Firebase project is correctly initialized and configured within the application.
    *   Verify Firebase Authentication, Firestore, and Storage are enabled.
*   **Firestore Database Design for Stories:**
    *   Define a `stories` collection.
    *   Each story document should include fields such as:
        *   `id` (unique identifier)
        *   `title`
        *   `author` (user ID)
        *   `coverImageUrl` (URL to Firebase Storage)
        *   `pageData` (an array of objects, each containing `text` and `imageUrl`)
        *   `audioData` (an array of objects, each containing `pageNumber` and `audioUrl`)
        *   `createdAt`, `updatedAt` timestamps
        *   `isPublished` (boolean)
*   **Firebase Storage for Images and Audio:**
    *   Implement logic to upload story images to Firebase Storage. Organize them by story ID (e.g., `stories/{storyId}/images/page1.png`).
    *   Implement logic to upload narration audio files to Firebase Storage. Organize them similarly (e.g., `stories/{storyId}/audio/narration_0.mp3`).
    *   Retrieve the public URLs for uploaded files to store in Firestore.
*   **Data Models and Services:**
    *   Create client-side data models (e.g., TypeScript interfaces) that match the Firestore structure.
    *   Develop services or functions to interact with Firestore for:
        *   Creating new stories.
        *   Retrieving a single story by ID.
        *   Listing stories (e.g., by user, by genre).
        *   Updating story content (text, images, audio references).
        *   Deleting stories.
    *   Develop services or functions to interact with Firebase Storage for:
        *   Uploading image files.
        *   Uploading audio files.
        *   Retrieving file URLs.
        *   Deleting files.
*   **User Interface Integration:**
    *   Modify the story creation interface to allow users to upload multiple images and associate audio files with specific pages.
    *   Update the "View Full Storybook" pop-up to dynamically load story data, images, and audio from Firebase based on the selected story.
    *   Implement audio playback controls within the story reader, referencing the Firebase Storage URLs.
    *   Handle loading states and error conditions for data fetching and file streaming.

## Relevant Files and Components:

*   **`Integrations/HTML Code for eReader Nice`**: Source for initial eReader structure and styling.
*   **`Integrations/Story_Reader/Index.html`**: Reference for desired aesthetic and existing story reader logic.
*   **`Integrations/Story_Reader/Story.js`**: Existing JavaScript logic for story handling (will need modification).
*   **Firebase Configuration Files**: e.g., `src/lib/firebase.ts`
*   **GraphQL Schema Files**: If GraphQL is used as an intermediary, files like `src/graphql/schema/story.ts` will need updates.
*   **UI Components**: Any new or existing React/Next.js components for story creation, display, and management (e.g., `src/components/StoryReader.tsx`, `src/app/story/[storyId]/page.tsx`).
*   **Backend Functions (Firebase Functions)**: Potentially `functions/src/index.ts` for any server-side logic related to story processing, image generation, or audio processing.
*   **AI Integration**: If AI is used for image/audio generation, the relevant AI functions (e.g., `src/ai/functions/index.ts`, `src/ai/flows/generate-writing-prompts.ts`) will need to be integrated with the story saving process.