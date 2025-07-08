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

## 3. Core Features

Narratum offers a range of features designed to enhance the storytelling experience for both creators and readers.

- **Interactive Story Display**: Stories are presented in an interactive format, allowing users to navigate through pages and chapters with ease.
- **Template-Driven Story Creation**: Creators can use predefined templates to structure their stories. The `create/page.tsx` file shows how users can select from a list of mock templates such as "Three-Act Structure", "The Hero's Journey", and "Freytag's Pyramid".
- **AI Writing Prompts**: The application integrates with an AI tool to provide writing prompts. The `src/ai/flows/generate-writing-prompts.ts` file defines a Genkit flow that takes a story template and user input to generate a list of compelling writing prompts.
- **User Authentication**: Narratum supports both traditional email/password authentication via Firebase and modern wallet-based authentication with Starknet. The `AuthContext.tsx` file manages the authentication state.
- **Story Discovery**: A dedicated discovery page where users can browse and search for stories created by others.
- **Profile Management**: Users can create and manage their profiles, view their created stories, and track their reading progress.

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
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up environment variables**:
    - Create a `.env.local` file in the root of the project.
    - Add the necessary Firebase and other configuration details to this file.
4.  **Run the development server**:
    ```bash
    npm run dev
    ```
5.  **Open the application**:
    - Open your browser and navigate to `http://localhost:3000`.
