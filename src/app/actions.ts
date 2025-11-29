'use server';
import { ai } from "@/ai/genkit";
import { Message } from "@/lib/types";
import {
  improvePrompt,
  ImprovePromptInput,
  ImprovePromptOutput,
} from "@/ai/flows/improve-prompt";

export async function generateResponse(messages: Message[]): Promise<string> {
  const systemPrompt = `You are SageSpark, an intelligent and sophisticated AI assistant. Your goal is to provide accurate, helpful, and concise responses. The user is providing you with the entire conversation history in a single block. Use this history to answer their latest message.`;

  const conversationAsString = messages
    .map((msg) => {
      const role = msg.role === "user" ? "User" : "Assistant";
      return `${role}: ${msg.content}`;
    })
    .join("\n");

  try {
    const llmResponse = await ai.generate({
      system: systemPrompt,
      prompt: conversationAsString,
      config: {
        temperature: 0.5,
      },
    });

    return llmResponse.text;
  } catch (error) {
    console.error("Failed to generate response:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return `Sorry, I encountered an error while generating a response. Please check your API key and try again. Error: ${errorMessage}`;
  }
}

export async function getConversationTitle(messages: Message[]): Promise<string> {
  const systemPrompt = `Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response.`;

  const conversationAsString = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join("\n");

  try {
    const llmResponse = await ai.generate({
      system: systemPrompt,
      prompt: conversationAsString,
      config: {
        temperature: 0.2,
      },
    });

    return llmResponse.text.replace(/"/g, "");
  } catch (error) {
    console.error("Failed to generate title:", error);
    return "New Chat";
  }
}

// This function was also deleted by mistake and is now restored.
export async function getPromptImprovement(
  input: ImprovePromptInput
): Promise<ImprovePromptOutput> {
  return improvePrompt(input);
}
