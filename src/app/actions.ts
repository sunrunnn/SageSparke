"use server";

import { generate } from "@genkit-ai/ai";
import { ai } from "@/ai/genkit";
import {
  improvePrompt as improvePromptFlow,
  type ImprovePromptInput,
} from "@/ai/flows/improve-prompt";
import { summarizeConversation } from "@/ai/flows/summarize-conversation";

export async function generateResponse(prompt: string): Promise<string> {
  const fullPrompt = `You are SageSpark, an intelligent and sophisticated AI assistant. Your goal is to provide accurate, helpful, and concise responses. Respond to the following user prompt.
  User prompt: "${prompt}"
  Your response:`;

  try {
    const llmResponse = await generate({
      model: ai.model,
      prompt: fullPrompt,
      config: {
        temperature: 0.5,
      },
    });

    return llmResponse.text();
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "Sorry, I encountered an error while generating a response. Please check your API key and try again.";
  }
}

export async function getPromptImprovement(input: ImprovePromptInput) {
  try {
    const result = await improvePromptFlow(input);
    return result;
  } catch (error) {
    console.error("Error improving prompt:", error);
    return {
      improvedPrompt: "",
      explanation:
        "Sorry, I encountered an error while trying to improve the prompt.",
    };
  }
}

export async function getConversationTitle(
  conversation: string
): Promise<string> {
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
