import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceState } from '@/lib/types';

export function useVoiceSTT() {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
  });

  const recognitionRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Инициализация Speech Recognition
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      if (typeof window !== 'undefined') {
        console.log('STT: Инициализация распознавания речи...');
        
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          console.log('STT: API распознавания речи найден');
          const recognition = new SpeechRecognition();
          
          // Настройки
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'ru-RU';
          recognition.maxAlternatives = 1;
          
          recognitionRef.current = recognition;
          isInitializedRef.current = true;
          
          console.log('STT: Инициализация завершена');
        } else {
          console.warn('STT: API распознавания речи не поддерживается в этом браузере');
        }
      }
    } catch (error) {
      console.error('STT: Ошибка инициализации:', error);
    }
  }, []);

  const startListening = useCallback(async () => {
    console.log('STT: Попытка запуска распознавания...');
    
    const recognition = recognitionRef.current;
    if (!recognition) {
      console.error('STT: Recognition не инициализирован');
      alert('Распознавание речи не поддерживается в этом браузере');
      return;
    }

    // Если уже слушаем, останавливаем
    if (voiceState.isListening) {
      console.log('STT: Уже слушаем, остановка...');
      recognition.stop();
      return;
    }

    try {
      // Проверяем разрешение на микрофон
      console.log('STT: Проверка разрешения на микрофон...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('STT: Разрешение на микрофон получено');
      
      // Останавливаем поток (нужен только для проверки разрешения)
      stream.getTracks().forEach(track => track.stop());

      // Настраиваем обработчики событий
      recognition.onstart = () => {
        console.log('STT: Распознавание запущено');
        setVoiceState({
          isListening: true,
          isProcessing: true,
          transcript: '',
          confidence: 0,
        });
      };

      recognition.onresult = (event: any) => {
        console.log('STT: Получен результат события:', event);
        
        try {
          let finalTranscript = '';
          let interimTranscript = '';
          
          // Обрабатываем все результаты
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result[0].transcript;
            
            if (result.isFinal) {
              finalTranscript += transcript;
            } else {
              interimTranscript += transcript;
            }
          }
          
          const currentTranscript = finalTranscript || interimTranscript;
          const confidence = event.results[event.results.length - 1]?.[0]?.confidence || 0;
          
          console.log('STT: Транскрипт:', currentTranscript, 'Финальный:', !!finalTranscript);
          
          setVoiceState(prev => ({
            ...prev,
            transcript: currentTranscript,
            confidence,
            isProcessing: !finalTranscript,
          }));
          
          // Если получили финальный результат, автоматически останавливаем
          if (finalTranscript && finalTranscript.trim()) {
            console.log('STT: Финальный результат получен, остановка...');
            setTimeout(() => {
              recognition.stop();
            }, 100);
          }
        } catch (error) {
          console.error('STT: Ошибка обработки результата:', error);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('STT: Ошибка распознавания:', event.error);
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));

        // Показываем ошибку только для критических случаев
        if (event.error === 'not-allowed') {
          alert('Доступ к микрофону запрещен. Разрешите использование микрофона в настройках браузера.');
        } else if (event.error === 'audio-capture') {
          alert('Ошибка захвата аудио. Проверьте подключение микрофона.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('STT: Ошибка распознавания:', event.error);
        }
      };

      recognition.onend = () => {
        console.log('STT: Распознавание завершено');
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
      };

      // Запускаем распознавание
      console.log('STT: Запуск recognition.start()...');
      recognition.start();
      
    } catch (error) {
      console.error('STT: Ошибка при запуске:', error);
      
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));
      
      if (error.name === 'NotAllowedError') {
        alert('Доступ к микрофону запрещен. Разрешите использование микрофона в настройках браузера.');
      } else if (error.name === 'NotFoundError') {
        alert('Микрофон не найден. Подключите микрофон и попробуйте снова.');
      } else {
        alert('Ошибка доступа к микрофону: ' + error.message);
      }
    }
  }, [voiceState.isListening]);

  const stopListening = useCallback(() => {
    console.log('STT: Принудительная остановка...');
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('STT: Ошибка при остановке:', error);
      }
    }
  }, []);

  const isSupported = Boolean(
    typeof window !== 'undefined' && 
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  );

  return {
    voiceState,
    startListening,
    stopListening,
    isSupported,
  };
}