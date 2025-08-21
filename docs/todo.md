# Narratum To-Do List

This document outlines the planned features and development tasks for the Narratum project.

## Core Features

- [x] User Authentication (Firebase/Starknet)
- [x] Story Creation (Title, Description, Genre)
- [ ] Implement actual story content creation/editing
- [x] Story Discovery Page with Search and Filtering: Design and implement the UI (search bar, genre/tag filters, story previews).
- [x] Story Discovery Page with Search and Filtering: Integrate existing src/app/api/semantic-search/route.ts for the search functionality.
- [x] Story Discovery Page with Search and Filtering: Implement queries to fetch stories based on filters (e.g., by genre, popularity).
- [x] Story Discovery Page with Search and Filtering: Display enriched story card information (author, comments count).
- [ ] User Profile Page with user's stories and stats
- [ ] Subscription model and payment integration
- [ ] Interactive story display with multimedia support
    - [ ] **Create Page (Initial Prompt Guidance & References):**
        - [ ] Develop UI for initial story prompt input and guidance.
        - [ ] Integrate template selection and reference material display.
    - [ ] **Story Prompt Screen:**
        - [ ] Implement robust text input for story prompts.
        - [ ] Integrate AI writing prompt generation (if not already covered).
        - [ ] Save prompt data to the backend.
    - [ ] **Illustrate Pages Screen:**
        - [ ] Develop UI for displaying story pages with placeholders for illustrations.
        - [ ] Integrate AI image generation functions.
        - [ ] Allow users to generate, select, and refine images for each page.
        - [ ] Implement saving of image URLs to `StoryContent` schema in Firebase.
    - [ ] **Add Narration Screen:**
        - [ ] Design UI for adding and managing audio narrations per page.
        - [ ] Integrate AI-powered story narration (text-to-speech) functionality.
        - [ ] Allow manual audio uploads and linking to specific pages.
        - [ ] Implement saving of audio URLs to `audioData` in Firebase.
    - [ ] **View Full Storybook Pop-up:**
        - [ ] Integrate eReader HTML with Story_Reader UI for a seamless reading experience.
        - [ ] Dynamically load story content, images, and audio from Firebase.
        - [ ] Implement page navigation, background music, and avatar display within the pop-up.
        - [ ] Ensure `backgroundMusicUrl`, `backgroundUrl`, `creator.avatarUrl` are fetched and utilized.

## AI Features

- [x] AI Writing Prompts (based on template and user input)
- [x] Built functions for AI Image Generation for story illustrations
- [x] Create UI to use the functions for AI Image Generation for story illustrations (including saving to page content).
- [ ] Refine AI Image Generation UI (e.g., better image placement options, styles).
- [x] Semantic search for stories based on themes and concepts
- [ ] AI-powered story narration (text-to-speech)

## Backend and Infrastructure

- [x] DataConnect schema for stories, users, and templates
- [ ] Implement template logic beyond the mock data
- [ ] Set up a CI/CD pipeline for automated testing and deployment
- [ ] Implement a robust error logging and monitoring system

## UI/UX

- [x] Basic UI for core pages (Landing, Create, etc.)
- [ ] Refine the interactive story display for a better reading experience
- [ ] Improve the overall design based on the style guide
- [ ] Ensure the UI is fully responsive for all devices
- [ ] Add animations and transitions to enhance the user experience
