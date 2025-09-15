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
  free?: boolean;
  isLocal?: boolean;
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
  private localServerUrl: string | null = null;

  constructor() {
    console.log('OpenRouter service initialized with API key:', this.apiKey ? 'Set' : 'Not set');
    // Load saved local server URL
    this.localServerUrl = localStorage.getItem('local-server-url');
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== '';
  }

  setLocalServerUrl(url: string) {
    this.localServerUrl = url;
    localStorage.setItem('local-server-url', url);
  }

  getLocalServerUrl(): string | null {
    return this.localServerUrl;
  }

  async getLocalModels(): Promise<Model[]> {
    if (!this.localServerUrl) return [];

    try {
      const response = await fetch(`${this.localServerUrl}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];
        
        return models.map((model: any) => ({
          id: model.id,
          name: model.id || 'Локальная модель',
          provider: 'Локальный сервер',
          maxTokens: 4096,
          pricing: { prompt: 0, completion: 0 },
          contextLength: model.context_length || 4096,
          free: true,
          isLocal: true,
        }));
      }
    } catch (error) {
      console.error('Error fetching local models:', error);
    }

    return [];
  }

  async getModels(): Promise<Model[]> {
    const allModels: Model[] = [];

    // First, get local models if available
    const localModels = await this.getLocalModels();
    if (localModels.length > 0) {
      allModels.push(...localModels);
    }

    // Then try to fetch from OpenRouter API
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: this.isConfigured() ? {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Agent Workspace',
        } : {},
      });

      if (response.ok) {
        const data = await response.json();
        const models = data.data || [];
        
        // Transform OpenRouter models to our format
        const openRouterModels = models.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          provider: this.extractProvider(model.id),
          maxTokens: model.top_provider?.max_completion_tokens || 4096,
          pricing: {
            prompt: parseFloat(model.pricing?.prompt || '0') * 1000000, // Convert to per-1M tokens
            completion: parseFloat(model.pricing?.completion || '0') * 1000000,
          },
          contextLength: model.context_length || 4096,
          free: (parseFloat(model.pricing?.prompt || '0') === 0 && parseFloat(model.pricing?.completion || '0') === 0) || model.id.includes(':free'),
          isLocal: false,
        })).filter((model: Model) => 
          // Filter out models that don't support chat completion
          !model.id.includes('embedding') && 
          !model.id.includes('tts') && 
          !model.id.includes('whisper') &&
          !model.id.includes('dall-e')
        );

        allModels.push(...openRouterModels);
      }
    } catch (error) {
      console.error('Error fetching models from OpenRouter:', error);
    }

    // If no models found, use fallback
    if (allModels.length === 0) {
      allModels.push(...this.getMockModels());
    }

    // Sort models: local models first, then by provider and name
    return allModels.sort((a: Model, b: Model) => {
      if (a.isLocal && !b.isLocal) return -1;
      if (!a.isLocal && b.isLocal) return 1;
      
      if (a.provider !== b.provider) {
        return a.provider.localeCompare(b.provider);
      }
      return a.name.localeCompare(b.name);
    });
  }

  private extractProvider(modelId: string): string {
    const parts = modelId.split('/');
    if (parts.length > 1) {
      const provider = parts[0];
      // Map common provider names to readable format
      const providerMap: { [key: string]: string } = {
        'openai': 'OpenAI',
        'anthropic': 'Anthropic',
        'google': 'Google',
        'meta-llama': 'Meta',
        'mistralai': 'Mistral AI',
        'cohere': 'Cohere',
        'deepseek': 'DeepSeek',
        'qwen': 'Qwen',
        'microsoft': 'Microsoft',
        'nvidia': 'NVIDIA',
        'perplexity': 'Perplexity',
        'huggingfaceh4': 'Hugging Face',
        'nousresearch': 'Nous Research',
        'teknium': 'Teknium',
        'liquid': 'Liquid',
        'alpindale': 'Alpindale',
        'gryphe': 'Gryphe',
        'koboldai': 'KoboldAI',
        'mancer': 'Mancer',
        'neversleep': 'NeverSleep',
        'undi95': 'Undi95',
        'jondurbin': 'Jon Durbin',
        'cognitivecomputations': 'Cognitive Computations',
        'lizpreciatior': 'Liz Preciatior',
        'recursal': 'Recursal',
        'lynn': 'Lynn',
        'flammenai': 'FlammenAI',
        'sophosympatheia': 'Sophosympatheia',
        'rwkv': 'RWKV',
        'togethercomputer': 'Together',
        'databricks': 'Databricks',
        'mattshumer': 'Matt Shumer',
        'austism': 'Austism',
        'sammcj': 'Samm C',
        'nothingiisreal': 'NothingIsReal',
        'sao10k': 'Sao10K',
        'dragonfly': 'Dragonfly',
        'infermatic': 'Infermatic',
        'eva-unit-01': 'Eva Unit 01',
        'thebloke': 'TheBloke',
        'bigcode': 'BigCode',
      };
      return providerMap[provider.toLowerCase()] || provider;
    }
    return 'Unknown';
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    // Check if this is a local model
    const isLocalModel = await this.isModelLocal(request.model);
    
    if (isLocalModel && this.localServerUrl) {
      return this.createLocalChatCompletion(request);
    }

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

  private async isModelLocal(modelId: string): Promise<boolean> {
    if (!this.localServerUrl) return false;
    
    try {
      const localModels = await this.getLocalModels();
      return localModels.some(model => model.id === modelId);
    } catch {
      return false;
    }
  }

  private async createLocalChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.localServerUrl) {
      throw new Error('Local server URL not configured');
    }

    try {
      const response = await fetch(`${this.localServerUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens || 4000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Local API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in local chat completion:', error);
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
        free: true,
      },
      {
        id: 'meta-llama/llama-3.2-3b-instruct:free',
        name: 'Llama 3.2 3B Instruct (Free)',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 131072,
        free: true,
      },
      {
        id: 'meta-llama/llama-3.2-1b-instruct:free',
        name: 'Llama 3.2 1B Instruct (Free)',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 131072,
        free: true,
      },
      {
        id: 'microsoft/phi-3-mini-128k-instruct:free',
        name: 'Phi-3 Mini 128K Instruct (Free)',
        provider: 'Microsoft',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 128000,
        free: true,
      },
      {
        id: 'mistralai/mistral-7b-instruct:free',
        name: 'Mistral 7B Instruct (Free)',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0, completion: 0 },
        contextLength: 32768,
        free: true,
      },

      // OPENAI MODELS
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.005, completion: 0.015 },
        contextLength: 128000,
        free: false,
      },
      {
        id: 'openai/gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.00015, completion: 0.0006 },
        contextLength: 128000,
        free: false,
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.01, completion: 0.03 },
        contextLength: 128000,
        free: false,
      },
      {
        id: 'openai/gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.03, completion: 0.06 },
        contextLength: 8192,
        free: false,
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        maxTokens: 4096,
        pricing: { prompt: 0.0005, completion: 0.0015 },
        contextLength: 16385,
        free: false,
      },

      // ANTHROPIC MODELS
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 },
        contextLength: 200000,
        free: false,
      },
      {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.015, completion: 0.075 },
        contextLength: 200000,
        free: false,
      },
      {
        id: 'anthropic/claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 },
        contextLength: 200000,
        free: false,
      },
      {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00125 },
        contextLength: 200000,
        free: false,
      },

      // GOOGLE MODELS
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        provider: 'Google',
        maxTokens: 4096,
        pricing: { prompt: 0.00125, completion: 0.005 },
        contextLength: 2000000,
        free: false,
      },
      {
        id: 'google/gemini-flash-1.5',
        name: 'Gemini Flash 1.5',
        provider: 'Google',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.0075 },
        contextLength: 1000000,
        free: false,
      },
      {
        id: 'google/gemini-pro',
        name: 'Gemini Pro',
        provider: 'Google',
        maxTokens: 4096,
        pricing: { prompt: 0.0005, completion: 0.0015 },
        contextLength: 32768,
        free: false,
      },

      // META MODELS
      {
        id: 'meta-llama/llama-3.1-405b-instruct',
        name: 'Llama 3.1 405B Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.005, completion: 0.015 },
        contextLength: 131072,
        free: false,
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.0009, completion: 0.0009 },
        contextLength: 131072,
        free: false,
      },
      {
        id: 'meta-llama/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        provider: 'Meta',
        maxTokens: 4096,
        pricing: { prompt: 0.00025, completion: 0.00025 },
        contextLength: 131072,
        free: false,
      },

      // MISTRAL MODELS
      {
        id: 'mistralai/mistral-large',
        name: 'Mistral Large',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.008, completion: 0.024 },
        contextLength: 128000,
        free: false,
      },
      {
        id: 'mistralai/mistral-medium',
        name: 'Mistral Medium',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.0027, completion: 0.0081 },
        contextLength: 32000,
        free: false,
      },
      {
        id: 'mistralai/mistral-small',
        name: 'Mistral Small',
        provider: 'Mistral AI',
        maxTokens: 4096,
        pricing: { prompt: 0.002, completion: 0.006 },
        contextLength: 32000,
        free: false,
      },

      // OTHER MODELS
      {
        id: 'cohere/command-r-plus',
        name: 'Command R+',
        provider: 'Cohere',
        maxTokens: 4096,
        pricing: { prompt: 0.003, completion: 0.015 },
        contextLength: 128000,
        free: false,
      },
      {
        id: 'deepseek/deepseek-chat',
        name: 'DeepSeek Chat',
        provider: 'DeepSeek',
        maxTokens: 4096,
        pricing: { prompt: 0.00014, completion: 0.00028 },
        contextLength: 64000,
        free: false,
      },
      {
        id: 'qwen/qwen-2.5-72b-instruct',
        name: 'Qwen 2.5 72B Instruct',
        provider: 'Qwen',
        maxTokens: 4096,
        pricing: { prompt: 0.0009, completion: 0.0009 },
        contextLength: 131072,
        free: false,
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