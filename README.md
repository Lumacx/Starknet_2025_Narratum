# Narratum - Storytelling App - Hackathon README

## 1. Business Information

**App Name**: Narratum

### Core Features:

*   **Interactive Story Display**: Display the story content in an interactive format, allowing users to navigate through pages and chapters using intuitive controls.
*   **Template-Driven Story Creation**: Provide guided templates for story creation, allowing users to input text and multimedia content to generate interactive stories.
*   **AI Writing Prompts**: Use an AI tool to provide writing prompts based on the selected template and user input, helping creators overcome writer's block and expand their narratives.

### Style Guidelines (from blueprint):

*   **Primary color**: Navy (#3D4F60)
*   **Accent color**: Pale Gold (#F0D1B0)
*   **Highlight color**: Pale Blue (#D4E1EE)
*   **Additional Accent**: Burnt Sienna (#E97451)
*   **Fonts**: Serif (Cinzel, Playfair Display) for titles (36-48pt), Sans-serif (Open Sans, Roboto) for body text (14-18pt).
*   **Icons**: Flat, minimal, fantasy-inspired (SVG).
*   **UI Elements**: Cards with pale gold background, navy borders, subtle gold decorations.
*   **Animations**: Subtle for page transitions and interactions.

## 2. Project Links & Demonstrations

*   **Main Webpage**: [https://narratum.app/](https://narratum.app/)
*   **Live Demo Video**: [https://youtu.be/HAOe2eY7sUc](https://youtu.be/HAOe2eY7sUc)
    *   *Summary*: This video showcases the Narrative Nexus application in action, demonstrating its user interface and core functionalities like story discovery, interactive reading, and the creation process.
*   **Tool Pitch Video**: [https://youtu.be/3FWhx5Q-nfs](https://youtu.be/3FWhx5Q-nfs)
    *   *Summary*: This video likely explains the technical aspects and innovative tooling behind Narrative Nexus, possibly highlighting the AI integration, template engine, or other unique development choices.
*   **Idea Pitch Video**: [https://youtu.be/mSsXUtKvYo4](https://youtu.be/mSsXUtKvYo4)
    *   *Summary*: This video probably focuses on the concept and vision for Narrative Nexus, outlining the problem it solves, its target audience, and its potential impact on interactive storytelling.

## 3. Technical Documentation

### Main Application Page (`src/app/page.tsx`)

*   **Framework**: Next.js (React-based) using client-side rendering (`'use client';`).
*   **Purpose**: Serves as the main landing page of the Narrative Nexus application.
*   **Routing**: Employs `next/navigation` (`useRouter`, `Link`) for navigation between different parts of the application.
*   **Authentication**:
    *   Integrates with `AuthContext` (see below) to manage user authentication status, supporting both Firebase email/password and Starknet wallet authentication.
    *   Displays a loading state while authentication status is being verified.
    *   Conditionally renders UI elements and controls navigation based on the user's login state. For instance, "Create Story" and "My Profile" functionalities are accessible only to logged-in users.
*   **User Interface (UI)**:
    *   Presents a welcoming interface with a gradient background and distinct typography (Lato, Georgia).
    *   Features a prominent header: "WELCOME TO NARRATUM".
    *   Provides primary navigation through large, interactive cards:
        *   **DISCOVER STORIES**: Navigates to `/discover`.
        *   **CREATE STORY**: Navigates to `/create` (if logged in) or `/login`.
        *   **MY PROFILE**: Navigates to `/profile` (if logged in) or appears disabled.
    *   Incorporates Font Awesome icons for visual cues.
    *   Includes a footer: "Where your words come to life".
*   **Key Dependencies**: `react`, `next/navigation`, `@/context/AuthContext`.

### Authentication Context (`src/context/AuthContext.tsx`)

*   **Purpose**: Provides a centralized authentication state management system for the application.
*   **Technology**: Utilizes React Context API (`createContext`, `useContext`).
*   **Authentication Methods Supported**:
    *   **Firebase Authentication**: Manages traditional user authentication (e.g., email/password) via Firebase.
    *   **Starknet Wallet Authentication**: Manages authentication via Starknet wallet addresses.
*   **Core Components**:
    *   `AuthContextType`: Interface defining the shape of the context data (Firebase user, Starknet address, loading status, login/logout functions).
    *   `AuthProvider`: A React component that wraps the application (or parts of it) to provide the authentication context to its children.
    *   `useAuth()`: A custom React hook for easy consumption of the authentication state and functions within components.
*   **State Variables**:
    *   `user`: Stores the Firebase `User` object (or `null`).
    *   `starknetAddress`: Stores the Starknet wallet address string (or `null`).
    *   `loading`: A boolean flag indicating if the authentication state is currently being resolved (e.g., during initial load).
*   **Key Functions**:
    *   Listens to Firebase `onAuthStateChanged` to automatically update user state.
    *   `setStarknetLoginStatus(address: string | null)`: Allows manual setting and clearing of the Starknet wallet address.
    *   `logout()`: Handles signing out from both Firebase and clearing the Starknet address.
*   **Dependencies**: `react`, `firebase/auth`, `@/lib/firebase`.

### Data Model (from dataconnect-debug.log)

The application appears to use a PostgreSQL database, with tables managed by DataConnect. Key tables include:

*   **`story`**:
    *   `id` (text, PK): Unique identifier for the story.
    *   `creator_id` (text, FK to `user.id`): Identifier of the user who created the story.
    *   `cover_image_url` (text, nullable): URL for the story's cover image.
    *   `created_at` (timestamptz): Timestamp of creation.
    *   `description` (text, nullable): A brief description of the story.
    *   `genre` (text, nullable): The genre of the story.
    *   `status` (text, default `'draft'`): The current status of the story (e.g., draft, published).
    *   `title` (text, nullable): The title of the story.
    *   `updated_at` (timestamptz): Timestamp of the last update.
    *   *Index*: `story_creatorId_idx` on `creator_id`.

*   **`story_content`**:
    *   `id` (text, PK): Unique identifier for a piece of story content.
    *   `story_id` (text, FK to `story.id`): Identifier of the story this content belongs to.
    *   `audio_url` (text, nullable): URL for audio associated with this content.
    *   `created_at` (timestamptz): Timestamp of creation.
    *   `image_url` (text, nullable): URL for an image associated with this content.
    *   `page_number` (integer, nullable): Page number for this content within the story.
    *   `text_content` (text, nullable): The textual content for this page/section.
    *   *Index*: `story_content_storyId_idx` on `story_id`.

*   **`template`**:
    *   `id` (text, PK): Unique identifier for the template.
    *   `example_story_id` (text, FK to `story.id`, nullable): ID of an example story demonstrating the template.
    *   `created_at` (timestamptz): Timestamp of creation.
    *   `structure_json` (text, nullable): JSON string defining the structure of the template.
    *   `title` (text, nullable): The title of the template.

*(Note: Other tables like `user` and `admin_action` are implied by foreign keys and log entries but their schemas were not fully detailed in the provided snippets.)*

---
This README was auto-generated based on project files and context.
