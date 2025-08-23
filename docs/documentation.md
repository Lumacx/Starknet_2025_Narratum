# Narratum Documentation

## 1. Introduction

Narratum is a modern storytelling application that empowers creators to craft and share interactive and engaging narratives. The platform provides tools for building stories with rich multimedia content, guided by templates and enhanced by AI-powered writing assistance. This document provides a comprehensive overview of the Narratum project, its structure, and its core functionalities.

## 2. Project Structure

The Narratum project is organized into several key directories, each serving a specific purpose. This structure promotes a clean and maintainable codebase.

- **`src/`**: This is the main source code directory for the Next.js application.
  - **`app/`**: Contains the pages and routes of the application. Each subdirectory corresponds to a route (e.g., `/`, `/about`, `/create`).
    - **`page.tsx`**: The main landing page of the application.
    - **`create/page.tsx`**: The page for creating a new story.
    - **`discover/page.tsx`**: The page for discovering stories created by other users.
    - **`profile/page.tsx`**: The user's profile page.
  - **`components/`**: Holds the reusable React components used throughout the application. This includes both UI elements (e.g., buttons, cards) and higher-level components (e.g., header, footer).
  - **`context/`**: Contains the React context providers, such as the `AuthContext` for managing user authentication.
  - **`hooks/`**: Stores custom React hooks that encapsulate reusable logic.
  - **`lib/`**: Includes utility functions and libraries, such as the Firebase configuration.
  - **`ai/`**: This directory contains the AI-related code, including Genkit flows and functions.
    - **`genkit.ts`**: The configuration file for the Genkit AI plugin.
    - **`flows/generate-writing-prompts.ts`**: The Genkit flow for generating AI-suggested writing prompts.
- **`public/`**: Stores static assets like images, fonts, and other files that are publicly accessible.
- **`docs/`**: Contains project documentation, including this file and the project blueprint.
- **`dataconnect/`**: This directory holds the configuration and schema for the DataConnect service, which manages the application's database.
- **`functions/`**: This directory contains the Firebase Cloud Functions that serve as the backend for certain operations, such as image generation and authentication triggers. It is a separate Node.js project managed by `npm`.
  - **`assetsIndex.ts`**: This function listens to Firebase Storage events (object finalization and deletion) within `users/{uid}/assets/**` paths. It automatically indexes metadata (like `uid`, `path`, `fileName`, `category`, `mediaType`, `size`, `contentType`, `source`, `createdAt`) for these assets into a Firestore collection named `assetsIndex`. This allows for efficient querying and management of user-uploaded content (e.g., avatars, story illustrations, backgrounds) without directly querying Storage.
  - **`authTriggers.ts`**: This function is triggered upon new user creation in Firebase Authentication. It automatically creates a corresponding user profile document in the `users` Firestore collection, populating it with essential details like `uid`, `email`, `username`, `displayName`, `role`, and timestamps. This ensures a standardized and immediate user data structure for new sign-ups.
  - **`commentCounter.ts`**: This function is a Firestore trigger that automatically increments the `commentsCount` field on a `story` document whenever a new comment is added to the `comments` collection. It also updates the `updatedAt` timestamp of the story, providing real-time feedback on story engagement.

## 3. Core Features

Narratum offers a range of features designed to enhance the storytelling experience for both creators and readers.

- **Interactive Story Display with Multimedia Support**: Stories are presented in an interactive format, allowing users to navigate through pages and chapters with ease. This includes dynamic loading and display of:
    *   **Background Music**: Stories can feature background music that plays throughout the reading experience, fetched dynamically from the story data.
    *   **Page Backgrounds**: Each story page can have a unique background image, loaded dynamically from the page content data.
    *   **Narrator Avatars**: The story reader displays the avatar of the story's creator, fetched dynamically from user profile data, enhancing the personalized reading experience.
- **Template-Driven Story Creation**: Creators can use predefined templates to structure their stories. The `create/page.tsx` file shows how users can select from a list of mock templates such as "Three-Act Structure", "The Hero's Journey", and "Freytag's Pyramid". The creation process now involves a guided flow (managed by `src/app/create/page.tsx`, `src/app/create/begin/page.tsx`, and `src/app/create/support/page.tsx`) that assists users in defining initial prompts, selecting templates, and providing reference materials.
- **Story Content Editing**: Users can create and edit the textual content of individual story pages within a dedicated editor. This includes functionality for navigating between pages and an auto-save feature to ensure content is regularly preserved.
- **AI Writing Prompts**: The application integrates with an AI tool to provide writing prompts. The `src/ai/flows/generate-writing-prompts.ts` file defines a Genkit flow that takes a story template and user input to generate a list of compelling writing prompts.
- **User Authentication**: Narratum supports multiple authentication methods to provide flexibility for users:
    *   **Google Sign-In (GSI) Button**: Users can seamlessly sign in using their Google accounts. This method integrates with Firebase Authentication for secure and convenient access.
    *   **Starknet Wallet Connection**: For users in the decentralized ecosystem, Narratum allows login and profile management through Starknet-compatible wallets.
    *   **Email/Password**: Traditional email and password authentication is also supported via Firebase, allowing for straightforward account creation and login.

    The `AuthContext.tsx` file centrally manages the authentication state across all these methods.
