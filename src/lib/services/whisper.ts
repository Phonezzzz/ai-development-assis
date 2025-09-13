// Сервис для транскрипции аудио с использованием OpenAI Whisper API
class WhisperTranscriptionService {
  private apiKey: string | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeApiKey();
  }

  private initializeApiKey() {
    // Получаем API ключ из переменных окружения или localStorage
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || 
                         localStorage.getItem('openrouter-api-key') ||
                         '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';
    
    if (openRouterKey) {
      this.apiKey = openRouterKey;
      this.isConfigured = true;
      console.log('Whisper service configured with OpenRouter API key');
    } else {
      console.warn('Whisper service not configured - no API key available');
    }
  }

  /**
   * Транскрибирует аудио файл в текст
   */
  async transcribeAudio(audioBlob: Blob): Promise<string> {
    if (!this.isConfigured || !this.apiKey) {
      // Fallback для случая когда API не настроен
      return this.fallbackTranscription(audioBlob);
    }

    try {
      console.log('Transcribing audio with Whisper API...', {
        size: audioBlob.size,
        type: audioBlob.type,
      });

      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'ru'); // Русский язык
      formData.append('response_format', 'text');

      const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': window.location.href,
          'X-Title': 'AI Agents Workspace',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Whisper API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        
        throw new Error(`API Error ${response.status}: ${response.statusText}`);
      }

      const transcription = await response.text();
      console.log('Whisper transcription completed:', transcription);

      return transcription.trim();

    } catch (error) {
      console.error('Error with Whisper transcription:', error);
      
      // Возвращаем fallback транскрипцию в случае ошибки
      return this.fallbackTranscription(audioBlob);
    }
  }

  /**
   * Fallback транскрипция для случаев когда API недоступен
   */
  private async fallbackTranscription(audioBlob: Blob): Promise<string> {
    // Возвращаем сообщение с информацией о размере аудио
    const sizeKB = Math.round(audioBlob.size / 1024);
    const duration = Math.round(audioBlob.size / 16000); // Примерная длительность
    
    console.log('Using fallback transcription for audio:', {
      size: audioBlob.size,
      sizeKB,
      estimatedDuration: duration,
    });

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`[Тестовая транскрипция аудио записи ${sizeKB}КБ, ~${duration}с]`);
      }, 1000);
    });
  }

  /**
   * Проверяет доступность сервиса
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Обновляет API ключ
   */
  updateApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.isConfigured = !!apiKey;
    
    if (apiKey) {
      localStorage.setItem('openrouter-api-key', apiKey);
      console.log('Whisper service API key updated');
    } else {
      localStorage.removeItem('openrouter-api-key');
      console.log('Whisper service API key removed');
    }
  }

  /**
   * Получает информацию о поддерживаемых форматах
   */
  getSupportedFormats(): string[] {
    return [
      'audio/webm',
      'audio/mp4',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ];
  }

  /**
   * Проверяет поддержку формата аудио
   */
  isFormatSupported(mimeType: string): boolean {
    return this.getSupportedFormats().includes(mimeType);
  }
}

export const whisperService = new WhisperTranscriptionService();