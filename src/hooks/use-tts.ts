import { useState, useCallback, useRef } from 'react';
import { useKV } from '@github/spark/hooks';

export interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  currentText: string | null;
  error: string | null;
}

// ElevenLabs voices available
export const ELEVENLABS_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Английский мужской)' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold (Английский мужской)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Английский мужской)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (Английский женский)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Английский мужской)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Английский женский)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Английский женский)' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie (Английский мужской)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Английский мужской)' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill (Английский мужской)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Английский женский)' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum (Английский мужской)' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (Английский женский)' },
  { id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole (Английский женский)' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam (Английский мужской)' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'George (Английский мужской)' },
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'Lily (Английский женский)' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda (Английский женский)' },
  { id: 'g5CIjZEefAph4nQFvHAz', name: 'Sarah (Английский женский)' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace (Английский женский)' },
];

export function useTTS() {
  const [ttsState, setTTSState] = useState<TTSState>({
    isPlaying: false,
    isLoading: false,
    currentText: null,
    error: null,
  });

  const [selectedVoice] = useKV<string>('selected-voice', 'pNInz6obpgDQGcFmaJgB');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    try {
      if (!text.trim()) return;

      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      setTTSState({
        isPlaying: false,
        isLoading: true,
        currentText: text,
        error: null,
      });

      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey) {
        throw new Error('ElevenLabs API ключ не найден');
      }

      // Call ElevenLabs API
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onloadstart = () => {
        setTTSState(prev => ({
          ...prev,
          isLoading: true,
          isPlaying: false,
        }));
      };

      audio.oncanplay = () => {
        setTTSState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: true,
        }));
      };

      audio.onended = () => {
        setTTSState(prev => ({
          ...prev,
          isPlaying: false,
          currentText: null,
        }));
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      audio.onerror = () => {
        setTTSState({
          isPlaying: false,
          isLoading: false,
          currentText: null,
          error: 'Ошибка при воспроизведении аудио',
        });
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      };

      await audio.play();

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
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
    return !!import.meta.env.VITE_ELEVENLABS_API_KEY;
  }, []);

  return {
    ttsState,
    speak,
    stop,
    isAvailable,
    voices: ELEVENLABS_VOICES,
    selectedVoice,
  };
}