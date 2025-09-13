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
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          const recognitionInstance = new SpeechRecognition();
          recognitionInstance.continuous = false;
          recognitionInstance.interimResults = true;
          recognitionInstance.lang = 'ru-RU'; // Changed to Russian
          
          recognitionRef.current = recognitionInstance;
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