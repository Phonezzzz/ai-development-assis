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

  const [selectedVoice, setSelectedVoice] = useKV<string>('selected-voice', '21masSU9f4isSNm7Egqd'); // Ваш первый голос по умолчанию
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
        console.log('ElevenLabs API key not found, using browser TTS as fallback');
        
        // Fallback to browser TTS if ElevenLabs is not available
        console.log('ElevenLabs API key not found, using browser TTS');
        try {
          if ('speechSynthesis' in window) {
            // Остановить предыдущий TTS если он идёт
            speechSynthesis.cancel();
            
            // Get available voices and find Russian ones
            const voices = speechSynthesis.getVoices();
            const russianVoices = voices.filter(voice => 
              voice.lang.includes('ru') || 
              voice.name.toLowerCase().includes('russian') ||
              voice.name.toLowerCase().includes('ru')
            );
            
            console.log('Available Russian voices:', russianVoices.map(v => `${v.name} (${v.lang})`));
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Use Russian voice if available
            if (russianVoices.length > 0) {
              utterance.voice = russianVoices[0];
              utterance.lang = russianVoices[0].lang;
              console.log('Using Russian voice:', russianVoices[0].name);
            } else {
              utterance.lang = 'ru-RU';
              console.log('No Russian voices found, using default with ru-RU lang');
            }
            
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 0.8;
            
            utterance.onstart = () => {
              console.log('Browser TTS started');
              setTTSState(prev => ({
                ...prev,
                isLoading: false,
                isPlaying: true,
              }));
            };
            
            utterance.onend = () => {
              console.log('Browser TTS ended');
              setTTSState(prev => ({
                ...prev,
                isPlaying: false,
                currentText: null,
              }));
            };
            
            utterance.onerror = (event) => {
              console.error('Browser TTS error:', event);
              setTTSState({
                isPlaying: false,
                isLoading: false,
                currentText: null,
                error: 'Ошибка браузерного TTS',
              });
            };
            
            // Wait for voices to load if needed
            if (speechSynthesis.getVoices().length === 0) {
              speechSynthesis.addEventListener('voiceschanged', () => {
                const newVoices = speechSynthesis.getVoices();
                const newRussianVoices = newVoices.filter(voice => 
                  voice.lang.includes('ru') || 
                  voice.name.toLowerCase().includes('russian') ||
                  voice.name.toLowerCase().includes('ru')
                );
                
                if (newRussianVoices.length > 0) {
                  utterance.voice = newRussianVoices[0];
                  utterance.lang = newRussianVoices[0].lang;
                  console.log('Voice loaded, using:', newRussianVoices[0].name);
                }
                
                speechSynthesis.speak(utterance);
              }, { once: true });
            } else {
              speechSynthesis.speak(utterance);
            }
            return;
          } else {
            throw new Error('Браузер не поддерживает синтез речи');
          }
        } catch (browserError) {
          console.error('Browser TTS error:', browserError);
          setTTSState({
            isPlaying: false,
            isLoading: false,
            currentText: null,
            error: 'Ошибка браузерного TTS',
          });
          return;
        }
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