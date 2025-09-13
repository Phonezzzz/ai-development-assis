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
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.03, completion: 0.06 },
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
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 },
        contextLength: 200000,
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        provider: 'Google',
        maxTokens: 4096,
        pricing: { prompt: 0.00125, completion: 0.005 },
        contextLength: 1000000,
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