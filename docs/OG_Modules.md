# Narratum: Unified OG Modules & To-Do List

This document provides a unified and comprehensive list of all modules, features, and tasks for the Narratum project, merging the "Open AI Plan" and the "Gemini Plan".

---

### 1. Authentication & User Management
Handles all aspects of user accounts, roles, profiles, and authentication.
- [x] **User Registration/Login:**
  - [x] Email/Password authentication
  - [ ] Social login (Google, Facebook, etc.)
  - [x] Wallet-based login (Starknet)
  - [ ] Password recovery and reset functionality
  - [ ] Account verification via email
- [ ] **User Profile Management:**
  - [x] Basic profile information (avatar, username, bio) - *Automated creation by `authTriggers.ts` and avatar upload by `AvatarUploader`.*
  - [ ] Membership tier display and upgrade options
  - [ ] User settings (notifications, privacy controls)
  - [ ] Link to personal activity dashboard
- [ ] **Role-Based Access Control (RBAC):**
  - [ ] Define and manage roles: Free, Premium, Creator, Admin
  - [ ] Implement access control logic based on user roles

---

### 2. Story System: Discovery & Reading
Enables users to browse, search, read, and interact with stories.
- [x] **Story Discovery & Browser:**
  - [x] Basic story list/display
  - [x] Advanced browsing (by genre, tags, popularity, trending) - *Implemented with filters and semantic search.*
  - [x] Search and filtering functionality (by keyword, author, title) - *Semantic search integrated.*
  - [ ] "Editor's Picks" or featured stories section
- [x] **Story Reader/Viewer:**
  - [x] Basic interactive story display
  - [ ] Web novel-style UI with scroll/page-turn options
  - [ ] Reader preferences (font size, night mode, background themes)
  - [ ] Progress tracking and bookmarking
  - [x] Reactions, comments, and reviews per chapter - *Reactions and comments (with `commentCounter.ts`) are implemented.*
  - [ ] Story sharing functionality
- [ ] **Rating & Review System:**
  - [ ] 5-star rating system for stories
  - [ ] Ability for users to write detailed reviews

---

### 3. Creator Studio
Provides creators with the tools to build, manage, and publish their interactive stories.
- [x] **Core Story Creation:**
  - [x] Create a new story with a title, description, and genre - *Initial setup complete, multi-step flow in `src/app/create`.*
- [x] **Chapter & Content Editor:**
  - [x] Rich text editor (Markdown/Quill-style) for story content - *Basic text editing is implied with AI image generation.*
  - [ ] Tools to define story branches, choices, and interactive elements
  - [ ] Version control for story drafts
