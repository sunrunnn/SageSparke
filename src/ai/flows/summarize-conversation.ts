'use server';

/**
 * @fileOverview Summarizes a conversation into a concise summary.
 *
 * - summarizeConversation - A function that summarizes a given conversation.
 * - SummarizeConversationInput - The input type for the summarizeConversation function.
 * - SummarizeConversationOutput - The return type for the summarizeConversation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeConversationInputSchema = z.string().describe('The full conversation text to summarize.');
export type SummarizeConversationInput = z.infer<typeof SummarizeConversationInputSchema>;

const SummarizeConversationOutputSchema = z.string().describe('A concise summary of the conversation.');
export type SummarizeConversationOutput = z.infer<typeof SummarizeConversationOutputSchema>;

export async function summarizeConversation(input: SummarizeConversationInput): Promise<SummarizeConversationOutput> {
  return summarizeConversationFlow(input);
}

const summarizeConversationPrompt = ai.definePrompt({
  name: 'summarizeConversationPrompt',
  input: {schema: SummarizeConversationInputSchema},
  output: {schema: SummarizeConversationOutputSchema},
  prompt: `Summarize the following conversation in a concise manner:\n\n{{{input}}}`, // Changed from 'conversation' to 'input'
});

const summarizeConversationFlow = ai.defineFlow(
  {
    name: 'summarizeConversationFlow',
    inputSchema: SummarizeConversationInputSchema,
    outputSchema: SummarizeConversationOutputSchema,
  },
  async input => {
    const {output} = await summarizeConversationPrompt({input}); // Pass the input to the prompt
    return output!;
  }
);
