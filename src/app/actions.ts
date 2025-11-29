"use server";

import { ai } from "@/ai/genkit";
import {
  improvePrompt as improvePromptFlow,
  type ImprovePromptInput,
} from "@/ai/flows/improve-prompt";
import { summarizeConversation } from "@/ai/flows/summarize-conversation";
import { Message } from "@/lib/types";
import { Part, Message as GenkitMessage } from "genkit";

export async function generateResponse(
  messages: Message[]
): Promise<string> {
  const systemPrompt = `You are SageSpark, an intelligent and sophisticated AI assistant. Your goal is to provide accurate, helpful, and concise responses. When asked about the conversation history, answer the user's question based on the context, do not just repeat their question back to them.`;
  
  if (messages.length === 0) {
    return "Something went wrong. No messages provided.";
  }

  const history: GenkitMessage[] = messages.slice(0, -1).map((msg) => {
    const role = msg.role === "assistant" ? "model" : "user";
    const content: Part[] = [{ text: msg.content }];
    if (msg.imageUrl) {
      content.push({ media: { url: msg.imageUrl } });
    }
    return { role, content };
  });

  const lastMessage = messages[messages.length - 1];
  const prompt: Part[] = [{ text: lastMessage.content }];
  if (lastMessage.imageUrl) {
    prompt.push({ media: { url: lastMessage.imageUrl } });
  }

  try {
    const llmResponse = await ai.generate({
      system: systemPrompt,
      history: history,
      prompt: prompt,
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
