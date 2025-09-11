import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceState } from '@/lib/types';
import { ttsService } from '@/lib/services/tts';

export function useVoiceRecognition() {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    transcript: '',
    confidence: 0,
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = false;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = 'ru-RU'; // Changed to Russian
          
          recognitionRef.current = recognitionInstance;
        }

        if (window.speechSynthesis) {
          synthesisRef.current = window.speechSynthesis;
        }
      }
    } catch (error) {
      console.warn('Speech API not available:', error);
    }
  }, []);

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      console.warn('Speech recognition not available');
      return;
    }

    try {
      setVoiceState((prev) => ({
        ...prev,
        isListening: true,
        isProcessing: false,
        transcript: '',
      }));

      recognition.onresult = (event) => {
        try {
          const result = event.results[event.results.length - 1];
          const transcript = result.transcript;
          const confidence = result.confidence || 0;

          setVoiceState((prev) => ({
            ...prev,
            transcript,
            confidence,
            isProcessing: !result.isFinal,
          }));
        } catch (error) {
          console.error('Error processing speech result:', error);
        }
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
      };

      recognition.onend = () => {
        setVoiceState((prev) => ({
          ...prev,
          isListening: false,
          isProcessing: false,
        }));
      };

      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
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
      // Try ElevenLabs first, fallback to browser TTS
      if (ttsService.isAvailable()) {
        await ttsService.speak(text);
      } else {
        // Fallback to browser TTS
        const synthesis = synthesisRef.current;
        if (!synthesis) {
          console.warn('Speech synthesis not available');
          return;
        }

        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        utterance.lang = 'ru-RU';
        
        synthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Error with speech synthesis:', error);
      // Final fallback
      const synthesis = synthesisRef.current;
      if (synthesis) {
        synthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        synthesis.speak(utterance);
      }
    }
  }, []);

  const isSupported = Boolean(recognitionRef.current && synthesisRef.current);

  return {
    voiceState,
    startListening,
    stopListening,
    speak,
    isSupported,
  };
}