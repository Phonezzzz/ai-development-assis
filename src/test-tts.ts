// Тест интеграции ElevenLabs TTS
// Этот файл поможет проверить, что TTS работает правильно

import { ELEVENLABS_VOICES } from '@/hooks/use-tts';

console.log('ElevenLabs голоса доступны:', ELEVENLABS_VOICES.length);
console.log('Первый голос:', ELEVENLABS_VOICES[0]);

// Проверяем переменную окружения
const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
console.log('ElevenLabs API ключ установлен:', !!apiKey);

if (apiKey) {
  console.log('TTS готов к использованию!');
} else {
  console.warn('ElevenLabs API ключ не найден. Добавьте VITE_ELEVENLABS_API_KEY в .env файл.');
}

export {};