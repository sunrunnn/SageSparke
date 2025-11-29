"use server";

import { ai } from "@/ai/genkit";
import {
  improvePrompt as improvePromptFlow,
  type ImprovePromptInput,
} from "@/ai/flows/improve-prompt";
import { summarizeConversation } from "@/ai/flows/summarize-conversation";
import { Message } from "@/lib/types";
import { Part } from "genkit";

export async function generateResponse(
  messages: Message[]
): Promise<string> {
  const systemPrompt = `You are SageSpark, an intelligent and sophisticated AI assistant. Your goal is to provide accurate, helpful, and concise responses. When asked about the conversation history, answer the user's question based on the context, do not just repeat their question back to them.`;

  const history = messages.map((msg): Part => {
    const part: Part = {
        role: msg.role,
        text: msg.content
    };
    if (msg.imageUrl) {
        part.media = { url: msg.imageUrl };
    }
    return part;
  });

  try {
    const llmResponse = await ai.generate({
      prompt: [
        { text: systemPrompt },
        ...history,
        { text: 'Your response:' },
      ],
      config: {
        temperature: 0.5,
      },
    });

    return llmResponse.text;
  } catch (error: any) {
    console.error("Error generating AI response:", error);
    return `Sorry, I encountered an error while generating a response. Please check your API key and try again.
Error: ${error.message || 'An unknown error occurred.'}`;
  }
}

export async function getPromptImprovement(input: ImprovePromptInput) {
  try {
    const result = await improvePromptFlow(input);
    return result;
  } catch (error: any) {
    console.error("Error improving prompt:", error);
    return {
      improvedPrompt: "",
      explanation:
        `Sorry, I encountered an error while trying to improve the prompt.
Error: ${error.message || 'An unknown error occurred.'}`,
    };
  }
}

export async function getConversationTitle(
  conversation: string
): Promise<string> {
  if (!conversation) return "New Chat";
  if (conversation.length < 20) {
    return conversation;
  }

  try {
    const summary = await summarizeConversation(
      `Generate a short, concise title (5 words or less) for the following conversation snippet:\n\n${conversation}`
    );
    return summary;
  } catch (error) {
    console.error("Error generating title:", error);
    // Return first few words as a fallback
    return conversation.split(" ").slice(0, 5).join(" ");
  }
}
