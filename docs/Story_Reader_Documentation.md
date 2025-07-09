# Story Reader Tool Documentation

## 1. Overview

The Story Reader is a standalone, web-based tool designed to present an interactive and multimedia-rich story experience. It combines images, text, narration, and background music to engage the user. The tool is built with HTML, CSS, and vanilla JavaScript, making it lightweight and easy to modify.

## 2. Features

- **Interactive Story Navigation:** Users can move forwards and backwards through the story pages.
- **Multimedia Integration:**
    - **Page-specific Images:** Each page of the story is accompanied by a unique image.
    - **Text Display:** Story text is loaded from external `.txt` files and displayed in a speech bubble format.
    - **Audio Narration:** Each page has a corresponding narration audio file that plays automatically.
    - **Background Music:** A looping background music track enhances the atmosphere.
    - **Sound Effects:** A page-flip sound provides auditory feedback during navigation.
- **User Controls:**
    - **Play/Mute Music:** A dedicated button to control the background music.
    - **Replay Narration:** A button to listen to the current page's narration again.
    - **Audio Progress Bar:** A visual indicator for the current narration's playback progress.
- **Customization:**
    - **Changeable Backgrounds:** Users can select from a predefined list of background images.
    - **Selectable Narrator Avatars:** Users can change the avatar of the narrator.
    - **Adjustable Font Size:** The font size of the story text can be cycled through several presets.
- **Loading Screen:** A simple loading screen is displayed while the story assets are being loaded.

## 3. File Structure

The tool is organized into the following folders and files:

```
Integrations/Story_Reader/
├── Index.html              # The main HTML file for the story reader.
├── Story.css               # The CSS file for styling the story reader.
├── Story.js                # The JavaScript file containing all the application logic.
├── audio/
│   ├── background-music.mp3  # The background music file.
│   ├── narration_*.mp3     # Narration files for each page.
│   └── page-flip.mp3       # The page-flip sound effect.
├── avatars/
│   └── *.png               # Image files for narrator avatars.
├── backgrounds/
│   └── *.png               # Image files for different backgrounds.
├── images/
│   ├── cover.png           # The cover image of the story.
│   └── page*.png           # Image files for each story page.
└── notes/
    └── Note_*.txt          # Text files containing the story content for each page.

```

## 4. How It Works

1.  **Initialization (`init()` function):**
    - When the `Index.html` page is loaded, the `init()` function in `Story.js` is called.
    - It gets references to all the necessary DOM elements (buttons, text bubbles, image panels, etc.).
    - It then calls `loadAssets()` to start loading all the story content.

2.  **Asset Loading (`loadAssets()` function):**
    - This function asynchronously fetches all the required assets:
        - All `.txt` files from the `notes/` folder.
        - All audio files (narration, background music, sound effects) from the `audio/` folder.
    - A loading screen is displayed to the user during this process.
    - Once all assets are loaded, the `setupAudio()` function is called.

3.  **UI Setup:**
    - The `setupAudio()` function sets the volume and loop properties for the audio elements.
    - The `updateUI()` function is called to display the initial state of the story (the cover page).
    - Event listeners are attached to all interactive elements (buttons, dropdowns).

4.  **User Interaction:**
    - The story starts on the cover page (`currentPageIndex = 0`).
    - The user clicks the "Start Story" button, which calls the `startStory()` function.
    - The `startStory()` function advances the page and triggers the first user interaction, allowing audio to be played.
    - Clicking the navigation arrows (`nextPage()` and `previousPage()` functions) changes the `currentPageIndex` and calls `updateUI()`.
    - The `updateUI()` function updates the displayed image, text, and page number based on the `currentPageIndex`. It also triggers the `playNarration()` function for the current page.

5.  **State Management:**
    - The application's state (current page, selected avatar, background, etc.) is managed through global JavaScript variables.
    - Functions like `handleBackgroundChange()` and `handleNarratorChange()` update these state variables and the UI accordingly.

## 5. Customization

To adapt this tool for a new story, you will need to modify the files in the asset folders (`audio`, `avatars`, `backgrounds`, `images`, `notes`).

-   **Adding/Changing Pages:**
    1.  Update the `TOTAL_CONTENT_PAGES` constant in `Story.js` to match the number of pages in your story.
    2.  Add the corresponding image files (`page1.png`, `page2.png`, etc.) to the `images/` folder.
    3.  Add the corresponding text files (`Note_1.txt`, `Note_2.txt`, etc.) to the `notes/` folder.
    4.  Add the corresponding narration files (`narration_1.mp3`, `narration_2.mp3`, etc.) to the `audio/` folder.

-   **Changing the Cover and End Text:**
    -   Modify `images/cover.png` for the cover image.
    -   Modify `notes/Note_0.txt` for the cover text.
    -   Modify `notes/Note_{TOTAL_CONTENT_PAGES + 1}.txt` for the "The End" text.

-   **Adding More Backgrounds or Avatars:**
    1.  Add the new image files to the `backgrounds/` or `avatars/` folders.
    2.  Update the `<select>` dropdown menus in `Index.html` to include the new options. The `value` of the `<option>` should match the filename of the new image.
