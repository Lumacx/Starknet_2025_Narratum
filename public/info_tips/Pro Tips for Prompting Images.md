Following this structure can help in creating more precise and effective image generations.

### Components of a Master Prompt:

*   **SUBJECT**: Who or what is the main focus of your image? (e.g., "A knight", "A majestic dragon", "An ancient tree")
*   **ACTION**: What is the subject doing? (e.g., "fighting a monster", "flying over a castle", "standing tall in a forest")
*   **SCENE/SETTING**: Where is the action taking place? Describe the environment. (e.g., "in a dark dungeon", "above a volcanic landscape", "on a misty mountain top")
*   **STYLE/LIGHTING**: What artistic style should the image have, and how is it lit? (e.g., "fantasy art, volumetric lighting", "cyberpunk style, neon glow", "watercolor painting, soft daylight")
*   **CAMERA**: How is the image framed? This can be at the beginning or end of the prompt and acts as a "joker" to influence the overall composition. (e.g., "wide shot", "close-up", "from above", "cinematic view")

## General Tips for Effective Prompting:

*   **Be Specific and Concise**: The more precise your language, the better the AI can understand your intent. Avoid ambiguity.
*   **Use Keywords**: Employ strong descriptive keywords that relate to the subject, action, style, and mood.
*   **Order Matters**: The order of your words can influence the output. Generally, put the most important concepts first.
*   **Experiment with Modifiers**: Use adjectives, adverbs, and artistic terms to fine-tune your results (e.g., "epic", "dynamic", "intricate", "photorealistic").
*   **Negative Prompts (`--no`)**: Use `--no` to exclude elements you don't want in your image (e.g., `--no blurry, deformed, ugly`).
*   **Aspect Ratio (`--ar`)**: Always specify the aspect ratio to control the image dimensions (e.g., `--ar 16:9` for widescreen, `--ar 9:16` for portrait).
*   **Chaos Value (`--c`)**: Experiment with `--c` (0-100) to control the randomness and variety of the generated images. Higher values lead to more abstract results.
*   **Personalization Style (`--p`)**: If available, use `--p` to apply a specific artistic style or emulate a particular artist.