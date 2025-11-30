'use server';

import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

configureGenkit({
  plugins: [
    googleAI({
      // apiKey: process.env.GEMINI_API_KEY, // Uncomment if you have a key
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
