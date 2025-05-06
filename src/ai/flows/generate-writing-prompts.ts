// src/ai/flows/generate-writing-prompts.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating AI-suggested writing prompts.
 *
 * - generateWritingPrompts - A function that generates writing prompts based on user input and a selected template.
 * - GenerateWritingPromptsInput - The input type for the generateWritingPrompts function.
 * - GenerateWritingPromptsOutput - The return type for the generateWritingPrompts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const GenerateWritingPromptsInputSchema = z.object({
  templateTitle: z.string().describe('The title of the story template selected by the user.'),
  userInput: z.string().describe('The user input related to the story, which can be a summary, keywords, or a starting paragraph.'),
});
export type GenerateWritingPromptsInput = z.infer<typeof GenerateWritingPromptsInputSchema>;

// Define the output schema
const GenerateWritingPromptsOutputSchema = z.object({
  writingPrompts: z.array(
    z.string().describe('A list of AI-suggested writing prompts based on the template and user input.')
  ).describe('The array of writing prompts.'),
});
export type GenerateWritingPromptsOutput = z.infer<typeof GenerateWritingPromptsOutputSchema>;

// Define the wrapper function
export async function generateWritingPrompts(input: GenerateWritingPromptsInput): Promise<GenerateWritingPromptsOutput> {
  return generateWritingPromptsFlow(input);
}

// Define the prompt
const writingPromptsPrompt = ai.definePrompt({
  name: 'writingPromptsPrompt',
  input: {schema: GenerateWritingPromptsInputSchema},
  output: {schema: GenerateWritingPromptsOutputSchema},
  prompt: `You are a creative writing assistant. Generate a list of compelling writing prompts based on the following story template and user input.

Template Title: {{{templateTitle}}}
User Input: {{{userInput}}}

Consider the template and user input to create diverse and engaging prompts that can help the user expand their narrative. Return the prompts as a JSON array.
`,
});

// Define the flow
const generateWritingPromptsFlow = ai.defineFlow(
  {
    name: 'generateWritingPromptsFlow',
    inputSchema: GenerateWritingPromptsInputSchema,
    outputSchema: GenerateWritingPromptsOutputSchema,
  },
  async input => {
    const {output} = await writingPromptsPrompt(input);
    return output!;
  }
);
