'use server';

import OpenAI from 'openai';
import type { Message } from "@/lib/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_API_BASE, // Allow overriding for OpenAI-compatible services
});

// Function to format messages for the OpenAI API
function formatMessagesForOpenAI(messages: Message[]): any[] {
  // The API expects roles of 'user' and 'assistant'.
  // The 'system' role is handled separately.
  return messages.map(msg => {
    const content: any[] = [{ type: 'text', text: msg.content }];
    if (msg.imageUrl) {
      content.push({ type: 'image_url', image_url: { url: msg.imageUrl } });
    }
    return {
      role: msg.role,
      content: content.length === 1 && content[0].type === 'text' ? msg.content : content,
    };
  });
}

export async function generateResponse(messages: Message[]): Promise<string> {
  const model = messages.some(msg => msg.imageUrl) ? 'gpt-4-vision-preview' : 'gpt-3.5-turbo';

  const formattedMessages = formatMessagesForOpenAI(messages);

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: formattedMessages,
      max_tokens: 1500, // Limit response length
    });

    const text = completion.choices[0]?.message?.content;
    return text || "Sorry, I couldn't generate a response.";

  } catch (error) {
    console.error("Failed to generate OpenAI response:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return `Sorry, I encountered an error while generating a response. Please check your API key and try again. Error: ${errorMessage}`;
  }
}

export async function getConversationTitle(messages: Message[]): Promise<string> {
  // Use only text messages for generating the title
  const textMessages = messages.map(msg => ({ role: msg.role, content: msg.content }));

  const systemPrompt = {
    role: 'system',
    content: 'Based on the following conversation, create a short, descriptive title of 5 words or less. Do not include quotes in your response.',
  };

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [systemPrompt, ...textMessages],
      max_tokens: 20,
    });

    const text = completion.choices[0]?.message?.content?.replace(/"/g, "") || "New Chat";
    return text;

  } catch (error) {
    console.error("Failed to generate title with OpenAI:", error);
    return "New Chat";
  }
}
