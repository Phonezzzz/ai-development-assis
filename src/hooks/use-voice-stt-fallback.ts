import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceState } from '@/lib/types';

export function useVoiceSTTFallback() {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
  });

  const [isSupported, setIsSupported] = useState(false);
  const [supportDetails, setSupportDetails] = useState({
    hasSpeechRecognition: false,
    hasMediaDevices: false,
    hasGetUserMedia: false,
    userAgent: '',
    protocol: '',
  });

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Детальная проверка поддержки
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
      };

      setSupportDetails(details);

      // Поддержка есть только если все API доступны и это HTTPS или localhost
      const isSecureContext = window.location.protocol === 'https:' || 
                              window.location.hostname === 'localhost' ||
                              window.location.hostname === '127.0.0.1';

      const fullSupport = details.hasSpeechRecognition && 
                         details.hasMediaDevices && 
                         details.hasGetUserMedia &&
                         isSecureContext;

      setIsSupported(fullSupport);

      console.log('STT Support Check:', {
        ...details,
        isSecureContext,
        fullSupport,
      });

      // Если есть полная поддержка, создаём экземпляр
      if (fullSupport) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || 
                                   (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'ru-RU';
          recognition.maxAlternatives = 1;
          
          recognitionRef.current = recognition;
          console.log('STT: Recognition instance created successfully');
        } catch (error) {
          console.error('STT: Error creating recognition instance:', error);
          setIsSupported(false);
        }
      }
    };

    checkSupport();
  }, []);

  // Создание аудио анализатора для визуальной обратной связи
  const createAudioAnalyser = useCallback(async () => {
    try {
      if (!mediaStreamRef.current) return null;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(mediaStreamRef.current);
      
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      return analyser;
    } catch (error) {
      console.error('Error creating audio analyser:', error);
      return null;
    }
  }, []);

  // Функция получения уровня громкости
  const getVolumeLevel = useCallback(() => {
    if (!analyserRef.current) return 0;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    return sum / bufferLength / 255; // Нормализация к 0-1
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
      if (supportDetails.protocol !== 'https:' && 
          !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        errorMessage += '• Требуется HTTPS соединение\n';
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

      // Создаём аудио анализатор для визуальной обратной связи
      await createAudioAnalyser();

      const recognition = recognitionRef.current;
      if (!recognition) {
        throw new Error('Recognition instance not available');
      }

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
        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
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
  }, [isSupported, voiceState.isListening, supportDetails, createAudioAnalyser]);

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
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    analyserRef.current = null;

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

  return {
    voiceState,
    startListening,
    stopListening,
    isSupported,
    supportDetails,
    getVolumeLevel,
  };
}