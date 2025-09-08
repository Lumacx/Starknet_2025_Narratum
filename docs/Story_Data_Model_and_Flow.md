# Story Data Model and Flow

This document details the data structures and the flow of information for story creation, editing, and persistence within the Narratum application. It covers how story and scene data are structured in Firebase Firestore, how interactions with Firestore occur, local storage for drafts, asset management, and the logic for user ratings and favorites.

## 1. Story and Page Data Models

Narratum utilizes distinct but related data models for stories and their individual pages/scenes. These models are primarily stored in Firebase Firestore.

### 1.1 `StoryView` (Published Story Representation)

This model represents a fully published story, optimized for reading and public display.

```typescript
interface StoryView {
    id: string; // Unique ID for the story (document ID in Firestore)
    title: string;
    synopsis: string;
    coverImageUrl: string;
    authorId: string; // Firebase Auth UID of the author
    authorName: string; // Display name of the author
    genres: string[]; // Array of selected genres (e.g., "Fantasy", "Sci-Fi")
    category: string; // Primary category (e.g., "Novel", "Short Story")
    language: string;
    pageCount: number; // Total number of pages/scenes in the story
    campaignName?: string; // Optional campaign name
    publishedAt: Timestamp; // Date and time of publication
    lastUpdatedAt: Timestamp; // Date and time of last update
    isPremium: boolean; // Indicates if the story has premium features
    convaiAgentId?: string; // ID for Convai agent (if premium)
    teaserVideoUrl?: string; // URL for teaser video (if premium)
    freeNavigationIndex?: number; // Index up to which navigation is free (if premium)
    likes: number; // Aggregate count of likes
    reads: number; // Aggregate count of reads
    // ... other public-facing fields
}
```

### 1.2 `Draft` (Story Under Creation/Editing)

This model represents a story in progress, containing all metadata and potentially un-finalized content. It often mirrors `StoryView` but may include additional fields relevant to the creation process.

```typescript
interface Draft {
    id: string; // Same as StoryView ID if it's an existing draft
    title: string;
    synopsis: string;
    coverImageUrl: string;
    authorId: string;
    genres: string[];
    category: string;
    language: string;
    pageCount: number;
    campaignName?: string;
    // Draft-specific fields
    status: 'draft' | 'published' | 'pending_review';
    lastEditedAt: Timestamp;
    // ... all fields from StoryView
    // ... potentially raw scene data not yet structured into ReaderPage
}
```

### 1.3 `StorySummary` (Lightweight Representation for Lists)

Used for displaying stories in lists (e.g., dashboard, discover page) to avoid fetching full story data.

```typescript
interface StorySummary {
    id: string;
    title: string;
    coverImageUrl: string;
    authorName: string;
    genres: string[];
    likes: number;
    reads: number;
    // ... a subset of StoryView fields
}
```

### 1.4 `ReaderPage` (Individual Story Scene/Page)

Each `StoryView` or `Draft` consists of an ordered collection of `ReaderPage` documents, typically stored as a subcollection (`stories/{storyId}/pages/{pageId}`).

```typescript
interface ReaderPage {
    id: string; // Document ID (e.g., "page_0", "page_1")
    storyId: string;
    pageNumber: number; // 0-indexed or 1-indexed
    imageUrl: string; // Main image for the scene
    text: string; // Narrative text for the scene
    narrationAudioUrl?: string; // URL for audio narration of the text
    backgroundAudioUrl?: string; // URL for scene-specific background music/ambiance
    characterImageUrls?: string[]; // URLs of character avatars present in the scene
    // ... potentially other scene-specific metadata (e.g., choices, interactive elements)
}
```

## 2. Firestore Interactions

Narratum heavily relies on Firebase Firestore for persistent storage of story and user data.

### 2.1 `useCreateStory` Hook

This custom React hook (likely located in `src/hooks/useCreateStory.ts`) encapsulates the logic for initiating and managing story creation.

-   **`ensureStoryId` Logic:** When a user begins creating a new story, this logic is invoked. If the user does not have an active draft, a new draft story document is created in the `stories` collection (with `status: 'draft'`). If an active draft exists (e.g., in local storage), it's re-hydrated.
-   **Metadata Storage and Updates:**
    -   Initial story metadata (e.g., `title`, `genres`, `synopsis`, `category`, `pageCount`, `language`, `campaignName`) is stored directly on the story document.
    -   Updates to these fields are performed via Firestore `update` operations on the respective story document.
