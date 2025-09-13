import { config } from '@/lib/config';

export interface Model {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  pricing: {
    prompt: number;
    completion: number;
  };
  contextLength: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class OpenRouterService {
  private baseUrl = 'https://openrouter.ai/api/v1';
  private apiKey = config.openrouter.apiKey;

  constructor() {
    console.log('OpenRouter service initialized with API key:', this.apiKey ? 'Set' : 'Not set');
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  async getModels(): Promise<Model[]> {
    if (!this.isConfigured()) {
      // Return mock models for demo
      return this.getMockModels();
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Agent Workspace',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return this.getMockModels();
    }
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.isConfigured()) {
      // Return mock response for demo
      return this.getMockChatCompletion(request);
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Agent Workspace',
        },
        body: JSON.stringify({
          ...request,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in chat completion:', error);
      // Fallback to mock response
      return this.getMockChatCompletion(request);
    }
  }

  private getMockModels(): Model[] {
    return [
      // FREE MODELS
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B Instruct (Free)',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 131072,
      },
      {
        id: 'meta-llama/llama-3.2-3b-instruct:free',
        name: 'Llama 3.2 3B Instruct (Free)',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 131072,
      },
      {
        id: 'meta-llama/llama-3.2-1b-instruct:free',
        name: 'Llama 3.2 1B Instruct (Free)',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 131072,
      },
      {
        id: 'microsoft/phi-3-mini-128k-instruct:free',
        name: 'Phi-3 Mini 128K Instruct (Free)',
        provider: 'Microsoft',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 128000,
      },
      {
        id: 'mistralai/mistral-7b-instruct:free',
        name: 'Mistral 7B Instruct (Free)',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 32768,
      },

      // OPENAI MODELS
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.005, completion: 0.015 },
        contextLength: 128000,
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.00015, completion: 0.0006 },
        contextLength: 128000,
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.01, completion: 0.03 },
        contextLength: 128000,
      },
      {
        id: 'openai/gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.03, completion: 0.06 },
        contextLength: 8192,
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.0005, completion: 0.0015 },
        contextLength: 16385,
      },

      // ANTHROPIC MODELS
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 },
        contextLength: 200000,
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.015, completion: 0.075 },
        contextLength: 200000,
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 },
        contextLength: 200000,
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00125 },
        contextLength: 200000,
      },

      // GOOGLE MODELS
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        provider: 'Google',
        maxTokens: 4096,
        pricing: { prompt: 0.00125, completion: 0.005 },
        contextLength: 2000000,
      },
      {
        id: 'google/gemini-flash-1.5',
        name: 'Gemini Flash 1.5',
        provider: 'Google',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.0075 },
        contextLength: 1000000,
      },
      {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        provider: 'Google',
        maxTokens: 4096,
        pricing: { prompt: 0.0005, completion: 0.0015 },
        contextLength: 32768,
      },

      // META MODELS
      {
        id: 'meta-llama/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.005, completion: 0.015 },
        contextLength: 131072,
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.0009, completion: 0.0009 },
        contextLength: 131072,
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00025 },
        contextLength: 131072,
      },
      {
        id: 'meta-llama/llama-3.2-90b-vision-instruct',
        name: 'Llama 3.2 90B Vision Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.0009, completion: 0.0009 },
        contextLength: 131072,
      },
      {
        id: 'meta-llama/llama-3.2-11b-vision-instruct',
        name: 'Llama 3.2 11B Vision Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00025 },
        contextLength: 131072,
      },

      // MISTRAL MODELS
      {
        id: 'mistralai/mistral-large',
        name: 'Mistral Large',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.008, completion: 0.024 },
        contextLength: 128000,
      },
      {
        id: 'mistralai/mistral-medium',
        name: 'Mistral Medium',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.0027, completion: 0.0081 },
        contextLength: 32000,
      },
      {
        id: 'mistralai/mistral-small',
        name: 'Mistral Small',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.002, completion: 0.006 },
        contextLength: 32000,
      },
      {
        id: 'mistralai/mistral-7b-instruct',
        name: 'Mistral 7B Instruct',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00025 },
        contextLength: 32768,
      },
      {
        id: 'mistralai/mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B Instruct',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.00024, completion: 0.00024 },
        contextLength: 32768,
      },
      {
        id: 'mistralai/mixtral-8x22b-instruct',
        name: 'Mixtral 8x22B Instruct',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.00065, completion: 0.00065 },
        contextLength: 65536,
      },
      {
        id: 'mistralai/pixtral-12b',
        name: 'Pixtral 12B',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.00015, completion: 0.00015 },
        contextLength: 128000,
      },

      // COHERE MODELS
      {
        id: 'cohere/command-r-plus',
        name: 'Command R+',
        provider: 'Cohere',
        maxTokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 },
        contextLength: 128000,
      },
      {
        id: 'cohere/command-r',
        name: 'Command R',
        provider: 'Cohere',
        maxTokens: 4096,
        pricing: { prompt: 0.0005, completion: 0.0015 },
        contextLength: 128000,
      },

      // DEEPSEEK MODELS
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'DeepSeek',
        maxTokens: 4096,
        pricing: { prompt: 0.00014, completion: 0.00028 },
        contextLength: 64000,
      },
      {
        id: 'deepseek/deepseek-coder',
        name: 'DeepSeek Coder',
        provider: 'DeepSeek',
        maxTokens: 4096,
        pricing: { prompt: 0.00014, completion: 0.00028 },
        contextLength: 64000,
      },

      // QWEN MODELS
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        provider: 'Qwen',
        maxTokens: 4096,
        pricing: { prompt: 0.0009, completion: 0.0009 },
        contextLength: 131072,
      },
      {
        id: 'qwen/qwen-2.5-14b-instruct',
        name: 'Qwen 2.5 14B Instruct',
        provider: 'Qwen',
        maxTokens: 4096,
        pricing: { prompt: 0.0002, completion: 0.0002 },
        contextLength: 131072,
      },
      {
        id: 'qwen/qwen-2.5-7b-instruct',
        name: 'Qwen 2.5 7B Instruct',
        provider: 'Qwen',
        maxTokens: 4096,
        pricing: { prompt: 0.00009, completion: 0.00009 },
        contextLength: 131072,
      },
      {
        id: 'qwen/qwen-2.5-coder-32b-instruct',
        name: 'Qwen 2.5 Coder 32B Instruct',
        provider: 'Qwen',
        maxTokens: 4096,
        pricing: { prompt: 0.0002, completion: 0.0002 },
        contextLength: 131072,
      },

      // OTHER MODELS
      {
        id: 'perplexity/llama-3.1-sonar-large-128k-online',
        name: 'Llama 3.1 Sonar Large 128K Online',
        provider: 'Perplexity',
        maxTokens: 4096,
        pricing: { prompt: 0.001, completion: 0.001 },
        contextLength: 127072,
      },
      {
        id: 'perplexity/llama-3.1-sonar-small-128k-online',
        name: 'Llama 3.1 Sonar Small 128K Online',
        provider: 'Perplexity',
        maxTokens: 4096,
        pricing: { prompt: 0.0002, completion: 0.0002 },
        contextLength: 127072,
      },
      {
        id: 'nvidia/llama-3.1-nemotron-70b-instruct',
        name: 'Llama 3.1 Nemotron 70B Instruct',
        provider: 'NVIDIA',
        maxTokens: 4096,
        pricing: { prompt: 0.00035, completion: 0.0004 },
        contextLength: 131072,
      },
      {
        id: 'microsoft/wizardlm-2-8x22b',
        name: 'WizardLM-2 8x22B',
        provider: 'Microsoft',
        maxTokens: 4096,
        pricing: { prompt: 0.00065, completion: 0.00065 },
        contextLength: 65536,
      },
      {
        id: 'microsoft/phi-3-medium-128k-instruct',
        name: 'Phi-3 Medium 128K Instruct',
        provider: 'Microsoft',
        maxTokens: 4096,
        pricing: { prompt: 0.00014, completion: 0.00014 },
        contextLength: 128000,
      },
      {
        id: 'huggingfaceh4/zephyr-7b-beta',
        name: 'Zephyr 7B Beta',
        provider: 'Hugging Face',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00025 },
        contextLength: 32768,
      },
    ];
  }

  private getMockChatCompletion(request: ChatCompletionRequest): ChatCompletionResponse {
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    
    // Simple mock response based on input
    let mockResponse = 'Это демонстрационный ответ. ';
    
    if (userMessage.toLowerCase().includes('план')) {
      mockResponse += 'Я создал план для вашего запроса:\n\n1. Анализ требований\n2. Разработка архитектуры\n3. Реализация функций\n4. Тестирование\n5. Оптимизация\n\nВы хотите продолжить выполнение этого плана?';
    } else if (userMessage.toLowerCase().includes('код')) {
      mockResponse += 'Вот пример кода:\n\n```javascript\nfunction example() {\n  console.log("Демонстрационный код");\n  return "Результат";\n}\n```';
    } else {
      mockResponse += `Вы написали: "${userMessage}". Для использования реальных моделей ИИ настройте OpenRouter API ключ.`;
    }

    return {
      id: `mock_${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: mockResponse,
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: userMessage.length / 4,
        completion_tokens: mockResponse.length / 4,
        total_tokens: (userMessage.length + mockResponse.length) / 4,
      },
    };
  }
}

export const openRouterService = new OpenRouterService();