- **Story Discovery Page with Search and Filtering**: This page provides a comprehensive interface for users to find stories within the Narratum platform.
    *   **UI Implementation (Completed)**: The user interface for the "Discover" page (`src/app/discover/page.tsx`) has been designed and implemented. It includes a prominent search bar for semantic searches, flexible genre/tag filters via a reusable `GenreMultiSelect` component, and an appealing grid display of story previews (cards).
    *   **Semantic Search Integration (Completed)**: The page is fully integrated with the `src/app/api/semantic-search/route.ts` API endpoint, allowing users to perform AI-powered semantic searches for stories based on themes and concepts. Search results are effectively filtered and displayed.
    *   **Filtering Capabilities (Implemented)**: Users can effectively filter stories based on various criteria, including:
        *   **Popularity**: Stories can be sorted to show the most viewed ones.
        *   **Recency**: Stories can be sorted to display the most recently created or published content.
        *   **Genres/Tags**: Users can select one or more genres from a predefined list (e.g., Fantasy, Sci-Fi, Mystery) to narrow down their search, leveraging the updated `genres` array field in the `Story` schema.
    *   **Enriched Story Cards (Implemented)**: Story preview cards now display additional relevant information including the author's display name and the count of comments, providing more context to users before they click on a story.
- **Profile Management**: Users can create and manage their profiles, view their created stories, and track their reading progress. Key features include:
    *   **Avatar Management**: Users can personalize their profiles by uploading custom avatars using the `AvatarUploader` component. These uploaded assets are automatically indexed by the `assetsIndex` Firebase Function for streamlined management and retrieval.
    *   **Profile Data**: Update and view personal information associated with their account.
- **AI Image Generation**: The application now supports AI-powered image generation, allowing creators to generate custom illustrations for their stories based on textual descriptions and even initial sketch inputs. The editor provides a UI for entering prompts, initiating generation, displaying a progress bar, and showing the generated image. **Generated images can now be seamlessly saved and associated with individual story content pages, with their metadata indexed by the `assetsIndex` Firebase Function and stored in Firebase Storage.** This feature is exposed via the `generateNarratumImage` Firebase Cloud Function.
- **Semantic Search**: Narratum now includes a semantic search capability, allowing users to discover stories based on themes and concepts rather than just keywords. This feature leverages the Gemini API to analyze story titles and provide semantically relevant results, enhancing story discovery on the platform.
- **Community Features**: Narratum incorporates social interaction features directly within the story viewing experience, allowing readers to engage with content and creators. These include:
    *   **Reactions**: Users can express their appreciation or emotion towards a story by adding reactions such as 'like' (👍), 'love' (❤️), and 'wow' (😮).
    *   **Comments**: Readers can leave comments on stories, fostering discussion and feedback. Comments display the author's avatar and display name, providing context to the cohesion. The `commentCounter.ts` Firebase Function automatically updates the `commentsCount` on the associated story, providing a live indicator of engagement.

### 3.1. Story Creation Flow

The story creation process in Narratum is a guided, multi-step workflow designed to assist creators from initial concept to a fully illustrated and narrated story. This flow is visually represented in `public/narratum_creation_sections.PNG` and is managed by the pages within the `src/app/create/` directory.

The key stages of the creation flow include:

1.  **Initial Story Setup (`src/app/create/page.tsx`)**: This is where creators begin by providing fundamental story metadata such as title, description, and genre.
2.  **Prompt Guidance & References (`src/app/create/begin/page.tsx`)**: Users are guided through initial story prompting, potentially with template selection and the display of reference materials to kickstart their creativity.
3.  **Story Prompting & Content Entry**: This stage involves a robust text editor for writing the story's narrative content, chapter by chapter or page by page. AI writing prompts can be integrated here to assist creators.
4.  **Illustration Generation (`src/app/create/support/page.tsx` for support/guidance during generation)**: Creators can generate AI-powered images for each story page. This involves entering image prompts, initiating the generation process, and selecting/refining the generated visuals. The generated images are then saved and linked to the story content.
5.  **Narration Addition**: This stage allows creators to add audio narrations to each page, either through AI text-to-speech functionality or by uploading custom audio files.
6.  **Full Storybook Review**: Before publishing, creators can preview their complete interactive story in a pop-up eReader, experiencing the integrated images, text, and audio.

## 4. Technical Stack

The Narratum application is built with a modern and robust technology stack:

- **Frontend**:
  - **Framework**: [Next.js](https://nextjs.org/) (React)
  - **Styling**: [Tailwind CSS](https://tailwindcss.com/)
  - **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **Backend**:
  - **Serverless Functions**: [Firebase Functions](https://firebase.google.com/docs/functions)
  - **AI Integration**: [Genkit](https://firebase.google.com/docs/genkit)
- **Database**:
  - **Service**: [DataConnect](https://firebase.google.com/docs/dataconnect)
  - **Database Engine**: PostgreSQL
- **Authentication**:
  - **Providers**: [Firebase Authentication](https://firebase.google.com/docs/auth), [Starknet](https://www.starknet.io/)

## 5. Data Model

The application's data is stored in a PostgreSQL database managed by DataConnect. The main tables are:

- **`story`**: Stores the metadata for each story, including the title, description, genre, and creator.
- **`story_content`**: Contains the actual content of the stories, with each row representing a page or a section of a story.
- **`template`**: Holds the templates that can be used for creating new stories.
- **`user`**: Stores user information for authentication and profile management.

## 6. Getting Started

To set up and run the Narratum project locally, follow these steps:

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd narratum
    ```
2.  **Install root dependencies (Next.js application)**:
    ```bash
    pnpm install
    ```
3.  **Install Firebase Functions dependencies**:
    ```bash
    cd functions
    npm install
    cd ..
    ```
4.  **Set up environment variables**:
    - Create a `.env.local` file in the root of the project.
    - Add the necessary Firebase and other configuration details to this file.
5.  **Run the development server**:
    ```bash
    pnpm run dev
    ```
6.  **Deploy Firebase Functions (if changes are made to functions)**:
    ```bash
    firebase deploy --only functions
    ```
7.  **Open the application**:
    - Open your browser and navigate to `http://localhost:3000`.
