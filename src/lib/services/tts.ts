export interface Voice {
  id: string;
  name: string;
  language?: string;
  gender?: string;
  accent?: string;
  description?: string;
}

export interface TTSService {
  speak(text: string, voiceId?: string): Promise<void>;
  stop(): void;
  isPlaying(): boolean;
  isAvailable(): boolean;
  getVoices(): Promise<Voice[]>;
}

class ElevenLabsTTSService implements TTSService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private audioContext: AudioContext | null = null;
  private currentAudio: AudioBufferSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isCurrentlyPlaying = false;

  constructor() {
    // Получаем API ключ из настроек, затем из переменных окружения
    const storedApiKey = localStorage.getItem('elevenlabs-api-key');
    this.apiKey = storedApiKey || import.meta.env.VITE_ELEVENLABS_API_KEY || '';
    
    // Обновляем ключ при изменении настроек
    window.addEventListener('storage', (e) => {
      if (e.key === 'elevenlabs-api-key') {
        this.apiKey = e.newValue || import.meta.env.VITE_ELEVENLABS_API_KEY || '';
      }
    });
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  async getVoices(): Promise<Voice[]> {
    if (!this.isAvailable()) {
      return this.getMockVoices();
    }

    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voices');
      }

      const data = await response.json();
      return data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        language: voice.labels?.language || 'Unknown',
        gender: voice.labels?.gender || 'Unknown',
        accent: voice.labels?.accent || '',
        description: voice.labels?.description || '',
      }));
    } catch (error) {
      console.error('Error fetching voices:', error);
      return this.getMockVoices();
    }
  }

  private getMockVoices(): Voice[] {
    return [
      {
        id: 'EXAVITQu4vr4xnSDxMaL',
        name: 'Bella (Русская)',
        language: 'Russian',
        gender: 'Female',
        accent: 'Russian',
        description: 'Молодой женский голос с русским акцентом',
      },
      {
        id: 'ErXwobaYiN019PkySvjV',
        name: 'Antoni (Английский)',
        language: 'English',
        gender: 'Male',
        accent: 'American',
        description: 'Мужской голос с американским акцентом',
      },
      {
        id: 'VR6AewLTigWG4xSOukaG',
        name: 'Arnold (Английский)',
        language: 'English',
        gender: 'Male',
        accent: 'American',
        description: 'Глубокий мужской голос',
      },
      {
        id: 'pNInz6obpgDQGcFmaJgB',
        name: 'Adam (Английский)',
        language: 'English',
        gender: 'Male',
        accent: 'American',
        description: 'Спокойный мужской голос',
      },
    ];
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Stop any currently playing audio
    this.stop();
    this.isCurrentlyPlaying = true;

    // Получаем выбранный голос из настроек или используем дефолтный
    const selectedVoice = voiceId || localStorage.getItem('selected-voice') || 'EXAVITQu4vr4xnSDxMaL';

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${selectedVoice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.statusText}`);
      }

      const audioData = await response.arrayBuffer();
      await this.playAudio(audioData);
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback to browser TTS
      await this.fallbackToWebSpeech(text);
    } finally {
      this.isCurrentlyPlaying = false;
    }
  }

  private async playAudio(audioData: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      
      this.currentAudio = source;
      
      return new Promise((resolve, reject) => {
        source.onended = () => {
          this.currentAudio = null;
          this.isCurrentlyPlaying = false;
          resolve();
        };
        // AudioBufferSourceNode doesn't have onerror, handle errors differently
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }
        source.start(0);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      this.isCurrentlyPlaying = false;
      throw error;
    }
  }

  private async fallbackToWebSpeech(text: string): Promise<void> {
    if ('speechSynthesis' in window) {
      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        
        this.currentUtterance = utterance;
        
        utterance.onend = () => {
          this.currentUtterance = null;
          this.isCurrentlyPlaying = false;
          resolve();
        };
        utterance.onerror = (error) => {
          this.currentUtterance = null;
          this.isCurrentlyPlaying = false;
          reject(error);
        };
        
        window.speechSynthesis.speak(utterance);
      });
    }
    throw new Error('No TTS available');
  }

  stop(): void {
    this.isCurrentlyPlaying = false;
    
    // Stop ElevenLabs audio
    if (this.currentAudio) {
      try {
        this.currentAudio.stop();
      } catch (error) {
        console.warn('Error stopping audio source:', error);
      }
      this.currentAudio = null;
    }
    
    // Stop browser TTS
    if (this.currentUtterance) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }
}

class WebSpeechTTSService implements TTSService {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isCurrentlyPlaying = false;

  async speak(text: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Web Speech API not available');
    }

    this.stop(); // Stop any current speech
    this.isCurrentlyPlaying = true;

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      this.currentUtterance = utterance;
      
      utterance.onend = () => {
        this.currentUtterance = null;
        this.isCurrentlyPlaying = false;
        resolve();
      };
      utterance.onerror = (error) => {
        this.currentUtterance = null;
        this.isCurrentlyPlaying = false;
        reject(error);
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    this.isCurrentlyPlaying = false;
    if (this.currentUtterance) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }

  async getVoices(): Promise<Voice[]> {
    if (!this.isAvailable()) return [];
    
    // Wait for voices to load
    return new Promise((resolve) => {
      let voices = window.speechSynthesis.getVoices();
      
      if (voices.length > 0) {
        resolve(this.formatVoices(voices));
      } else {
        window.speechSynthesis.onvoiceschanged = () => {
          voices = window.speechSynthesis.getVoices();
          resolve(this.formatVoices(voices));
        };
      }
    });
  }

  private formatVoices(voices: SpeechSynthesisVoice[]): Voice[] {
    return voices
      .filter(voice => voice.lang.startsWith('ru') || voice.lang.startsWith('en'))
      .map(voice => ({
        id: voice.voiceURI,
        name: voice.name,
        language: voice.lang,
        gender: voice.name.toLowerCase().includes('female') || voice.name.toLowerCase().includes('женский') ? 'Female' : 'Male',
        accent: voice.lang.includes('RU') ? 'Russian' : 'English',
        description: `${voice.name} (${voice.lang})`,
      }));
  }
}

// Export a factory function that chooses the best available service
export function createTTSService(): TTSService {
  const elevenLabs = new ElevenLabsTTSService();
  if (elevenLabs.isAvailable()) {
    return elevenLabs;
  }
  return new WebSpeechTTSService();
}

export const ttsService = createTTSService();