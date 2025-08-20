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
    - [ ] Add `backgroundMusicUrl` to `Story` schema
    - [ ] Add `backgroundUrl` to `StoryContent` schema
    - [ ] Update queries to fetch `creator.avatarUrl`, `backgroundMusicUrl`, `backgroundUrl`
    - [ ] Implement dynamic background music in `StoryReader.tsx`
    - [ ] Implement dynamic page backgrounds in `StoryReader.tsx`
    - [ ] Implement dynamic avatar display in `StoryReader.tsx`

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
