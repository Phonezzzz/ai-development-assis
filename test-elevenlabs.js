// Простой тест для проверки ElevenLabs API
const testElevenLabs = async () => {
  const apiKey = 'sk_298884ecbf7f5cbc3c852e9da181b479693091ef782b42e4';
  const voiceId = 'JBFqnCBsd6RMkjVDRZzb'; // George voice
  
  try {
    console.log('Testing ElevenLabs API...');
    console.log('Voice ID:', voiceId);
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: 'Привет! Это тестирование голоса.',
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.8,
          style: 0.0,
          use_speaker_boost: true
        }
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }

    const blob = await response.blob();
    console.log('Audio blob size:', blob.size, 'bytes');
    
    if (blob.size > 0) {
      console.log('✅ ElevenLabs API works correctly!');
    } else {
      console.log('❌ Empty audio received');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

// Проверка доступных голосов
const listVoices = async () => {
  const apiKey = 'sk_298884ecbf7f5cbc3c852e9da181b479693091ef782b42e4';
  
  try {
    console.log('\nFetching available voices...');
    
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching voices:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Available voices:', data.voices.map(v => `${v.name} (${v.voice_id})`));
    
  } catch (error) {
    console.error('Error listing voices:', error.message);
  }
};

// Если запускается в браузере
if (typeof window !== 'undefined') {
  window.testElevenLabs = testElevenLabs;
  window.listVoices = listVoices;
}

// Если запускается в Node.js
if (typeof module !== 'undefined') {
  module.exports = { testElevenLabs, listVoices };
}