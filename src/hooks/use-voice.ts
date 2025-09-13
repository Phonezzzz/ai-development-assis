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
  const [isSupported, setIsSupported] = useState(false);
  const [supportDetails, setSupportDetails] = useState({
    hasSpeechRecognition: false,
    hasMediaDevices: false,
    hasGetUserMedia: false,
    userAgent: '',
    protocol: '',
    isSecureContext: false,
  });
  
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Детальная проверка поддержки STT
  useEffect(() => {
    const checkSupport = () => {
      const details = {
        hasSpeechRecognition: !!(
          (window as any).SpeechRecognition || 
          (window as any).webkitSpeechRecognition
        ),
        hasMediaDevices: !!navigator?.mediaDevices,
        hasGetUserMedia: !!(navigator?.mediaDevices?.getUserMedia),
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        isSecureContext: window.isSecureContext || 
                        window.location.protocol === 'https:' || 
                        window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1',
      };

      setSupportDetails(details);

      // Поддержка есть только если все API доступны и это безопасный контекст
      const fullSupport = details.hasSpeechRecognition && 
                         details.hasMediaDevices && 
                         details.hasGetUserMedia &&
                         details.isSecureContext;

      setIsSupported(fullSupport);

      console.log('STT Support Check:', {
        ...details,
        fullSupport,
      });

      // Если есть полная поддержка, создаём экземпляр
      if (fullSupport) {
        try {
          console.log('STT: Инициализация распознавания речи...');
          
          const SpeechRecognition = (window as any).SpeechRecognition || 
                                   (window as any).webkitSpeechRecognition;
          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = false; // Изменено на false для лучшей стабильности
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = 'ru-RU';
          recognitionInstance.maxAlternatives = 1;
          
          console.log('STT: Настройки применены:', {
            continuous: recognitionInstance.continuous,
            interimResults: recognitionInstance.interimResults,
            lang: recognitionInstance.lang
          });
          
          recognitionRef.current = recognitionInstance;
        } catch (error) {
          console.error('STT: Ошибка создания экземпляра распознавания:', error);
          setIsSupported(false);
        }
      }
    };

    checkSupport();
  }, []);

  const startListening = useCallback(async () => {
    console.log('=== STT START ATTEMPT ===');
    console.log('Support details:', supportDetails);
    console.log('isSupported:', isSupported);

    if (!isSupported) {
      let errorMessage = 'Распознавание речи недоступно:\n';
      
      if (!supportDetails.hasSpeechRecognition) {
        errorMessage += '• Web Speech API не поддерживается\n';
      }
      if (!supportDetails.hasMediaDevices) {
        errorMessage += '• MediaDevices API недоступен\n';
      }
      if (!supportDetails.hasGetUserMedia) {
        errorMessage += '• getUserMedia недоступен\n';
      }
      if (!supportDetails.isSecureContext) {
        errorMessage += '• Требуется безопасное соединение (HTTPS)\n';
      }

      errorMessage += '\nРекомендации:\n';
      errorMessage += '• Используйте Chrome, Edge или Safari\n';
      errorMessage += '• Обеспечьте HTTPS соединение\n';
      errorMessage += '• Разрешите доступ к микрофону';

      alert(errorMessage);
      return;
    }

    if (voiceState.isListening) {
      console.log('Already listening, stopping...');
      stopListening();
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      console.error('STT: Recognition instance not available');
      alert('Экземпляр распознавания речи недоступен');
      return;
    }

    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      mediaStreamRef.current = stream;
      console.log('Microphone access granted');

      // Сброс состояния
      setVoiceState({
        isListening: false,
        isProcessing: false,
        transcript: '',
        confidence: 0,
      });

      // Настройка обработчиков
      recognition.onstart = () => {
        console.log('STT: Started');
        setVoiceState({
          isListening: true,
          isProcessing: true,
          transcript: '',
          confidence: 0,
        });
      };

      recognition.onresult = (event: any) => {
        console.log('STT: Result received, results count:', event.results?.length);
        
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          
          if (result.isFinal) {
            finalTranscript += transcript;
            console.log('STT: Final transcript:', transcript);
          } else {
            interimTranscript += transcript;
            console.log('STT: Interim transcript:', transcript);
          }
        }
        
        const currentTranscript = finalTranscript || interimTranscript;
        const confidence = event.results[event.results.length - 1]?.[0]?.confidence || 0;
        
        setVoiceState(prev => ({
          ...prev,
          transcript: currentTranscript,
          confidence,
          isProcessing: !finalTranscript,
        }));
        
        // Автоматическая остановка после финального результата
        if (finalTranscript) {
          setTimeout(() => {
            stopListening();
          }, 500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('STT: Error:', event.error);
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));

        // Обработка ошибок с понятными сообщениями
        let errorMessage = '';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Доступ к микрофону запрещен.\nРазрешите доступ в настройках браузера.';
            break;
          case 'audio-capture':
            errorMessage = 'Ошибка захвата аудио.\nПроверьте подключение микрофона.';
            break;
          case 'network':
            errorMessage = 'Сетевая ошибка.\nПроверьте подключение к интернету.';
            break;
          case 'no-speech':
            errorMessage = 'Речь не обнаружена.\nПопробуйте говорить громче.';
            break;
          case 'aborted':
            console.log('Recognition aborted by user');
            return; // Не показываем ошибку
          case 'service-not-allowed':
            errorMessage = 'Сервис распознавания недоступен.\nПопробуйте позже.';
            break;
          default:
            errorMessage = `Ошибка распознавания: ${event.error}`;
        }

        if (errorMessage) {
          alert(errorMessage);
        }

        // Очистка ресурсов
        stopListening();
      };

      recognition.onend = () => {
        console.log('STT: Ended');
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));

        // Очистка ресурсов
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      // Запуск распознавания
      console.log('Starting recognition...');
      recognition.start();

    } catch (error) {
      console.error('STT: Error during startup:', error);
      
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));

      let errorMessage = 'Ошибка запуска распознавания речи:\n';
      if ((error as any).name === 'NotAllowedError') {
        errorMessage += 'Доступ к микрофону запрещен';
      } else if ((error as any).name === 'NotFoundError') {
        errorMessage += 'Микрофон не найден';
      } else if ((error as any).name === 'NotSupportedError') {
        errorMessage += 'Браузер не поддерживает распознавание речи';
      } else {
        errorMessage += (error as any).message || 'Неизвестная ошибка';
      }

      alert(errorMessage);
    }
  }, [isSupported, voiceState.isListening, supportDetails]);

  const stopListening = useCallback(() => {
    console.log('STT: Manual stop requested');
    
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }

    // Очистка ресурсов
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isProcessing: false,
    }));
  }, []);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

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

  return {
    voiceState,
    startListening,
    stopListening,
    speak,
    isSupported,
    supportDetails,
  };
}