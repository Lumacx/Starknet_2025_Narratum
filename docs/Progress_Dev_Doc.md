# Narratum: Progressive Development Plan

This document outlines the recommended development plan for Narratum, based on the unified `OG_Modules.md` and the current `todo.md`. The goal is to prioritize tasks logically, focusing on building a Minimum Viable Product (MVP) first and then progressively adding features in subsequent phases.

---

### Current Status Assessment

Based on `docs/todo.md`, the following foundational pieces are in place:
- **User Authentication:** Core email, wallet login, and automated user profile creation (via `authTriggers.ts`) are functional.
- **Story Creation:** Basic metadata (title, genre, description) can be created, and the initial UI for content generation (including AI image generation and saving to page content) is in place through the multi-step flow in `src/app/create/`.
- **AI Integration:** A basic flow for generating writing prompts exists, and AI image generation with saving capabilities is implemented, utilizing the `generateNarratumImage` Cloud Function and `assetsIndex.ts` for asset management.
- **Database:** An initial schema for users, stories, and content is set up via DataConnect, with asset indexing and comment counting functionality (via `commentCounter.ts`).
- **UI:** Core pages (Landing, Discover) and the multi-step `create` flow have a basic to advanced structure.

---

### Phase 1: Solidify the Core MVP (Create & Read Experience)

The highest priority is to complete the core loop of the application: a creator must be able to write a full story, and a reader must be able to read it.

**1. Implement the Chapter & Content Editor:**
   - **Task:** Develop a comprehensive rich text editor within the Creator Studio for story text content.
   - **Details:** This should allow creators to write and format the text for each chapter or story section. It needs to support basic formatting (bold, italics) and a way to save content, complementing the existing AI image generation for pages.
   - **OG_Modules Ref:** `3. Creator Studio` -> `Chapter & Content Editor`

**2. Enhance the Database Schema:**
   - **Task:** Update the DataConnect schema to fully support detailed story content, including text, page structure, and integrated assets.
   - **Details:** Ensure the `story_content` table (or similar) adequately links to the `story` table and stores all actual text, page/chapter number, and associated asset URLs (images, audio). *This is partially completed with image URL saving.*
   - **OG_Modules Ref:** `9. Technical Infrastructure & Backend` -> `Database Structure`

**3. Build the Story Reader UI:**
   - **Task:** Implement the reader interface to display the content created in the editor, including dynamically loaded images and text.
   - **Details:** This involves fetching the `story_content` and displaying it in a clean, readable format. Implement basic navigation (next/previous chapter/page). *Basic interactive story display is functional.*
   - **OG_Modules Ref:** `2. Story System: Discovery & Reading` -> `Story Reader/Viewer`

**4. Develop the Story Discovery Page:**
   - **Task:** Refine the existing discovery page where users can see a list of all published stories.
   - **Details:** This page should display story covers, titles, authors, and other metadata (like comments count), and link to the story reader. *This is largely complete with semantic search and filtering.*
   - **OG_Modules Ref:** `2. Story System: Discovery & Reading` -> `Story Discovery & Browser`

---

### Phase 2: Introduce Monetization & Advanced Creator Tools

With the core functionality in place, the next phase focuses on monetization and empowering creators with better tools.

**1. Membership & Subscription System:**
   - **Task:** Integrate a payment gateway (e.g., Stripe) and build the subscription management flow.
   - **Details:** Define the "Premium" and "Creator" tiers. Allow users to subscribe, manage, and cancel their memberships.
   - **OG_Modules Ref:** `5. Monetization: Subscriptions & Royalties`

**2. Implement Role-Based Access Control (RBAC):**
   - **Task:** Lock down features based on the user's subscription tier.
   - **Details:** For example, only "Premium" users can access certain AI features, and only "Creator" members can publish stories.
   - **OG_Modules Ref:** `1. Authentication & User Management` -> `Role-Based Access Control`

**3. Creator Royalty & Analytics Foundation:**
   - **Task:** Build the backend logic to track metrics for royalty calculations (e.g., reads per story).
   - **Details:** Implement the Creator Dashboard to show these basic analytics. The actual payout system can be manual initially and automated in a later phase.
   - **OG_Modules Ref:** `6. Dashboards & Analytics` -> `Creator Dashboard`

**4. Enhance AI Tools - Image Generation:**
   - **Task:** Further refine the AI image generation service and its integration.
   - **Details:** Improve image placement options and styling within the Creator Studio. *Initial integration is complete; this focuses on refinement.*
   - **OG_Modules Ref:** `4. AI & Machine Learning Integration` -> `AI Media Generation`

---

### Phase 3: Build Community & Engagement

This phase focuses on features that will help build and retain a user base.

**1. Community Interaction Features:**
   - **Task:** Implement comprehensive comments, reactions, and a creator-following system.
   - **Details:** Allow readers to comment on chapters and follow their favorite creators to receive updates. *Basic reactions and comments (with `commentCounter.ts`) are implemented.*
   - **OG_Modules Ref:** `7. Community & Notifications`

**2. Notifications System:**
   - **Task:** Build an in-app and email notification system.
   - **Details:** Notify users about new chapters from followed creators, comments on their stories, and other important events.
   - **OG_Modules Ref:** `7. Community & Notifications`

**3. User & Profile Dashboards:**
   - **Task:** Develop the reader-facing dashboard and enhance profile pages.
   - **Details:** Allow users to see their reading history, manage their profile, and view their subscription status. *Basic profile management is implemented.*
   - **OG_Modules Ref:** `6. Dashboards & Analytics` -> `Reader Dashboard`

---

### Phase 4: Scale, Enhance & Administer

The final phase focuses on long-term scalability, advanced features, and robust administrative tools.

**1. Advanced AI - Interactive Story Mode:**
   - **Task:** Develop the conversational AI agents for interactive stories.
   - **Details:** This is a major undertaking that will require significant work on context management (RAG) and the chat interface.
   - **OG_Modules Ref:** `4. AI & Machine Learning Integration` -> `AI-Powered Interactive Story Mode`

**2. Full-Fledged Admin Panel:**
   - **Task:** Build the admin dashboard for user management, content moderation, and site-wide analytics.
   - **OG_Modules Ref:** `9. Technical Infrastructure & Backend` -> `Admin & Moderation Tools`

**3. Gamification & Events:**
   - **Task:** Implement the minigame framework and event system (e.g., writing contests).
   - **OG_Modules Ref:** `8. Gamification & Minigames`

**4. Automated Royalty Payouts:**
   - **Task:** Automate the royalty payout system to handle creator payments with minimal manual intervention.
   - **OG_Modules Ref:** `5. Monetization: Subscriptions & Royalties` -> `Creator Royalty Management`
