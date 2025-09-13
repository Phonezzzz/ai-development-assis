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

  const [selectedVoice, setSelectedVoice] = useKV<string>('selected-voice', 'JBFqnCBsd6RMkjVDRZzb'); // Lily
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(async (text: string) => {
    try {
      if (!text.trim()) return;

      // Stop any current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }

      setTTSState({
        isPlaying: false,
        isLoading: true,
        currentText: text,
        error: null,
      });

      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      if (!apiKey || apiKey === 'your-elevenlabs-api-key-here') {
        console.error('ElevenLabs API ключ не найден в переменных окружения');
        
        // Fallback to browser TTS if ElevenLabs is not available
        try {
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ru-RU';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            utterance.onstart = () => {
              setTTSState(prev => ({
                ...prev,
                isLoading: false,
                isPlaying: true,
              }));
            };
            
            utterance.onend = () => {
              setTTSState(prev => ({
                ...prev,
                isPlaying: false,
                currentText: null,
              }));
            };
            
            utterance.onerror = () => {
              setTTSState({
                isPlaying: false,
                isLoading: false,
                currentText: null,
                error: 'Ошибка браузерного TTS',
              });
            };
            
            speechSynthesis.speak(utterance);
            return;
          }
        } catch (browserError) {
          console.error('Browser TTS error:', browserError);
        }
        
        throw new Error('ElevenLabs API ключ не найден. Проверьте .env файл и убедитесь что VITE_ELEVENLABS_API_KEY установлен правильно.');
      }

      console.log('Using ElevenLabs with voice ID:', selectedVoice);
      console.log('Text to convert (first 50 chars):', text.substring(0, 50) + (text.length > 50 ? '...' : ''));

      // Call ElevenLabs API with proper formatting
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
            stability: 0.6,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        })
      });

      console.log('ElevenLabs API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error response:', errorText);
        
        let errorMessage = `ElevenLabs API error ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.detail) {
            errorMessage += `: ${errorData.detail.message || errorData.detail}`;
          }
        } catch (e) {
          errorMessage += `: ${errorText}`;
        }
        
        throw new Error(errorMessage);
      }

      const audioBlob = await response.blob();
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('Получен пустой аудио файл от ElevenLabs');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up event listeners before playing
      audio.addEventListener('loadstart', () => {
        console.log('Audio loading started');
        setTTSState(prev => ({
          ...prev,
          isLoading: true,
          isPlaying: false,
        }));
      });

      audio.addEventListener('canplay', () => {
        console.log('Audio ready to play');
        setTTSState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: true,
        }));
      });

      audio.addEventListener('ended', () => {
        console.log('Audio playback ended');
        setTTSState(prev => ({
          ...prev,
          isPlaying: false,
          currentText: null,
        }));
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setTTSState({
          isPlaying: false,
          isLoading: false,
          currentText: null,
          error: 'Ошибка при воспроизведении аудио',
        });
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      });

      // Start playing
      await audio.play();
      console.log('Audio playback started successfully');

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
    setSelectedVoice,
  };
}