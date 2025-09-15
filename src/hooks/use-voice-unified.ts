import { useState, useCallback, useRef, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { VoiceState } from '@/lib/types';
import { useWhisperSTT } from './use-whisper-stt';
import { toast } from 'sonner';

interface UnifiedVoiceState extends VoiceState {
  method: 'webspeech' | 'whisper';
  error?: string;
}

export function useVoiceUnified() {
  const [voiceState, setVoiceState] = useState<UnifiedVoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
    method: 'webspeech',
  });

  const [supportDetails, setSupportDetails] = useState({
    hasSpeechRecognition: false,
    hasWebSpeechAPI: false,
    hasMediaDevices: false,
    hasGetUserMedia: false,
    hasWhisperAPI: false,
    userAgent: '',
    protocol: '',
    isSecureContext: false,
  });

  // Whisper fallback hook
  const whisperSTT = useWhisperSTT();

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Проверка поддержки различных методов STT
  useEffect(() => {
    const checkSupport = () => {
      const hasWebSpeech = !!(
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition
      );
      
      const hasMediaDevices = !!navigator?.mediaDevices;
      const hasGetUserMedia = !!(navigator?.mediaDevices?.getUserMedia);
      const isSecureContext = window.isSecureContext || 
                              window.location.protocol === 'https:' || 
                              window.location.hostname === 'localhost' ||
                              window.location.hostname === '127.0.0.1';

      // Проверяем доступность Whisper API (наличие OpenAI ключа)
      const openaiKey = import.meta.env.VITE_OPENAI_API_KEY || 
                       localStorage.getItem('openai-api-key');
      const hasWhisperAPI = !!(openaiKey && openaiKey !== 'your_openai_api_key_here');

      const details = {
        hasSpeechRecognition: hasWebSpeech,
        hasWebSpeechAPI: hasWebSpeech && hasMediaDevices && hasGetUserMedia && isSecureContext,
        hasMediaDevices,
        hasGetUserMedia,
        hasWhisperAPI,
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        isSecureContext,
      };

      setSupportDetails(details);

      // Определяем предпочтительный метод
      let preferredMethod: 'webspeech' | 'whisper' = 'webspeech';
      
      // Firefox не поддерживает Web Speech API для распознавания
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
      
      if (isFirefox || !details.hasWebSpeechAPI) {
        preferredMethod = 'whisper';
      }

      setVoiceState(prev => ({
        ...prev,
        method: preferredMethod,
      }));

      console.log('STT Support Check:', {
        ...details,
        preferredMethod,
        isFirefox,
      });

      // Инициализируем Web Speech API если он доступен
      if (details.hasWebSpeechAPI && !isFirefox) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || 
                                   (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'ru-RU';
          recognition.maxAlternatives = 1;
          
          recognitionRef.current = recognition;
          console.log('STT: Web Speech API initialized');
        } catch (error) {
          console.error('STT: Error initializing Web Speech API:', error);
          setVoiceState(prev => ({
            ...prev,
            method: 'whisper',
          }));
        }
      }
    };

    checkSupport();
  }, []);

  const startListening = useCallback(async () => {
    console.log('=== Unified STT START ===');
    console.log('Method:', voiceState.method);
    console.log('Support details:', supportDetails);

    // Проверяем доступность выбранного метода
    if (voiceState.method === 'webspeech') {
      if (!supportDetails.hasWebSpeechAPI) {
        console.log('Web Speech API недоступен, переключаемся на Whisper');
        setVoiceState(prev => ({ ...prev, method: 'whisper' }));
        return;
      }
      
      await startWebSpeechListening();
    } else {
      if (!supportDetails.hasWhisperAPI) {
        toast.error('Для распознавания речи в Firefox требуется OpenAI API ключ.\nДобавьте его в настройках.');
        return;
      }
      
      await startWhisperListening();
    }
  }, [voiceState.method, supportDetails.hasWebSpeechAPI, supportDetails.hasWhisperAPI]);

  const startWebSpeechListening = useCallback(async () => {
    console.log('Starting Web Speech API listening...');
    
    if (voiceState.isListening) {
      stopListening();
      return;
    }

    const recognition = recognitionRef.current;
    if (!recognition) {
      console.error('Recognition instance not available');
      return;
    }

    try {
      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      mediaStreamRef.current = stream;

      // Настройка обработчиков
      recognition.onstart = () => {
        console.log('Web Speech API: Started');
        setVoiceState(prev => ({
          ...prev,
          isListening: true,
          isProcessing: true,
          transcript: '',
          confidence: 0,
          error: undefined,
        }));
      };

      recognition.onresult = (event: any) => {
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
        
        setVoiceState(prev => ({
          ...prev,
          transcript: currentTranscript,
          confidence,
          isProcessing: !finalTranscript,
          error: undefined,
        }));
        
        if (finalTranscript) {
          setTimeout(() => stopListening(), 500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Web Speech API Error:', event.error);
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
          error: `Web Speech API error: ${event.error}`,
        }));

        stopListening();
      };

      recognition.onend = () => {
        console.log('Web Speech API: Ended');
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));

        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      recognition.start();

    } catch (error) {
      console.error('Error starting Web Speech API:', error);
      setVoiceState(prev => ({
        ...prev,
        error: `Microphone error: ${(error as any).message}`,
      }));
    }
  }, [voiceState.isListening]);

  const startWhisperListening = useCallback(async () => {
    console.log('Starting Whisper listening...');
    
    if (voiceState.isListening) {
      stopListening();
      return;
    }

    // Используем Whisper STT hook
    await whisperSTT.startRecording();
    
    // Синхронизируем состояние
    setVoiceState(prev => ({
      ...prev,
      isListening: whisperSTT.state.isRecording,
      isProcessing: whisperSTT.state.isProcessing,
      transcript: whisperSTT.state.transcript,
      confidence: whisperSTT.state.confidence,
      error: whisperSTT.state.error,
      method: 'whisper',
    }));
  }, [voiceState.isListening, whisperSTT]);

  // Синхронизация состояния Whisper - избегаем циклов
  useEffect(() => {
    if (voiceState.method === 'whisper' && 
        (whisperSTT.state.transcript !== voiceState.transcript ||
         whisperSTT.state.isRecording !== voiceState.isListening ||
         whisperSTT.state.isProcessing !== voiceState.isProcessing)) {
      setVoiceState(prev => ({
        ...prev,
        isListening: whisperSTT.state.isRecording,
        isProcessing: whisperSTT.state.isProcessing,
        transcript: whisperSTT.state.transcript,
        confidence: whisperSTT.state.confidence,
        error: whisperSTT.state.error,
      }));
    }
  }, [
    whisperSTT.state.isRecording, 
    whisperSTT.state.isProcessing, 
    whisperSTT.state.transcript, 
    whisperSTT.state.confidence, 
    whisperSTT.state.error,
    voiceState.method,
    voiceState.transcript,
    voiceState.isListening,
    voiceState.isProcessing
  ]);

  const stopListening = useCallback(() => {
    console.log('Stopping unified STT...');
    
    if (voiceState.method === 'webspeech') {
      const recognition = recognitionRef.current;
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          console.error('Error stopping Web Speech API:', error);
        }
      }

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    } else {
      whisperSTT.stopRecording();
    }

    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isProcessing: false,
    }));
  }, [voiceState.method, whisperSTT.stopRecording]);

  // Очистка при размонтировании - избегаем зависимости от изменяющихся функций
  useEffect(() => {
    return () => {
      // Прямая очистка без вызова stopListening
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          console.error('Error stopping recognition on unmount:', error);
        }
      }
      
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const isSupported = supportDetails.hasWebSpeechAPI || supportDetails.hasWhisperAPI;

  return {
    voiceState,
    startListening,
    stopListening,
    isSupported,
    supportDetails,
  };
}