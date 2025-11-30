'use server';

import { genkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({
      // apiKey: process.env.GEMINI_API_KEY, // Uncomment if you have a key
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
