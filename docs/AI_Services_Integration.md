# AI Services Integration

This document details the technical integration points and usage of Artificial Intelligence models and API endpoints within Narratum, focusing on image generation, image description, and conversational AI.

## 1. Image Generation with Gemini and Imagen

Narratum utilizes a multi-tiered approach for image generation, prioritizing the `gemini-2.5-flash-image-preview` model and falling back to Imagen models when necessary.

### 1.1. `gemini-2.5-flash-image-preview`

*   **Integration:** Integrated via the `@google/genai` library, which provides a client for interacting with Google's generative AI models.
*   **Role:** This model serves as the primary engine for advanced image generation tasks, including both text-to-image and image-to-image (composition/editing).
*   **Image Input (`Part` Objects):** For image editing or composition, the `gemini-2.5-flash-image-preview` model can accept existing images as input. These images are typically represented as `Part` objects, allowing the model to incorporate visual context alongside textual prompts.
    ```typescript
    // Example of a Part object for image input
    const imagePart = {
      inlineData: {
        data: Buffer.from(imageBuffer).toString('base64'),
        mimeType: 'image/png',
      },
    };
    ```

### 1.2. Imagen Models (Fallback)

*   **Role:** Imagen models act as a robust fallback mechanism if the `gemini-2.5-flash-image-preview` model is unavailable or encounters specific issues. They primarily handle text-to-image generation.

### 1.3. `/api/generate-image` Endpoint

This Next.js API route (`src/app/api/generate-image/route.ts`) is the central entry point for all image generation requests within Narratum.

*   **Request Format:** Accepts a JSON payload containing:
    *   `prompt: string`: The main textual description for the image.
    *   `imageData?: { base64: string; mimeType: string }[]`: Optional array of base64-encoded image data for image-to-image tasks (e.g., scene composition, editing).
    *   `style?: string`: Optional artistic style guidance.
    *   `aspectRatio?: string`: Desired aspect ratio for the output image.

*   **Response Format:** Returns a JSON object with:
    *   `imageUrl: string`: The URL of the generated image (e.g., a Google Cloud Storage URL).
    *   `message?: string`: Optional status or error message.

*   **Three-Tier Fallback Logic:** The endpoint implements a sophisticated fallback strategy:
    1.  **Firebase Function (Primary):** Attempts to use a Firebase Cloud Function for image generation, which is configured to leverage `gemini-2.5-flash-image-preview` first.
    2.  **Gemini Image Preview (Direct Fallback):** If the Firebase Function fails or is unavailable, it directly calls the `gemini-2.5-flash-image-preview` model via the `@google/genai` client.
    3.  **Imagen (Secondary Fallback):** If both the Firebase Function and direct Gemini call fail, it falls back to a configured Imagen model for basic text-to-image generation.

*   **Contextual Prompting (`composePromptForImagen`):** For better quality and relevance, especially when falling back to Imagen, a utility function (`composePromptForImagen`, likely in `src/ai/functions/index.ts` or similar) intelligently constructs prompts by incorporating additional context such as:
    *   Story genre descriptors.
    *   Story synopsis.
    *   Character descriptions.
    *   Location details.
    *   User-specified style and aspect ratio.

## 2. Image Description

Narratum uses AI to describe images, primarily for accessibility and to facilitate further AI-driven content generation.

### 2.1. `/api/describe-image` Endpoint

This Next.js API route (`src/app/api/describe-image/route.ts`) is responsible for taking an image and returning a textual description of its content.

*   **Request Format:** Accepts a JSON payload containing:
    *   `imageData: { base64: string; mimeType: string }`: The base64-encoded image data and its MIME type.

*   **Response Format:** Returns a JSON object with:
    *   `description: string`: The AI-generated textual description of the image.
    *   `message?: string`: Optional status or error message.

*   **Usage:** Internally, this endpoint likely utilizes a multimodal AI model (such as `gemini-2.5-flash-image-preview` or a dedicated vision model) to analyze the image content and generate a descriptive caption.

## 3. Conversational AI with ElevenLabs Convai

Narratum integrates with ElevenLabs Convai to provide interactive conversational AI agents within stories, enhancing immersion and dynamic character interactions.

### 3.1. Integration Details

*   **`convaiAgentId`:** Stories configured with a premium feature can specify a `convaiAgentId`. This ID is stored as part of the story's `premium` data in Firestore.
*   **Widget Embedding:** When a story with a `convaiAgentId` is loaded in the `StoryReader` component (`src/components/StoryReader.tsx`):
    1.  The component conditionally renders an `<elevenlabs-convai>` custom HTML element.
    2.  A required script for the Convai widget is dynamically loaded into the document.
    3.  The `convaiAgentId` is passed as an attribute to the custom element, which then initializes and displays the interactive AI character.

*   **User Experience:** Readers can then engage in real-time conversations with an AI character directly within the story, driven by the configured Convai agent.

## 4. AI Prompt Flows (Genkit)

Narratum also leverages Genkit, an open-source framework for building production-ready AI applications, particularly for managing AI prompt flows.

*   **`src/ai/flows/generate-writing-prompts.ts`:** This file defines a Genkit flow responsible for generating creative writing prompts. This flow likely orchestrates calls to an LLM (e.g., Gemini) with specific instructions and context to produce high-quality, relevant prompts for users in the story creation process (e.g., in `/create/support`).

This comprehensive integration of various AI services empowers Narratum with advanced capabilities for content generation, user support, and interactive storytelling.