"use strict";
// src/ai/flows/generate-writing-prompts.ts
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWritingPrompts = generateWritingPrompts;
/**
 * @fileOverview This file defines a Genkit flow for generating AI-suggested writing prompts.
 *
 * - generateWritingPrompts - A function that generates writing prompts based on user input and a selected template.
 * - GenerateWritingPromptsInput - The input type for the generateWritingPrompts function.
 * - GenerateWritingPromptsOutput - The return type for the generateWritingPrompts function.
 */
const genkit_1 = require("@/ai/genkit");
const genkit_2 = require("genkit");
// Define the input schema
const GenerateWritingPromptsInputSchema = genkit_2.z.object({
    templateTitle: genkit_2.z.string().describe('The title of the story template selected by the user.'),
    userInput: genkit_2.z.string().describe('The user input related to the story, which can be a summary, keywords, or a starting paragraph.'),
});
// Define the output schema
const GenerateWritingPromptsOutputSchema = genkit_2.z.object({
    writingPrompts: genkit_2.z.array(genkit_2.z.string().describe('A list of AI-suggested writing prompts based on the template and user input.')).describe('The array of writing prompts.'),
});
// Define the wrapper function
async function generateWritingPrompts(input) {
    return generateWritingPromptsFlow(input);
}
// Define the prompt
const writingPromptsPrompt = genkit_1.ai.definePrompt({
    name: 'writingPromptsPrompt',
    input: { schema: GenerateWritingPromptsInputSchema },
    output: { schema: GenerateWritingPromptsOutputSchema },
    prompt: `You are a creative writing assistant. Generate a list of compelling writing prompts based on the following story template and user input.

Template Title: {{{templateTitle}}}
User Input: {{{userInput}}}

Consider the template and user input to create diverse and engaging prompts that can help the user expand their narrative. Return the prompts as a JSON array.
`,
});
// Define the flow
const generateWritingPromptsFlow = genkit_1.ai.defineFlow({
    name: 'generateWritingPromptsFlow',
    inputSchema: GenerateWritingPromptsInputSchema,
    outputSchema: GenerateWritingPromptsOutputSchema,
}, async (input) => {
    const { output } = await writingPromptsPrompt(input);
    return output;
});
//# sourceMappingURL=generate-writing-prompts.js.map