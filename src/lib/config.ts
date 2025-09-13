// Environment configuration with proper typing
export const config = {
  // Supabase configuration
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://dbwjyqdprvqpajgyvitf.supabase.co',
    key: import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRid2p5cWRwcnZxcGFqZ3l2aXRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5OTQ1NTQsImV4cCI6MjA2ODU3MDU1NH0.NwCwKeLmaE5WaDlZjqjDifGNzObOMPXqLSOrsEeSTxs',
  },
  
  // OpenRouter configuration
  openrouter: {
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY || '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',
    baseUrl: 'https://openrouter.ai/api/v1',
  },
  
  // ElevenLabs configuration
  elevenlabs: {
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY || 'sk_298884ecbf7f5cbc3c852e9da181b479693091ef782b42e4',
    baseUrl: 'https://api.elevenlabs.io/v1',
  },
  
  // OpenAI configuration (for embeddings)
  openai: {
    apiKey: import.meta.env.VITE_OPENAI_API_KEY || '',
    baseUrl: 'https://api.openai.com/v1',
  },
  
  // Qdrant configuration
  qdrant: {
    url: import.meta.env.VITE_QDRANT_URL || 'http://localhost:6333',
    apiKey: import.meta.env.VITE_QDRANT_API_KEY || '',
  },
  
  // Default models
  models: {
    defaultLLM: 'openai/gpt-4o',
    embeddingModel: 'text-embedding-3-small',
    voiceModel: 'eleven_multilingual_v2',
  },
  
  // Feature flags
  features: {
    realTimeVectorSearch: true,
    voiceSynthesis: true,
    projectIndexing: true,
    agentSystem: true,
  },
};

// Type definitions for configuration
export type Config = typeof config;

// Helper function to check if API keys are configured
export const isConfigured = {
  supabase: () => !!config.supabase.url && !!config.supabase.key,
  openrouter: () => !!config.openrouter.apiKey,
  elevenlabs: () => !!config.elevenlabs.apiKey,
  openai: () => !!config.openai.apiKey,
  qdrant: () => !!config.qdrant.url,
};

// Validation functions
export const validateConfig = () => {
  const errors: string[] = [];
  
  if (!isConfigured.supabase()) {
    errors.push('Supabase URL и ключ должны быть настроены');
  }
  
  if (!isConfigured.openrouter()) {
    errors.push('OpenRouter API ключ должен быть настроен');
  }
  
  if (!isConfigured.elevenlabs()) {
    errors.push('ElevenLabs API ключ должен быть настроен');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
};