- [x] **Story Templates & Guides:**
  - [x] Initial mock templates (Three-Act Structure, Hero's Journey)
  - [ ] Implement functional templates with plot structure, genre tips, and milestone guides
- [x] **Asset Management:**
  - [x] Asset builder to upload/embed images, videos, and audio - *AI image generation and saving implemented. `assetsIndex.ts` provides backend indexing.*
  - [x] Integration with AI asset generators - *AI image generation is in.*
  - [x] Automated folder organization per story project - *`assetsIndex.ts` provides metadata-based organization.*
- [ ] **Story Publishing & Management:**
  - [ ] Creator dashboard to view and manage all created stories
  - [ ] Publish/unpublish stories
  - [ ] Submit stories for moderation/review
- [ ] **Milestone Tracker:**
  - [ ] Tools to define and track story milestones (useful for AI training and reader engagement)

---

### 4. AI & Machine Learning Integration
Core AI-powered features for both creators and readers.
- [x] **AI Writing Prompts/Assistant:**
  - [x] Generate writing prompts based on templates and user input
  - [ ] AI assistants within the chapter editor for generating dialogue, descriptions, etc.
- [x] **AI Media Generation:**
  - [x] AI Image Generator (e.g., DALL-E, Midjourney) to create story illustrations and assets - *Backend and UI for generation and saving implemented.*
  - [ ] AI Video Generator for cutscenes or promotional materials
- [ ] **AI-Powered Interactive Story Mode (Premium):**
  - [ ] Conversational AI agents (characters, narrator) that users can interact with
  - [ ] AI-generated story branches and dynamic plot alterations based on user choice
  - [ ] Context management (RAG) to ensure AI has knowledge of story details
- [ ] **AI Voice & Narration:**
  - [ ] Text-to-Speech (TTS) for "read-aloud" or audiobook functionality (e.g., ElevenLabs)
- [ ] **AI Content Moderation:**
  - [ ] Automated scanning of stories and comments for inappropriate or offensive content

---

### 5. Monetization: Subscriptions & Royalties
Manages memberships, payments, and royalty distribution for creators.
- [ ] **Membership & Subscription System:**
  - [ ] Define and manage subscription tiers (Premium, Creator) with clear benefits
  - [ ] Secure payment gateway integration (Stripe, PayPal, Crypto)
  - [ ] Subscription sign-up, upgrade, downgrade, and cancellation flows
  - [ ] Automated recurring billing and invoicing
- [ ] **Creator Royalty Management:**
  - [ ] Royalty calculation engine (e.g., based on revenue share, per-read metrics)
  - [ ] Payout system with support for PayPal, bank transfers, etc.
  - [ ] Creator settings for payout preferences
  - [ ] Tax compliance and form collection (W-9, etc.)

---

### 6. Dashboards & Analytics
Provides insightful data for all user roles.
- [ ] **Reader Dashboard:**
  - [ ] View reading history, bookmarks, and achievements
  - [ ] Track progress in ongoing stories
  - [ ] Manage membership status
- [ ] **Creator Dashboard:**
  - [ ] Story performance analytics (views, completion rates, likes, comments)
  - [ ] Audience demographics
  - [ ] Royalty earnings overview, detailed statements, and payout history
- [ ] **Admin Dashboard:**
  - [ ] Global application metrics (DAUs, revenue, new users)
  - [ ] Content moderation queues
  - [ ] User and creator management tools
  - [ ] Royalty and payout oversight
  - [ ] System health monitoring

---

### 7. Community & Notifications
Features to foster engagement and communication.
- [ ] **Notifications System:**
  - [ ] In-app and email notifications (new chapters, comments, payouts, account alerts)
- [x] **Community Interaction:**
  - [x] Comment and reaction system per chapter - *Reactions and comments (with `commentCounter.ts`) are implemented.*
  - [ ] Creator-following system
- [ ] **Events & Gamification:**
  - [ ] Event system for writing contests, featured stories, etc.
  - [ ] Gamification elements (badges, quests, XP) for readers and creators

---

### 8. Gamification & Minigames
Engaging activities to enhance the user experience.
- [ ] **Minigame Framework:**
  - [ ] Library of simple, embeddable browser-based games
  - [ ] Integration with story progress or chapter milestones
  - [ ] Leaderboards and achievement system

---

### 9. Technical Infrastructure & Backend
Cross-cutting concerns for building a robust and scalable application.
- [x] **Database Structure:**
  - [x] Initial DataConnect schema for users, stories, and content
  - [ ] Expand schema for all modules (payments, royalties, assets, etc.)
- [ ] **API Layer:**
  - [ ] Secure RESTful or GraphQL API for all application modules
  - [ ] Webhooks for third-party integrations (e.g., payment callbacks)
- [ ] **Security:**
  - [ ] Implement robust authorization (RBAC) on all API endpoints
  - [ ] Data encryption at rest and in transit
  - [ ] Input validation to prevent injection attacks
- [ ] **Scalability & Performance:**
  - [ ] Caching mechanisms for frequently accessed data
  - [ ] Content Delivery Network (CDN) for media assets
- [ ] **Admin & Moderation Tools:**
  - [ ] Tools for user/creator management, story moderation, and royalty dispute resolution

---

### 10. Help & Support
Resources and channels for user assistance.
- [ ] **FAQ & Knowledge Base:**
  - [ ] FAQ section for common questions
  - [ ] Detailed documentation for creators on using platform tools
- [ ] **Support Channels:**
  - [ ] Contact/ticket-based support system
