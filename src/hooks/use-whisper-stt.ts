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

  const isSupportedValue = !!(
    navigator.mediaDevices && 
    typeof navigator.mediaDevices.getUserMedia === 'function' && 
    typeof MediaRecorder !== 'undefined'
  );

  const startRecording = useCallback(async () => {
    if (!isSupportedValue) {
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
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : MediaRecorder.isTypeSupported('audio/webm') 
            ? 'audio/webm' 
            : 'audio/wav'
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
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mediaRecorder.mimeType || 'audio/webm'
          });
          
          console.log('Audio blob created:', {
            size: audioBlob.size,
            type: audioBlob.type,
            chunks: audioChunksRef.current.length
          });
          
          if (audioBlob.size === 0) {
            throw new Error('Записанный файл пуст. Попробуйте говорить громче или проверьте микрофон.');
          }
          
          const transcript = await transcribeAudio(audioBlob);
          
          setState(prev => ({
            ...prev,
            isProcessing: false,
            transcript,
            confidence: 1, // Whisper обычно надёжный
            error: undefined,
          }));

          console.log('Транскрипция завершена:', transcript);
        } catch (error) {
          console.error('Ошибка транскрипции:', error);
          const errorMessage = error instanceof Error ? error.message : 'Ошибка обработки аудио';
          setState(prev => ({
            ...prev,
            isProcessing: false,
            error: errorMessage,
          }));
          toast.error(errorMessage);
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
    console.log('Начинаем транскрипцию аудио:', {
      size: audioBlob.size,
      type: audioBlob.type
    });

    // Проверяем размер файла
    if (audioBlob.size === 0) {
      throw new Error('Записанный аудиофайл пуст');
    }

    if (audioBlob.size > 25 * 1024 * 1024) { // 25MB limit
      throw new Error('Аудиофайл слишком большой (максимум 25MB)');
    }
    
    // Используем OpenRouter или OpenAI Whisper API
    const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || 
                         localStorage.getItem('openrouter-api-key');
    const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || localStorage.getItem('openai-api-key');

    console.log('API keys check:', {
      hasOpenRouter: !!openrouterKey && openrouterKey !== 'your_openrouter_api_key_here',
      hasOpenAI: !!openaiKey && openaiKey !== 'your_openai_api_key_here'
    });

    // Только OpenAI поддерживает Whisper API для транскрипции
    if (openaiKey && openaiKey !== 'your_openai_api_key_here') {
      return await transcribeWithOpenAI(audioBlob, openaiKey);
    } else {
      throw new Error('Для транскрипции аудио требуется OpenAI API ключ. Добавьте VITE_OPENAI_API_KEY в .env файл.\n\nOpenRouter не поддерживает транскрипцию аудио.');
    }
  };

  const transcribeWithOpenRouter = async (audioBlob: Blob, apiKey: string): Promise<string> => {
    // OpenRouter не поддерживает audio transcription API
    // Возвращаем ошибку с рекомендацией использовать OpenAI
    throw new Error('OpenRouter не поддерживает транскрипцию аудио. Используйте OpenAI API ключ для Whisper.');
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
    isSupported: isSupportedValue,
  };
}