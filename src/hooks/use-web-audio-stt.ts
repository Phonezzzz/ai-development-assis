import { useState, useCallback, useRef, useEffect } from 'react';
import { VoiceState } from '@/lib/types';
import { whisperService } from '@/lib/services/whisper';

interface WebAudioSTTState extends VoiceState {
  isRecording: boolean;
  audioLevel: number;
}

export function useWebAudioSTT() {
  const [voiceState, setVoiceState] = useState<WebAudioSTTState>({
    isListening: false,
    isProcessing: false,
    isRecording: false,
    transcript: '',
    confidence: 0,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const volumeCheckIntervalRef = useRef<number | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Проверка поддержки
  const [isSupported, setIsSupported] = useState(false);
  const [supportDetails, setSupportDetails] = useState({
    hasMediaRecorder: false,
    hasMediaDevices: false,
    hasGetUserMedia: false,
    hasWebAudio: false,
    userAgent: '',
    protocol: '',
    isSecureContext: false,
  });

  useEffect(() => {
    const checkSupport = () => {
      const details = {
        hasMediaRecorder: !!window.MediaRecorder,
        hasMediaDevices: !!navigator?.mediaDevices,
        hasGetUserMedia: !!(navigator?.mediaDevices?.getUserMedia),
        hasWebAudio: !!(window.AudioContext || (window as any).webkitAudioContext),
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        isSecureContext: window.isSecureContext,
      };

      setSupportDetails(details);

      const fullSupport = details.hasMediaRecorder && 
                         details.hasMediaDevices && 
                         details.hasGetUserMedia &&
                         details.hasWebAudio &&
                         details.isSecureContext;

      setIsSupported(fullSupport);

      console.log('Web Audio STT Support Check:', {
        ...details,
        fullSupport,
      });
    };

    checkSupport();
  }, []);

  // Создание аудио анализатора для визуального отображения
  const createAudioAnalyser = useCallback(async (stream: MediaStream) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Запускаем мониторинг уровня звука
      const checkVolume = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const averageLevel = sum / bufferLength / 255;

        setVoiceState(prev => ({
          ...prev,
          audioLevel: averageLevel,
        }));
      };

      volumeCheckIntervalRef.current = window.setInterval(checkVolume, 100);

    } catch (error) {
      console.error('Error creating audio analyser:', error);
    }
  }, []);

  // Функция транскрипции аудио через API
  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string> => {
    try {
      console.log('Transcribing audio blob:', {
        size: audioBlob.size,
        type: audioBlob.type,
        whisperAvailable: whisperService.isAvailable(),
      });

      // Используем Whisper сервис для транскрипции
      const transcript = await whisperService.transcribeAudio(audioBlob);
      
      return transcript;

    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error('Ошибка транскрипции аудио');
    }
  }, []);

  const startListening = useCallback(async () => {
    console.log('=== Web Audio STT START ===');
    console.log('Support details:', supportDetails);

    if (!isSupported) {
      let errorMessage = 'Запись аудио недоступна:\n';
      
      if (!supportDetails.hasMediaRecorder) {
        errorMessage += '• MediaRecorder API не поддерживается\n';
      }
      if (!supportDetails.hasMediaDevices) {
        errorMessage += '• MediaDevices API недоступен\n';
      }
      if (!supportDetails.hasGetUserMedia) {
        errorMessage += '• getUserMedia недоступен\n';
      }
      if (!supportDetails.hasWebAudio) {
        errorMessage += '• Web Audio API недоступен\n';
      }
      if (!supportDetails.isSecureContext) {
        errorMessage += '• Требуется безопасный контекст (HTTPS)\n';
      }

      errorMessage += '\nРекомендации:\n';
      errorMessage += '• Используйте современный браузер\n';
      errorMessage += '• Обеспечьте HTTPS соединение\n';
      errorMessage += '• Разрешите доступ к микрофону';

      alert(errorMessage);
      return;
    }

    if (voiceState.isListening) {
      console.log('Already listening, stopping...');
      await stopListening();
      return;
    }

    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      mediaStreamRef.current = stream;
      console.log('Microphone access granted');

      // Создаём анализатор для визуального отображения
      await createAudioAnalyser(stream);

      // Настраиваем MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Обработчики событий MediaRecorder
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstart = () => {
        console.log('Recording started');
        setVoiceState(prev => ({
          ...prev,
          isListening: true,
          isRecording: true,
          isProcessing: false,
          transcript: '',
          confidence: 0,
        }));
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped');
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isRecording: false,
          isProcessing: true,
        }));

        try {
          // Создаём blob из записанных данных
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          console.log('Audio blob created:', audioBlob.size, 'bytes');

          if (audioBlob.size === 0) {
            throw new Error('Аудио данные отсутствуют');
          }

          // Отправляем на транскрипцию
          const transcript = await transcribeAudio(audioBlob);
          
          setVoiceState(prev => ({
            ...prev,
            transcript,
            confidence: 0.95, // Для API обычно высокая точность
            isProcessing: false,
          }));

          console.log('Transcription completed:', transcript);

        } catch (error) {
          console.error('Error processing audio:', error);
          
          setVoiceState(prev => ({
            ...prev,
            isProcessing: false,
          }));

          alert(`Ошибка обработки аудио: ${error.message}`);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        
        setVoiceState(prev => ({
          ...prev,
          isListening: false,
          isRecording: false,
          isProcessing: false,
        }));

        alert('Ошибка записи аудио');
        stopListening();
      };

      // Запускаем запись
      console.log('Starting recording...');
      mediaRecorder.start(1000); // Собираем данные каждую секунду

    } catch (error) {
      console.error('Error starting recording:', error);
      
      setVoiceState(prev => ({
        ...prev,
        isListening: false,
        isRecording: false,
        isProcessing: false,
      }));

      let errorMessage = 'Ошибка доступа к микрофону:\n';
      if ((error as any).name === 'NotAllowedError') {
        errorMessage += 'Доступ запрещен. Разрешите доступ к микрофону.';
      } else if ((error as any).name === 'NotFoundError') {
        errorMessage += 'Микрофон не найден.';
      } else if ((error as any).name === 'OverconstrainedError') {
        errorMessage += 'Указанные параметры не поддерживаются.';
      } else {
        errorMessage += (error as any).message || 'Неизвестная ошибка';
      }

      alert(errorMessage);
    }
  }, [isSupported, voiceState.isListening, supportDetails, createAudioAnalyser, transcribeAudio]);

  const stopListening = useCallback(async () => {
    console.log('Stopping Web Audio STT...');

    // Останавливаем запись
    if (mediaRecorderRef.current && voiceState.isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
      }
    }

    // Очищаем интервал проверки громкости
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }

    // Закрываем аудио контекст
    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch (error) {
        console.error('Error closing AudioContext:', error);
      }
      audioContextRef.current = null;
    }

    // Останавливаем медиа поток
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    analyserRef.current = null;
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    setVoiceState(prev => ({
      ...prev,
      isListening: false,
      isRecording: false,
      isProcessing: false,
      audioLevel: 0,
    }));
  }, [voiceState.isRecording]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    voiceState,
    startListening,
    stopListening,
    isSupported,
    supportDetails,
  };
}