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
  const [isSupported, setIsSupported] = useState(false);

  // Проверка поддержки браузера
  useEffect(() => {
    let supported = false;
    
    try {
      // Проверяем все необходимые API
      const hasWindow = typeof window !== 'undefined';
      const hasSpeechRecognition = hasWindow && !!(
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition
      );
      const hasMediaDevices = !!navigator?.mediaDevices;
      const hasGetUserMedia = hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function';
      
      supported = hasWindow && hasSpeechRecognition && hasMediaDevices && hasGetUserMedia;
      
      console.log('STT Support Check:', {
        hasWindow,
        hasSpeechRecognition,
        hasMediaDevices,
        hasGetUserMedia,
        supported,
        userAgent: navigator.userAgent
      });

      // Если поддержка есть, создаём экземпляр
      if (supported) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Применяем настройки
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'ru-RU';
        recognition.maxAlternatives = 1;
        
        recognitionRef.current = recognition;
        console.log('STT: Recognition instance created successfully');
      }
    } catch (error) {
      console.error('STT: Error during initialization:', error);
      supported = false;
    }
    
    setIsSupported(supported);
  }, []);

  const startListening = useCallback(async () => {
    console.log('STT: Start listening request, supported:', isSupported);
    
    if (!isSupported) {
      alert('Распознавание речи не поддерживается в этом браузере.\nИспользуйте Chrome, Edge или Safari с поддержкой HTTPS.');
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      console.error('STT: No recognition instance available');
      alert('Ошибка инициализации распознавания речи. Попробуйте обновить страницу.');
      return;
    }

    // Если уже слушаем, останавливаем
    if (voiceState.isListening) {
      console.log('STT: Already listening, stopping...');
      try {
        recognition.stop();
      } catch (error) {
        console.error('STT: Error stopping recognition:', error);
      }
      return;
    }

    try {
      // Проверяем разрешение микрофона
      console.log('STT: Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop()); // Сразу останавливаем
      console.log('STT: Microphone permission granted');

      // Сбрасываем состояние
      setVoiceState({
        isListening: false,
        isProcessing: false,
        transcript: '',
        confidence: 0,
      });

      // Настраиваем обработчики
      recognition.onstart = () => {
        console.log('STT: Recording started');
        setVoiceState({
          isListening: true,
          isProcessing: true,
          transcript: '',
          confidence: 0,
        });
      };

      recognition.onresult = (event: any) => {
        console.log('STT: Result received', event.results?.length || 0);
        
        let finalTranscript = '';
        let interimTranscript = '';
        
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
        
        console.log('STT: Transcript:', currentTranscript, 'Final:', !!finalTranscript);
        
        setVoiceState(prev => ({
          ...prev,
          transcript: currentTranscript,
          confidence,
          isProcessing: !finalTranscript,
        }));
        
        // Если финальный результат получен, останавливаем
        if (finalTranscript) {
          setTimeout(() => {
            try {
              recognition.stop();
            } catch (error) {
              console.error('STT: Error auto-stopping:', error);
            }
          }, 100);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('STT: Error event:', event.error);
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));

        // Обработка ошибок
        switch (event.error) {
          case 'not-allowed':
            alert('Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.');
            break;
          case 'audio-capture':
            alert('Ошибка захвата аудио. Проверьте подключение микрофона.');
            break;
          case 'network':
            alert('Сетевая ошибка. Проверьте подключение к интернету.');
            break;
          case 'no-speech':
            console.log('STT: No speech detected');
            // Не показываем алерт
            break;
          case 'aborted':
            console.log('STT: Recognition aborted');
            // Не показываем алерт
            break;
          default:
            alert(`Ошибка распознавания речи: ${event.error}`);
        }
      };

      recognition.onend = () => {
        console.log('STT: Recording ended');
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
      };

      // Запускаем распознавание
      console.log('STT: Starting recognition...');
      recognition.start();
      
    } catch (error) {
      console.error('STT: Error starting recognition:', error);
      
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));
      
      let errorMessage = 'Ошибка запуска распознавания речи: ';
      if ((error as any).name === 'NotAllowedError') {
        errorMessage += 'Доступ к микрофону запрещен';
      } else if ((error as any).name === 'NotFoundError') {
        errorMessage += 'Микрофон не найден';
      } else {
        errorMessage += (error as any).message || 'Неизвестная ошибка';
      }
      
      alert(errorMessage);
    }
  }, [voiceState.isListening, isSupported]);

  const stopListening = useCallback(() => {
    console.log('STT: Manual stop requested');
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('STT: Error manual stopping:', error);
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