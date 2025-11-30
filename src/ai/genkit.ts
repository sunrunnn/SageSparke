import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit and configure the Google AI plugin.
// This configuration is applied globally.
export const ai = genkit({
  plugins: [
    googleAI({
      // The API key is read from the GEMINI_API_KEY environment variable.
      // You can also pass it explicitly: apiKey: process.env.GEMINI_API_KEY
    }),
  ],
  // Log debugging information to the console.
  logLevel: 'debug',
  // Enable production-ready monitoring and tracing.
  enableTracingAndMetrics: true,
});
