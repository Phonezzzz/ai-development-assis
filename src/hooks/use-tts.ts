import { useState, useCallback, useRef } from 'react';
import { useKV } from '@github/spark/hooks';

export interface TTSState {
  isPlaying: boolean;
  isLoading: boolean;
  currentText: string | null;
  error: string | null;
}

// ElevenLabs voices - реальные ID голосов с поддержкой мультиязычности
export const ELEVENLABS_VOICES = [
  // Ваши предоставленные голоса
  { id: '21masSU9f4isSNm7Egqd', name: 'Голос 1 (Мультиязычный)' },
  { id: 'Ga0Zjw9ZBbevb3wIda0V', name: 'Голос 2 (Мультиязычный)' },
  { id: '0BcDz9UPwL3MpsnTeUlO', name: 'Голос 3 (Мультиязычный)' },
  { id: '2vlCRzCr5OBHeAZiklN6', name: 'Голос 4 (Мультиязычный)' },
  { id: '9J5k2YY8VppC3SZKZslk', name: 'Голос 5 (Мультиязычный)' },
  { id: 'aG9q1I1wTbfHh5sbpJnp', name: 'Голос 6 (Мультиязычный)' },
  
  // Стандартные премиум голоса ElevenLabs
  { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George (Мужской, мультиязычный)' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Женский, мультиязычный)' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh (Мужской, мультиязычный)' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel (Женский, мультиязычный)' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Мужской, мультиязычный)' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (Женский, мультиязычный)' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Josh V2 (Мужской, мультиязычный)' },
  { id: 'piTKgcLEGmPE4e6mEKli', name: 'Nicole (Женский, мультиязычный)' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel (Мужской, британский)' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Женский, американский)' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Fin (Мужской, ирландский)' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli (Женский, американский)' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni (Мужской, американский)' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill (Мужской, американский)' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam (Мужской, американский)' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Freya (Женский, американский)' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave (Мужской, британский)' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda (Женский, американский)' },
  { id: 'g5CIjZEefAph4nQFvHAz', name: 'Glinda (Женский, американский)' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace (Женский, американский)' },
];

export function useTTS() {
  const [ttsState, setTTSState] = useState<TTSState>({
    isPlaying: false,
    isLoading: false,
    currentText: null,
    error: null,
  });

  const [selectedVoice, setSelectedVoice] = useKV<string>('selected-voice', '21masSU9f4isSNm7Egqd');
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

      // Get API key from environment
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      
      // If no API key, use browser TTS as fallback
      if (!apiKey || apiKey === 'sk_298884ecbf7f5cbc3c852e9da181b479693091ef782b42e4') {
        return await browserTTS(text);
      }

      // Use ElevenLabs TTS
      await elevenLabsTTS(text, apiKey);

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

  const browserTTS = useCallback(async (text: string) => {
    if (!('speechSynthesis' in window)) {
      throw new Error('Браузер не поддерживает синтез речи');
    }

    // Stop any existing speech
    speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find Russian voice
    const voices = speechSynthesis.getVoices();
    const russianVoice = voices.find(voice => 
      voice.lang.includes('ru') || 
      voice.name.toLowerCase().includes('russian')
    );
    
    if (russianVoice) {
      utterance.voice = russianVoice;
      utterance.lang = russianVoice.lang;
    } else {
      utterance.lang = 'ru-RU';
    }
    
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
  }, []);

  const elevenLabsTTS = useCallback(async (text: string, apiKey: string) => {
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

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
    }

    const audioBlob = await response.blob();
    
    if (audioBlob.size === 0) {
      throw new Error('Получен пустой аудио файл от ElevenLabs');
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Set up event listeners
    audio.addEventListener('canplay', () => {
      setTTSState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: true,
      }));
    });

    audio.addEventListener('ended', () => {
      setTTSState(prev => ({
        ...prev,
        isPlaying: false,
        currentText: null,
      }));
      URL.revokeObjectURL(audioUrl);
      audioRef.current = null;
    });

    audio.addEventListener('error', () => {
      setTTSState({
        isPlaying: false,
        isLoading: false,
        currentText: null,
        error: 'Ошибка при воспроизведении аудио',
      });
      URL.revokeObjectURL(audioUrl);
      audioRef.current = null;
    });

    await audio.play();
  }, [selectedVoice]);

  const stop = useCallback(() => {
    try {
      // Остановка ElevenLabs аудио
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Остановка браузерного TTS
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
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