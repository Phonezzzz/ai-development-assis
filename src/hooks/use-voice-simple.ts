import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceState } from '@/lib/types';

export interface SimpleVoiceState extends VoiceState {
  error?: string;
  method?: 'webspeech' | 'none';
}

export function useVoiceSimple() {
  const [voiceState, setVoiceState] = useState<SimpleVoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
    method: 'webspeech',
  });

  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Check support once on mount
  useEffect(() => {
    const checkSupport = () => {
      const hasWebSpeech = !!(
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition
      );
      
      const hasMediaDevices = !!navigator?.mediaDevices?.getUserMedia;
      const isSecureContext = window.isSecureContext || 
                              window.location.protocol === 'https:' || 
                              window.location.hostname === 'localhost';

      const supported = hasWebSpeech && hasMediaDevices && isSecureContext;
      setIsSupported(supported);

      if (supported) {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || 
                                   (window as any).webkitSpeechRecognition;
          const recognition = new SpeechRecognition();
          
          recognition.continuous = false;
          recognition.interimResults = true;
          recognition.lang = 'ru-RU';
          recognition.maxAlternatives = 1;
          
          recognitionRef.current = recognition;
          
          setVoiceState(prev => ({ ...prev, method: 'webspeech' }));
        } catch (error) {
          console.error('Error initializing speech recognition:', error);
          setIsSupported(false);
        }
      }
    };

    checkSupport();
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported || !recognitionRef.current) {
      console.warn('Speech recognition not supported');
      return;
    }

    if (voiceState.isListening) {
      stopListening();
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      mediaStreamRef.current = stream;
      const recognition = recognitionRef.current;

      // Set up event handlers
      recognition.onstart = () => {
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
        }));
        
        if (finalTranscript) {
          setTimeout(() => stopListening(), 500);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
          error: `Ошибка распознавания: ${event.error}`,
        }));
        cleanup();
      };

      recognition.onend = () => {
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
        cleanup();
      };

      recognition.start();

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setVoiceState(prev => ({
        ...prev,
        error: `Ошибка доступа к микрофону: ${(error as any).message}`,
      }));
    }
  }, [isSupported, voiceState.isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
    cleanup();
  }, []);

  const cleanup = useCallback(() => {
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const supportDetails = {
    hasSpeechRecognition: !!(
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition
    ),
    hasMediaDevices: !!navigator?.mediaDevices,
    hasGetUserMedia: !!navigator?.mediaDevices?.getUserMedia,
    userAgent: navigator.userAgent,
    protocol: window.location.protocol,
    isSecureContext: window.isSecureContext || 
                    window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost',
  };

  return {
    voiceState,
    startListening,
    stopListening,
    isSupported,
    supportDetails,
  };
}