-   **Cover Image Management:**
    -   `coverImageUrl` is a field on the story document.
    -   When a user uploads a cover image, it's typically uploaded to Firebase Storage.
    -   The `uploadCoverToStory` helper function (likely in `src/lib/uploadCover.ts`) is responsible for handling the Firebase Storage upload and then updating the `coverImageUrl` field on the Firestore story document.
-   **Premium Feature Configuration:**
    -   Fields like `convaiAgentId`, `teaserVideoUrl`, and `freeNavigationIndex` are stored on the story document when configured by the author. These fields are often conditional based on the author's subscription plan.

### 2.2 Real-time Listeners (`onSnapshot`)

Firestore's `onSnapshot` listeners are crucial for providing real-time updates across the application:

-   **User-Specific Data:** Listeners are used to keep `favorites`, `reads`, and `ratings` up-to-date in the user's profile and on story display pages. For example, `users/{userId}/favorites/{storyId}` could store a boolean indicating if a story is favorited by that user.
-   **Story Updates:** In creation/editing flows, `onSnapshot` might be used to monitor changes to the draft story document, ensuring the UI reflects the latest saved state.
-   **Dashboard:** As mentioned in Dashboard Data Aggregation, real-time updates for story statistics could be powered by `onSnapshot`.

## 3. Local Storage Draft

To provide a seamless and robust authoring experience, Narratum leverages client-side local storage for story drafts.

-   **`DRAFT_KEY`:** A specific key (e.g., `NARRATUM_DRAFT_{userId}`) is used in local storage to store a JSON representation of the current story draft.
-   **Purpose:** This allows users to close their browser or navigate away from the `/create` page and return to their work in progress without losing data, even before a full save to Firestore.
-   **Synchronization:** The local storage draft is periodically synchronized with the Firestore draft document. When a user explicitly saves or publishes, the local draft is pushed to Firestore. Upon loading the creation page, the system checks for a local draft and either loads it or fetches the latest draft from Firestore.

## 4. Asset Management (Characters, Locations, Audio, Video)

Assets like character images, location backgrounds, audio narrations, and video clips are crucial for rich storytelling.

-   **Firebase Storage:** These assets are primarily stored in Firebase Storage. The paths to these assets are then referenced within the `ReaderPage` documents or directly on the `StoryView`/`Draft` document (e.g., `coverImageUrl`).
-   **Referencing in Stories:**
    -   `ReaderPage` documents contain `imageUrl`, `narrationAudioUrl`, `backgroundAudioUrl`, and `characterImageUrls` which are direct URLs to assets in Firebase Storage.
    -   The `/create/support` section allows users to upload and manage these assets, populating a "gallery" from which they can be selected or composed into scenes.

## 5. Rating and Favorite Logic

User engagement is tracked through reading, rating, and favoriting stories.

-   **Reads:** When a user reads a story (e.g., completes a certain percentage or reaches the end), a record is made. This could be stored in a subcollection like `users/{userId}/reads/{storyId}` or an aggregate counter on the `stories` document.
-   **Ratings:**
    -   Users can rate stories (e.g., a simple like/dislike or a star rating).
    -   This is typically stored in a subcollection: `stories/{storyId}/ratings/{userId}` document would contain the user's rating.
    -   Aggregate `likes` count on the `StoryView` document is updated via Firebase Cloud Functions (on `onCreate`, `onUpdate`, `onDelete` for the `ratings` subcollection) to avoid client-side concurrency issues and maintain data integrity.
-   **Favorites:**
    -   Users can mark stories as favorites.
    -   This is stored in a subcollection on the user's document: `users/{userId}/favorites/{storyId}` (e.g., containing a simple boolean `isFavorite: true`).
    -   This allows for quick retrieval of a user's favorited stories on their profile page.
-   **Anti-Abuse Logic:** Measures are implemented (e.g., on the backend via Firebase Security Rules or Cloud Functions) to prevent users from spamming reads, ratings, or favorites. This might include rate limiting or ensuring only one rating per user per story.

## 6. Dashboard Data Aggregation

The Dashboard (`/dashboard`) displays various statistics derived from story data.

-   **`buildStats` Functionality:** This (likely client-side or Cloud Function) utility aggregates data from the `stories` collection and the user's `favorites` and `reads` subcollections.
-   **Metrics Calculated:**
    -   Comparison statistics (e.g., "All App vs. My Stories") are generated by querying and combining data across all stories and specific user-owned stories.
    -   Data is filtered and grouped by `genre`, `storyType` (if applicable), and `plan` (if different subscription tiers have different story access/creation limits).
-   **Real-time Updates:** The dashboard data might also leverage `onSnapshot` listeners to reflect the latest story counts, ratings, and user interactions in real-time.
