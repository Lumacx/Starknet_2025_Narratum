# Story Reader Component Documentation

## 1. Overview

The `StoryReader` component is the core of the interactive story-reading experience in Narratum. Unlike a purely static HTML reader, this React component is designed to dynamically fetch story content, manage user interactions, and adapt its layout for various screen sizes. It integrates multimedia elements, user settings, and premium features to provide a rich and engaging reading environment.

## 2. Features

*   **Dynamic Story Loading:** Fetches and displays story content (text, images, audio) based on a `story` prop.
*   **Interactive Navigation:** Users can move forwards and backwards through story pages.
*   **Multimedia Integration:**
    *   **Page-specific Images:** Each page can have a unique image.
    *   **Text Display:** Story text is displayed, with user-adjustable font scaling.
    *   **Audio Narration:** Narration audio associated with each page plays automatically.
    *   **Background Music:** A looping background music track enhances the atmosphere, with user toggle control.
    *   **Page-Flip Sound Effect:** Auditory feedback for page navigation.
*   **User Controls & Settings:**
    *   **Toggle Background Music:** Play/mute background music.
    *   **Change Background:** Cycle through predefined background images or use a story-specific one.
    *   **Adjust Font Size:** Increase or decrease the text size for better readability.
    *   **Narration Playback:** Pause/play narration and a button to re-read the current page's narration.
    *   **Back to App:** A button to return to the previous section of the application (e.g., story editor, discover page).
*   **Responsive Design:** Adapts its layout and element sizing for optimal viewing on both wide and narrow screens (e.g., desktop vs. mobile).
*   **Premium Feature Integration:** Supports embedding the ElevenLabs Conversational AI widget and a free navigation index based on story settings.
*   **User Interaction Logging:** Logs when a user reads a story, which contributes to the rating system's anti-abuse logic.

## 3. Component Structure and Props

The `StoryReader` component (defined in `src/components/StoryReader.tsx`) is a React functional component.

```typescript
interface StoryReaderProps {
  story: StoryView; // The main story data object to display
  onBack?: () => void; // Optional callback function to navigate back
}

type StoryView = {
  id?: string | null;
  title?: string | null;
  coverImageUrl?: string | null;
  backgroundMusicUrl?: string | null;
  readerAvatarUrl?: string | null; // Story-specific avatar for the reader
  readerBackgroundUrl?: string | null; // Story-specific background for the reader
  storyContent: ReaderPage[]; // Array of individual story pages
  creator?: { avatarUrl?: string | null } | null; // Creator's avatar for fallback
  premium?: {
    convaiAgentId?: string | null; // ID for ElevenLabs Convai widget
    teaserVideoUrl?: string | null; // Not directly used by reader, but part of premium
    freeNavigationIndex?: boolean; // Enables left-side page index
  } | null;
};

type ReaderPage = {
  id?: string | null;
  pageNumber?: number | null;
  textContent?: string | null;
  imageUrl?: string | null;
  audioUrl?: string | null;
};
```

## 4. How It Works (Dynamic Story Loading & Interaction)

1.  **Mounting and Initialization:**
    *   When `StoryReader` mounts, it initializes `HTMLAudioElement` instances for background music, narration, and page-turn sound effects using `useRef` and `useEffect`.
    *   It also sets up an event listener to detect screen width and update an `isNarrow` state, crucial for responsive layout.
    *   The `reader-mode` CSS class is added to the `document.documentElement` to hide global site chrome.
2.  **User Interaction Flag (`userInteracted`):**
    *   Audio playback (especially background music) often requires a direct user interaction to initiate. The `handleUserInteraction` function sets a flag (`userInteracted`) once the user clicks anywhere on the `app-container`, allowing audio to then play programmatically.
3.  **Page Navigation:**
    *   The `currentPageIndex` state tracks the current page (0 for cover, 1+ for story content).
    *   `nextPage()` and `previousPage()` functions update this index.
    *   `goToIndex(nextIndex)`: Plays the page-turn sound, updates `currentPageIndex`, and if the new page has an `audioUrl`, triggers `playNarration()`.
4.  **Audio Playback:**
    *   **Background Music:** `backgroundMusicRef` handles a looping track (`story.backgroundMusicUrl` or `DEFAULT_BGM`). `toggleBackgroundMusic()` allows users to mute/unmute it.
    *   **Narration:** `playNarration(audioUrl)` pauses any existing narration, creates a new `HTMLAudioElement` for the current page's audio, and plays it.
    *   **Page Turn Sound:** `pageTurnSoundRef` plays a short sound effect on page changes.
    *   **Audio Controls:** The UI provides controls for playing/pausing narration, replaying the current page's narration, and toggling background music on/off.
