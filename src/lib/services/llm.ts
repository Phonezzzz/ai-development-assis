import { openRouterService } from './openrouter';

/**
 * Direct LLM service for simple question answering
 */
export class LLMService {
  async askQuestion(question: string): Promise<string> {
    try {
      // Use spark.llm for direct LLM calls
      const prompt = spark.llmPrompt`Ответь на следующий вопрос подробно и полезно: ${question}`;
      const response = await spark.llm(prompt);
      
      return response;
    } catch (error) {
      console.error('Error asking LLM question:', error);
      
      // Fallback to OpenRouter if spark.llm is not available
      try {
        const chatResponse = await openRouterService.createChatCompletion({
          model: 'meta-llama/llama-3.1-8b-instruct:free',
          messages: [
            {
              role: 'system',
              content: 'Ты полезный ИИ-ассистент. Отвечай подробно и информативно на русском языке.'
            },
            {
              role: 'user',
              content: question
            }
          ],
          temperature: 0.7,
          max_tokens: 4000
        });
        
        return chatResponse.choices[0]?.message?.content || 'Извините, не удалось получить ответ.';
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        throw new Error('Не удалось получить ответ от ИИ. Проверьте настройки API.');
      }
    }
  }

  async generateResponse(prompt: string, model?: string): Promise<string> {
    try {
      const llmPrompt = spark.llmPrompt`${prompt}`;
      return await spark.llm(llmPrompt, model);
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Ошибка генерации ответа');
    }
  }
}

export const llmService = new LLMService();