# YouTube Video Player Integration Plan

This document outlines the plan to integrate a reusable YouTube video player component into various parts of the application, update data models, and make UI/UX adjustments as per the main goal and specific requirements.

## Main Goal:
Set up a reusable component of a YouTube video player pop up similar to the one we have in the landing page to be call on other pages as well to run a URL Video Link

## Specific Requirements:
1. Incorporate the Youtube video player pop up into the Story Reader Page that users will call with a "Video" button in the bottom center of the app above the footer
2. Allow users to add an URL of a Youtube Video in each of their slides scenes when they are building the story in Scenes/Page
3. On Support/page, replace the Video upload option for a "Insert URL link" option, users will be able to upload a link to a youtube video and put their custom name so they can get them from "My Gallery"/videos category and use them in the Scenes/page
4. Check on Discover/page and allow premium stories with a Teaser URL to use this Youtube Video Player pop up
5. In the Story Reader, use the Teaser on the Cover page if available and the specific Scene Video URL set up in the specific scene during point #2.
6. In src/app/ereader/page.tsx, Rename the "Download in PDF" button to "Down arrow icon" + "PDF" and the Download resources Separate (no synchronization just files) to just "Down arrow icon" + "All Files"
7. Order in the same bottom section the Download in PDF Button and the "All Files" button on the bottom left of the screen over the footer, then in the center the "Cinema icon"+Video button and on the right side the Elevenlabs Widget

## Plan of Action:

**Phase 1: Core Component & Initial Integration**

*   **Task 1: Create Reusable YouTube Video Player Component (`src/components/YoutubeVideoPlayer.tsx`)**
    *   Read `src/app/page.tsx` to understand the current YouTube video player implementation.
    *   Extract the modal and video player logic into a new, reusable component.
    *   Define props for `videoUrl` (string), `isOpen` (boolean), and `onClose` (function).
    *   Update `src/app/page.tsx` to use this new component.

**Phase 2: Data Model & Story Creation Integration**

*   **Task 2: Update Story Data Model (`src/lib/story-types.ts`)**
    *   Add `youtubeVideoUrl?: string;` to the scene data structure.
    *   Add `teaserYoutubeUrl?: string;` to the story data structure.

*   **Task 3: Integrate YouTube Video Input into Scenes/Page (`src/app/create/scenes/page.tsx`)**
    *   Add an input field for users to paste a YouTube video URL for each scene.
    *   Implement logic to save this URL to the corresponding scene's `youtubeVideoUrl` field.

**Phase 3: Video Management & Gallery Integration**

*   **Task 4: Modify Support/page for Video Link Upload (`src/app/create/support/page.tsx`)**
    *   Replace the existing video upload option with an "Insert URL link" input.
    *   Allow users to input a YouTube URL and a custom name.
    *   Implement logic to store these user-defined YouTube links, making them accessible in a "My Gallery"/videos category. This will likely involve updating a user-specific data model.

**Phase 4: Discover Page & Teaser Integration**

*   **Task 5: Discover Page Integration (`src/app/discover/page.tsx`)**
    *   For premium stories with a `teaserYoutubeUrl`, add a button/icon that opens the `YoutubeVideoPlayer` with the teaser URL.

**Phase 5: Story Reader & UI/UX Refinements**

*   **Task 6: Story Reader - Teaser & Scene Video Logic (`src/app/ereader/page.tsx`)**
    *   Import and use the `YoutubeVideoPlayer` component.
    *   Add a "Video" button (with a "Cinema icon") in the bottom center above the footer.
    *   Implement logic to play the current scene's `youtubeVideoUrl` if available; otherwise, play the story's `teaserYoutubeUrl`.

*   **Task 7: Rename Buttons and Layout in Story Reader (`src/app/ereader/page.tsx`)**
    *   Rename "Download in PDF" to "Down arrow icon" + "PDF".
    *   Rename "Download resources Separate (no synchronization just files)" to "Down arrow icon" + "All Files".
    *   Adjust the layout to position "PDF" and "All Files" buttons on the bottom left, the "Video" button in the bottom center, and the Elevenlabs Widget on the bottom right.
