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

  // Детальная проверка поддержки - вынесем в функцию для повторного использования
  const checkSupport = useCallback(() => {
    try {
      const hasWindow = typeof window !== 'undefined';
      if (!hasWindow) return false;

      const hasSpeechRecognition = !!(((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition));
      const hasMediaDevices = !!navigator?.mediaDevices;
      const hasGetUserMedia = hasMediaDevices && !!navigator.mediaDevices.getUserMedia;

      console.log('STT Support Check:', {
        hasWindow,
        hasSpeechRecognition,
        hasMediaDevices,
        hasGetUserMedia,
        userAgent: navigator.userAgent.slice(0, 50) + '...'
      });

      return hasSpeechRecognition && hasMediaDevices && hasGetUserMedia;
    } catch (error) {
      console.error('STT: Ошибка проверки поддержки:', error);
      return false;
    }
  }, []);

  const [isSupported, setIsSupported] = useState(false);

  // Проверяем поддержку после монтирования компонента
  useEffect(() => {
    const supported = checkSupport();
    setIsSupported(supported);
    console.log('STT: Поддержка установлена:', supported);
  }, [checkSupport]);

  // Инициализация Speech Recognition
  useEffect(() => {
    if (isInitializedRef.current || !isSupported) {
      console.log('STT: Пропуск инициализации:', { 
        isInitialized: isInitializedRef.current, 
        isSupported 
      });
      return;
    }
    
    try {
      console.log('STT: Начало инициализации...');
      
      // Попробуем получить API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.error('STT: API распознавания речи не найден');
        return;
      }
      
      console.log('STT: API распознавания речи найден, создаём экземпляр...');
      const recognition = new SpeechRecognition();
      
      // Основные настройки
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';
      recognition.maxAlternatives = 1;
      
      // Дополнительные настройки для лучшей работы
      if ('grammars' in recognition) {
        recognition.grammars = new (window as any).SpeechGrammarList();
      }
      
      recognitionRef.current = recognition;
      isInitializedRef.current = true;
      
      console.log('STT: Инициализация успешно завершена');
      
    } catch (error) {
      console.error('STT: Критическая ошибка инициализации:', error);
      isInitializedRef.current = false;
    }
  }, [isSupported]); // Зависимость от isSupported

  const startListening = useCallback(async () => {
    console.log('STT: Попытка запуска распознавания...');
    console.log('STT: Состояние:', { 
      isSupported, 
      isInitialized: isInitializedRef.current,
      hasRecognition: !!recognitionRef.current,
      currentListening: voiceState.isListening 
    });
    
    const recognition = recognitionRef.current;
    if (!recognition) {
      console.error('STT: Recognition не инициализирован');
      alert('Распознавание речи недоступно. Попробуйте обновить страницу или использовать Chrome/Edge.');
      return;
    }

    // Если уже слушаем, останавливаем
    if (voiceState.isListening) {
      console.log('STT: Уже слушаем, остановка...');
      try {
        recognition.stop();
      } catch (error) {
        console.error('STT: Ошибка при остановке:', error);
      }
      return;
    }

    try {
      // Проверяем разрешение на микрофон
      console.log('STT: Проверка разрешения на микрофон...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('STT: Разрешение на микрофон получено');
      
      // Останавливаем поток (нужен только для проверки разрешения)
      stream.getTracks().forEach(track => track.stop());

      // Сброс состояния
      setVoiceState({
        isListening: false,
        isProcessing: false,
        transcript: '',
        confidence: 0,
      });

      // Настраиваем обработчики событий (переопределяем каждый раз)
      recognition.onstart = () => {
        console.log('STT: Событие onstart - распознавание запущено');
        setVoiceState({
          isListening: true,
          isProcessing: true,
          transcript: '',
          confidence: 0,
        });
      };

      recognition.onresult = (event: any) => {
        console.log('STT: Получен результат события:', event.results?.length || 0, 'результатов');
        
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
          
          console.log('STT: Транскрипт:', currentTranscript, 'Финальный:', !!finalTranscript, 'Уверенность:', confidence);
          
          setVoiceState(prev => ({
            ...prev,
            transcript: currentTranscript,
            confidence,
            isProcessing: !finalTranscript,
          }));
          
          // Если получили финальный результат, автоматически останавливаем
          if (finalTranscript && finalTranscript.trim()) {
            console.log('STT: Финальный результат получен, остановка через 100мс...');
            setTimeout(() => {
              try {
                recognition.stop();
              } catch (error) {
                console.error('STT: Ошибка при автоостановке:', error);
              }
            }, 100);
          }
        } catch (error) {
          console.error('STT: Ошибка обработки результата:', error);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('STT: Событие onerror:', event.error, 'Дополнительно:', event);
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));

        // Обработка разных типов ошибок
        switch (event.error) {
          case 'not-allowed':
            console.error('STT: Доступ к микрофону запрещен');
            alert('Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.');
            break;
          case 'audio-capture':
            console.error('STT: Ошибка захвата аудио');
            alert('Ошибка захвата аудио. Проверьте подключение микрофона.');
            break;
          case 'network':
            console.error('STT: Сетевая ошибка');
            alert('Сетевая ошибка. Проверьте подключение к интернету.');
            break;
          case 'no-speech':
            console.log('STT: Речь не обнаружена');
            // Не показываем алерт, это нормальная ситуация
            break;
          case 'aborted':
            console.log('STT: Распознавание прервано');
            // Не показываем алерт, пользователь сам остановил
            break;
          default:
            console.warn('STT: Неизвестная ошибка:', event.error);
            alert(`Ошибка распознавания речи: ${event.error}`);
        }
      };

      recognition.onend = () => {
        console.log('STT: Событие onend - распознавание завершено');
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
      };

      // Запускаем распознавание
      console.log('STT: Попытка запуска recognition.start()...');
      recognition.start();
      console.log('STT: recognition.start() выполнен');
      
    } catch (error) {
      console.error('STT: Критическая ошибка при запуске:', error);
      
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));
      
      let errorMessage = 'Ошибка запуска распознавания речи: ';
      if ((error as any).name === 'NotAllowedError') {
        errorMessage += 'Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.';
      } else if ((error as any).name === 'NotFoundError') {
        errorMessage += 'Микрофон не найден. Подключите микрофон и попробуйте снова.';
      } else if ((error as any).name === 'NotSupportedError') {
        errorMessage += 'Распознавание речи не поддерживается в этом браузере.';
      } else {
        errorMessage += (error as any).message || 'Неизвестная ошибка';
      }
      
      alert(errorMessage);
    }
  }, [voiceState.isListening, isSupported]);

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

  return {
    voiceState,
    startListening,
    stopListening,
    isSupported,
  };
}