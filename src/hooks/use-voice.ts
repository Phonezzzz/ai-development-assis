import { useState, useEffect, useCallback, useRef } from 'react';
import { useKV } from '@github/spark/hooks';
import { VoiceState } from '@/lib/types';
import { ttsService } from '@/lib/services/tts';

export function useVoiceRecognition() {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
  });

  const [selectedVoice] = useKV<string>('selected-voice', 'EXAVITQu4vr4xnSDxMaL');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        console.log('STT: Инициализация распознавания речи...');
        
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          console.log('STT: API распознавания речи найден');
          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = false;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = 'ru-RU'; // Changed to Russian
          
          console.log('STT: Настройки применены:', {
            continuous: recognitionInstance.continuous,
            interimResults: recognitionInstance.interimResults,
            lang: recognitionInstance.lang
          });
          
          recognitionRef.current = recognitionInstance;
        } else {
          console.warn('STT: API распознавания речи не поддерживается в этом браузере');
        }
      }
    } catch (error) {
      console.warn('STT: Ошибка инициализации API распознавания речи:', error);
    }
  }, []);

  const startListening = useCallback(async () => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      console.warn('STT: Speech recognition not available');
      alert('Распознавание речи не поддерживается в этом браузере. Убедитесь, что вы используете Chrome, Edge или Safari.');
      return;
    }

    try {
      // Проверяем разрешение на микрофон
      console.log('STT: Запрашиваем разрешение на микрофон...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Останавливаем поток, он нам нужен только для проверки разрешения
      
      console.log('STT: Разрешение на микрофон получено, запускаем STT...');

      setVoiceState((prev) => ({
        ...prev,
        isListening: true,
        isProcessing: false,
        transcript: '',
      }));

      recognition.addEventListener('start', () => {
        console.log('STT: Распознавание речи запущено');
      });

      recognition.onresult = (event) => {
        try {
          console.log('STT: Получен результат', event);
          const result = event.results[event.results.length - 1];
          const transcript = result.transcript;
          const confidence = result.confidence || 0;

          console.log('STT: Транскрипт:', transcript, 'Уверенность:', confidence);

          setVoiceState((prev) => ({
            ...prev,
            transcript,
            confidence,
            isProcessing: !result.isFinal,
          }));

          // Если результат финальный, автоматически останавливаем запись
          if (result.isFinal) {
            console.log('STT: Финальный результат получен');
          }
        } catch (error) {
          console.error('STT: Ошибка обработки результата:', error);
        }
      };

      recognition.onerror = (event) => {
        console.error('STT: Ошибка распознавания:', event.error, event);
        let errorMessage = 'Ошибка распознавания речи: ';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage += 'Разрешение на микрофон отклонено';
            break;
          case 'no-speech':
            errorMessage += 'Речь не обнаружена';
            break;
          case 'audio-capture':
            errorMessage += 'Ошибка захвата аудио';
            break;
          case 'network':
            errorMessage += 'Сетевая ошибка';
            break;
          default:
            errorMessage += event.error;
        }
        
        alert(errorMessage);
        
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
      };

      recognition.onend = () => {
        console.log('STT: Запись завершена');
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
      };

      console.log('STT: Запускаем распознавание...');
      recognition.start();
    } catch (error) {
      console.error('STT: Не удалось запустить распознавание речи:', error);
      
      let errorMessage = 'Ошибка доступа к микрофону: ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Разрешение отклонено. Проверьте настройки браузера.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Микрофон не найден.';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      
      setVoiceState((prev) => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));
    }
  }, []);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    
    try {
      recognition.stop();
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      // Try new TTS service first
      if (ttsService.isAvailable()) {
        await ttsService.speak(text, selectedVoice);
      } else {
        // Fallback to browser TTS
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.8;
          utterance.lang = 'ru-RU';
          
          // Используем выбранный голос, если он задан
          if (selectedVoice) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.voiceURI === selectedVoice);
            if (voice) {
              utterance.voice = voice;
            }
          }
          
          window.speechSynthesis.speak(utterance);
        } else {
          console.warn('No TTS available');
        }
      }
    } catch (error) {
      console.error('Error with speech synthesis:', error);
      // Final fallback to browser TTS
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [selectedVoice]);

  const isSupported = Boolean(recognitionRef.current);

  return {
    voiceState,
    startListening,
    stopListening,
    speak,
    isSupported,
  };
}