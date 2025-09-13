import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface WhisperSTTState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  confidence: number;
  error?: string;
}

export function useWhisperSTT() {
  const [state, setState] = useState<WhisperSTTState>({
    isRecording: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const isSupported = () => {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  };

  const startRecording = useCallback(async () => {
    if (!isSupported()) {
      toast.error('Запись аудио не поддерживается в этом браузере');
      return;
    }

    if (state.isRecording) {
      stopRecording();
      return;
    }

    try {
      console.log('Запрашиваем доступ к микрофону...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Запись остановлена, обрабатываем аудио...');
        setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));
        
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const transcript = await transcribeAudio(audioBlob);
          
          setState(prev => ({
            ...prev,
            isProcessing: false,
            transcript,
            confidence: 1, // Whisper обычно надёжный
          }));

          console.log('Транскрипция завершена:', transcript);
        } catch (error) {
          console.error('Ошибка транскрипции:', error);
          setState(prev => ({
            ...prev,
            isProcessing: false,
            error: 'Ошибка обработки аудио',
          }));
          toast.error('Ошибка при транскрипции аудио');
        }
      };

      mediaRecorder.start();
      setState(prev => ({ ...prev, isRecording: true, transcript: '', error: undefined }));
      console.log('Запись начата');
      toast.success('Запись началась');

    } catch (error) {
      console.error('Ошибка начала записи:', error);
      setState(prev => ({ ...prev, error: 'Ошибка доступа к микрофону' }));
      
      if ((error as any).name === 'NotAllowedError') {
        toast.error('Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.');
      } else if ((error as any).name === 'NotFoundError') {
        toast.error('Микрофон не найден');
      } else {
        toast.error('Ошибка при запуске записи');
      }
    }
  }, [state.isRecording]);

  const stopRecording = useCallback(() => {
    console.log('Останавливаем запись...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setState(prev => ({ ...prev, isRecording: false }));
    console.log('Запись остановлена');
  }, []);

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    // Конвертируем webm в wav для лучшей совместимости
    const audioBuffer = await audioBlob.arrayBuffer();
    
    // Используем OpenRouter или OpenAI Whisper API
    const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || 
                         localStorage.getItem('openrouter-api-key') ||
                         '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';
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai-api-key');

    if (openrouterKey && openrouterKey !== 'your_openrouter_api_key_here') {
      return await transcribeWithOpenRouter(audioBlob, openrouterKey);
    } else if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
      return await transcribeWithOpenAI(audioBlob, openaiKey);
    } else {
      throw new Error('Не найден API ключ для транскрипции. Добавьте OPENROUTER_API_KEY или OPENAI_API_KEY в .env или localStorage');
    }
  };

  const transcribeWithOpenRouter = async (audioBlob: Blob, apiKey: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'openai/whisper-1');
    formData.append('language', 'ru');

    const response = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    return result.text || '';
  };

  const transcribeWithOpenAI = async (audioBlob: Blob, apiKey: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    return result.text || '';
  };

  return {
    state,
    startRecording,
    stopRecording,
    isSupported: isSupported(),
  };
}