5.  **Content Rendering:**
    *   `currentPageContent` (derived from `sortedStoryContent`) provides the image URL, text content, and audio URL for the current page.
    *   The `storyImageSrc` and `avatarUrl` are dynamically determined, falling back to defaults if story-specific URLs are not provided.
    *   **Dynamic Background Images:** The `backgroundUrl` for the reader can be a story-specific override defined in `story.readerBackgroundUrl`, or one of the user-selectable default `BG_CHOICES`. The `bgIdx` state manages the currently selected default background.
6.  **Settings (Font Scale, Background):**
    *   **Font Scale:** The `fontScale` state (1.0 to 1.4) directly applies a `transform: scale()` to the `#text-bubble` element, allowing users to increase or decrease the text size for readability.
    *   **Backgrounds:** The `bgIdx` state allows cycling through `BG_CHOICES`. The `backgroundUrl` can be a story-specific override or one of the chosen defaults.
7.  **Premium Features:**
    *   If `story.premium?.convaiAgentId` is present, an `<elevenlabs-convai>` custom element and its required script are conditionally rendered at the bottom of the component, enabling the AI avatar for interactive conversations.
    *   If `story.premium?.freeNavigationIndex` is `true`, a left-side navigation index (chips for each page) is displayed on wider screens, allowing premium users to jump to any page.
8.  **Reading/Rating Anti-Abuse Logic:**
    *   The component logs when a user reads a story. This interaction data is used by the backend to implement anti-abuse measures for story ratings and other community features, ensuring genuine engagement.

## 5. Responsiveness

The `StoryReader` component is built with a mobile-first approach and uses several techniques to ensure optimal viewing on various screen sizes:

*   **`isNarrow` State:** A `useEffect` hook monitors `window.innerWidth`. If the width falls below `1080px`, the `isNarrow` state is set to `true`. This state acts as a primary breakpoint for applying different styles and layouts specifically for mobile or smaller tablet views.
*   **Flexible Width (`min(1000px, 80vw)`):** The main container (`#app-container`) uses `width: "min(1000px, 80vw)"`. This ensures the reader takes up 80% of the viewport width but doesn't grow excessively large on very wide screens. `margin: "0 auto"` centers it horizontally.
*   **`clamp()` for Dynamic Spacing:** CSS `clamp()` function is used extensively for dynamic sizing of padding, margins, and gaps (e.g., `clamp(8px, 2vw, 20px)`). This allows elements to adapt fluidly based on the viewport width, maintaining aesthetic proportions while staying within defined minimum and maximum limits.
*   **Dynamic Grid Layout (`gridTemplateColumns`):**
    *   The main content (`#app-main`) employs CSS Grid for flexible layout.
    *   When `isNarrow` is `true` (narrow screens), `gridTemplateColumns` becomes `"1fr"`, causing the avatar panel and image/text panel to stack vertically.
    *   When `isNarrow` is `false` (wider screens), it uses `"minmax(220px, 24%) 1fr"` (or `26%` if `hasFreeNav` is `false`). This creates a two-column layout where the left column (avatar/controls) is flexible but maintains a minimum width, and the right column (story content) takes the remaining space.
*   **Conditional Sizing of Elements:**
    *   **Avatar Panel:** The `minHeight` of the avatar panel changes based on `isNarrow` (e.g., `120px` for narrow, `180px` for wide) to accommodate different screen real estate.
    *   **Avatar Image:** The `width` and `height` of the narrator's avatar image are adjusted based on `isNarrow` (e.g., `96px` vs. `120px`).
    *   **Story Image:** `maxImageHeight` is set to `"54vh"` on narrow screens and `"66vh"` on wider screens, using viewport height units to scale the image proportionally without overflowing.
    *   **Free Navigation Index:** The `maxHeight` of this panel is also conditional (`140px` for narrow, `240px` for wide) to fit appropriately within the available space.

## 6. Integration and Usage

The `StoryReader` component is typically rendered by `src/app/ereader/page.tsx` after fetching story data from Firestore. It expects a `StoryView` object as its `story` prop.

```typescript jsx
// Example usage in src/app/ereader/page.tsx
import StoryReader from '@/components/StoryReader';

// ... Inside your component after fetching story data ...
return (
  <div className="w-screen min-h-screen">
    <StoryReader
      story={story} // The fetched and formatted StoryView object
      onBack={() => {
        router.push(backHref || '/discover');
        setTimeout(() => window.location.reload(), 100);
      }}
    />
  </div>
);
```
