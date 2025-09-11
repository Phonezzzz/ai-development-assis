export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider: {
    max_completion_tokens: number;
  };
}

export interface OpenRouterResponse {
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
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    this.baseUrl = import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    this.defaultModel = import.meta.env.VITE_DEFAULT_MODEL || 'meta-llama/llama-3.1-8b-instruct:free';
  }

  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_openrouter_api_key_here';
  }

  async getModels(): Promise<OpenRouterModel[]> {
    if (!this.isConfigured()) {
      return this.getMockModels();
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Ошибка получения моделей:', error);
      return this.getMockModels();
    }
  }

  private getMockModels(): OpenRouterModel[] {
    return [
      {
        id: 'meta-llama/llama-3.1-8b-instruct:free',
        name: 'Llama 3.1 8B Instruct (Free)',
        context_length: 131072,
        pricing: { prompt: '0', completion: '0' },
        top_provider: { max_completion_tokens: 8192 }
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B Instruct',
        context_length: 131072,
        pricing: { prompt: '0.00054', completion: '0.00054' },
        top_provider: { max_completion_tokens: 8192 }
      },
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        context_length: 200000,
        pricing: { prompt: '0.003', completion: '0.015' },
        top_provider: { max_completion_tokens: 8192 }
      },
      {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        context_length: 128000,
        pricing: { prompt: '0.01', completion: '0.03' },
        top_provider: { max_completion_tokens: 4096 }
      },
      {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        context_length: 16385,
        pricing: { prompt: '0.0005', completion: '0.0015' },
        top_provider: { max_completion_tokens: 4096 }
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        context_length: 2000000,
        pricing: { prompt: '0.00125', completion: '0.005' },
        top_provider: { max_completion_tokens: 8192 }
      }
    ];
  }

  async generateCompletion(
    prompt: string,
    model: string = this.defaultModel,
    options: {
      maxTokens?: number;
      temperature?: number;
      systemMessage?: string;
    } = {}
  ): Promise<string> {
    if (!this.isConfigured()) {
      return this.simulateCompletion(prompt, options.systemMessage);
    }

    const {
      maxTokens = 1000,
      temperature = 0.7,
      systemMessage = 'Вы - полезный ИИ-помощник, который отвечает на русском языке.'
    } = options;

    try {
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Agent Workspace'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data: OpenRouterResponse = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('Пустой ответ от API');
      }

      return data.choices[0].message.content || 'Пустой ответ';
    } catch (error) {
      console.error('Ошибка OpenRouter API:', error);
      // Fallback to simulation if API fails
      return this.simulateCompletion(prompt, options.systemMessage);
    }
  }

  private simulateCompletion(prompt: string, systemMessage?: string): string {
    // Простая симуляция ответов на основе ключевых слов
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('план') || lowerPrompt.includes('планировщик')) {
      return `План для выполнения задачи:

1. Анализ требований: ${prompt.slice(0, 100)}...
2. Проектирование архитектуры решения
3. Реализация основных компонентов
4. Тестирование и отладка
5. Финальная проверка качества

Хотите ли вы выполнить этот план?`;
    }
    
    if (lowerPrompt.includes('код') || lowerPrompt.includes('программа')) {
      return `Создаю код для вашего запроса:

\`\`\`typescript
// Пример кода для: ${prompt.slice(0, 50)}...
function exampleFunction() {
  console.log('Реализация вашего запроса');
  return 'Результат выполнения';
}
\`\`\`

Код готов к использованию!`;
    }
    
    if (lowerPrompt.includes('ошибка') || lowerPrompt.includes('исправить')) {
      return `Анализирую ошибку и предлагаю исправление:

Обнаруженная проблема: ${prompt.slice(0, 80)}...

Рекомендуемое решение:
1. Проверить конфигурацию
2. Обновить зависимости
3. Применить исправления

Ошибка должна быть устранена!`;
    }
    
    return `Понял ваш запрос: "${prompt.slice(0, 100)}${prompt.length > 100 ? '...' : ''}"

Обрабатываю задачу и предоставлю результат в соответствии с вашими требованиями.`;
  }

  async generateStream(
    prompt: string,
    model: string = this.defaultModel,
    options: {
      maxTokens?: number;
      temperature?: number;
      systemMessage?: string;
      onChunk?: (chunk: string) => void;
    } = {}
  ): Promise<string> {
    if (!this.isConfigured()) {
      const result = this.simulateCompletion(prompt, options.systemMessage);
      
      // Simulate streaming
      if (options.onChunk) {
        const words = result.split(' ');
        for (let i = 0; i < words.length; i++) {
          setTimeout(() => {
            options.onChunk!(words[i] + ' ');
          }, i * 100);
        }
      }
      
      return result;
    }

    const {
      maxTokens = 1000,
      temperature = 0.7,
      systemMessage = 'Вы - полезный ИИ-помощник, который отвечает на русском языке.',
      onChunk
    } = options;

    try {
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ];

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Agent Workspace'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature,
          stream: true
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Не удалось получить reader для stream');
      }

      let fullResponse = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                onChunk?.(content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('Ошибка stream API:', error);
      return this.generateCompletion(prompt, model, { maxTokens, temperature, systemMessage });
    }
  }
}

export const openRouterService = new OpenRouterService();