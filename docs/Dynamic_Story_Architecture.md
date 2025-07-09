# Dynamic Story Architecture Documentation

## 1. Overview

This document outlines a scalable, database-driven architecture for creating, storing, and reading user-generated stories. This approach replaces the static, single-story structure of the original `Story_Reader` tool with a dynamic system capable of handling multiple unique stories.

This architecture is designed to integrate seamlessly with the existing Next.js application, Firebase Data Connect (PostgreSQL), and Cloud Storage.

## 2. Data Storage & Cost Model

Our strategy separates story metadata (stored in the database) from story assets (stored in cloud storage).

-   **Database (Cloud SQL for PostgreSQL):**
    -   **Usage:** Stores all metadata, such as titles, descriptions, page order, and references to asset URLs.
    -   **Cost:** Billed based on Cloud SQL instance size (vCPU/RAM), storage duration (GB/month), and network egress. Scales by upgrading the instance size as demand grows.

-   **File Storage (Cloud Storage for Firebase):**
    -   **Usage:** Stores all large, static assets, including images, audio files, and video files.
    -   **Cost:** Billed primarily on storage duration (GB/month) and bandwidth for user downloads. This is the most cost-effective way to handle large media files.

## 3. Proposed Data Model (PostgreSQL)

To align with your existing `schema.gql` and `documentation.md`, we will use two primary tables: `stories` and a new `story_pages` table.

### `stories` Table

Stores the high-level metadata for each story.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Unique identifier for the story. |
| `title` | `VARCHAR(255)` | The title of the story. |
| `description`| `TEXT` | A brief summary of the story. |
| `cover_image_url` | `VARCHAR(255)` | URL to the story's cover image in Cloud Storage. |
| `author_id` | `VARCHAR(255)` | Foreign key referencing the `users` table. |
| `created_at` | `TIMESTAMP` | When the story was created. |

### `story_pages` Table

Stores the content for each individual page within a story.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `SERIAL PRIMARY KEY` | Unique identifier for the page. |
| `story_id` | `INTEGER` | Foreign key referencing the `stories` table. |
| `page_number` | `INTEGER` | The order of the page within the story (e.g., 1, 2, 3). |
| `image_url` | `VARCHAR(255)` | **(Optional)** URL to the page's image. |
| `note_url` | `VARCHAR(255)` | **(Optional)** URL to the page's text file. |
| `audio_url` | `VARCHAR(255)` | **(Optional)** URL to the page's narration audio. |
| `video_url` | `VARCHAR(255)` | **(Optional)** URL to the page's video file. |

## 4. Proposed File Storage Structure

All user-generated assets will be stored in a dedicated `stories` directory within your `public/` folder, which syncs with Cloud Storage for Firebase. Each story's assets will be organized into a subfolder named with its unique `story.id`.

```
public/
└── stories/
    └── 1/              <-- Corresponds to a story with id=1
    │   ├── cover.png
    │   ├── images/
    │   │   ├── page_1.png
    │   │   └── page_2.png
    │   ├── audio/
    │   │   ├── narration_1.mp3
    │   │   └── narration_2.mp3
    │   ├── videos/
    │   │   ├── intro.mp4
    │   └── notes/
    │       ├── note_1.txt
    │       └── note_2.txt
    └── 2/              <-- Corresponds to a story with id=2
        └── ...
```

## 5. Implementation Plan

1.  **Update Database Schema:** Add the `story_pages` table definition to the `dataconnect/schema/schema.gql` file.
2.  **Create Dynamic Route:** Create a new page in the app at `src/app/story/[storyId]/page.tsx`. This page will fetch the `storyId` from the URL.
3.  **Develop `<StoryReader />` Component:**
    -   Convert the logic from `Integrations/Story_Reader/Story.js` into a React component.
    -   The component will accept `storyId` as a prop.
    -   On load, it will fetch the story's metadata and the list of pages from the database using the `storyId`.
    -   It will dynamically construct asset URLs based on the data returned from the database (e.g., `https://<your-project>.firebaseapp.com/stories/1/images/page_1.png`).
    -   **Add a video player** to the component, which becomes visible if a `video_url` exists for the current page.
4.  **Update "Create Story" Flow:** Modify the story creation logic to:
    -   Create a new entry in the `stories` table.
    -   For each page added, create a corresponding entry in the `story_pages` table.
    -   Upload all generated assets to the correct folder in Cloud Storage.
5.  **Update "Discover Page":** The discover page will query the `stories` table and display a list of all stories, with each entry linking to `/story/[storyId]`.
