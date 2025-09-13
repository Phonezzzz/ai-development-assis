import { useState, useCallback, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';

export interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  currentText: string | null;
  error: string | null;
}

export function useTTS() {
  const [ttsState, setTTSState] = useState<TTSState>({
    isPlaying: false,
    isLoading: false,
    currentText: null,
    error: null,
  });

  const [selectedVoice] = useKV<string>('selected-voice', '');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      }
    };

    loadVoices();

    // Listen for voices changed event
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      if (!text.trim()) return;

      // Stop any current speech
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      setTTSState({
        isPlaying: false,
        isLoading: true,
        currentText: text,
        error: null,
      });

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Find and set selected voice
      if (selectedVoice) {
        const voice = voices.find(v => v.voiceURI === selectedVoice);
        if (voice) {
          utterance.voice = voice;
        }
      }

      // Set voice parameters
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Set up event handlers
      utterance.onstart = () => {
        setTTSState(prev => ({
          ...prev,
          isPlaying: true,
          isLoading: false,
        }));
      };

      utterance.onend = () => {
        setTTSState(prev => ({
          ...prev,
          isPlaying: false,
          currentText: null,
        }));
      };

      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setTTSState({
          isPlaying: false,
          isLoading: false,
          currentText: null,
          error: 'Ошибка при озвучивании текста',
        });
      };

      // Start speaking
      window.speechSynthesis.speak(utterance);

    } catch (error) {
      console.error('TTS Error:', error);
      setTTSState({
        isPlaying: false,
        isLoading: false,
        currentText: null,
        error: error instanceof Error ? error.message : 'Ошибка TTS',
      });
    }
  }, [selectedVoice, voices]);

  const stop = useCallback(() => {
    try {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      setTTSState({
        isPlaying: false,
        isLoading: false,
        currentText: null,
        error: null,
      });
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
  }, []);

  const isAvailable = useCallback(() => {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }, []);

  return {
    ttsState,
    speak,
    stop,
    isAvailable,
    voices,
    selectedVoice,
  };
}