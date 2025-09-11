import { useState, useEffect, useCallback } from 'react';
import { VoiceState } from '@/lib/types';

export function useVoiceRecognition() {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
  });

  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = false;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'en-US';
        
        setRecognition(recognitionInstance);
      }

      if (window.speechSynthesis) {
        setSynthesis(window.speechSynthesis);
      }
    }
  }, []);

  const startListening = useCallback(() => {
    if (!recognition) return;

    setVoiceState(prev => ({
      ...prev,
      isListening: true,
      isProcessing: false,
      transcript: '',
    }));

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result.transcript;
      const confidence = result.confidence || 0;

      setVoiceState(prev => ({
        ...prev,
        transcript,
        confidence,
        isProcessing: !result.isFinal,
      }));
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));
    };

    recognition.onend = () => {
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));
    };

    try {
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isProcessing: false,
      }));
    }
  }, [recognition]);

  const stopListening = useCallback(() => {
    if (!recognition) return;
    recognition.stop();
  }, [recognition]);

  const speak = useCallback((text: string) => {
    if (!synthesis) return;

    synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    synthesis.speak(utterance);
  }, [synthesis]);

  const isSupported = Boolean(recognition && synthesis);

  return {
    voiceState,
    startListening,
    stopListening,
    speak,
    isSupported,
  };
}