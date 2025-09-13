import { useState, useCallback, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { ttsService, Voice } from '@/lib/services/tts';

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

  const [selectedVoice] = useKV<string>('selected-voice', 'EXAVITQu4vr4xnSDxMaL');
  const [voices, setVoices] = useState<Voice[]>([]);

  // Load available voices
  useEffect(() => {
    const loadVoices = async () => {
      try {
        const availableVoices = await ttsService.getVoices();
        setVoices(availableVoices);
      } catch (error) {
        console.error('Error loading voices:', error);
      }
    };

    loadVoices();
  }, []);

  const speak = useCallback(async (text: string) => {
    try {
      setTTSState({
        isPlaying: false,
        isLoading: true,
        currentText: text,
        error: null,
      });

      setTTSState(prev => ({
        ...prev,
        isPlaying: true,
        isLoading: false,
      }));

      await ttsService.speak(text, selectedVoice);

      setTTSState(prev => ({
        ...prev,
        isPlaying: false,
        currentText: null,
      }));
    } catch (error) {
      console.error('TTS Error:', error);
      setTTSState({
        isPlaying: false,
        isLoading: false,
        currentText: null,
        error: error instanceof Error ? error.message : 'Ошибка TTS',
      });
    }
  }, [selectedVoice]);

  const stop = useCallback(() => {
    try {
      ttsService.stop();
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
    return ttsService.isAvailable();
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