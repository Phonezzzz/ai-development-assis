export interface TTSService {
  speak(text: string, voiceId?: string): Promise<void>;
  isAvailable(): boolean;
  getVoices(): Promise<string[]>;
}

class ElevenLabsTTSService implements TTSService {
  private apiKey: string;
  private baseUrl = 'https://api.elevenlabs.io/v1';
  private audioContext: AudioContext | null = null;
  private currentAudio: AudioBufferSourceNode | null = null;

  constructor() {
    this.apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async getVoices(): Promise<string[]> {
    if (!this.isAvailable()) return [];

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
      return data.voices.map((voice: any) => voice.voice_id);
    } catch (error) {
      console.error('Error fetching voices:', error);
      return [];
    }
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('ElevenLabs API key not configured');
    }

    // Stop any currently playing audio
    this.stop();

    const defaultVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    const selectedVoiceId = voiceId || defaultVoiceId;

    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${selectedVoiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
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
          resolve();
        };
        source.onerror = reject;
        source.start(0);
      });
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  private async fallbackToWebSpeech(text: string): Promise<void> {
    if ('speechSynthesis' in window) {
      return new Promise((resolve, reject) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ru-RU';
        utterance.onend = () => resolve();
        utterance.onerror = reject;
        window.speechSynthesis.speak(utterance);
      });
    }
    throw new Error('No TTS available');
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.stop();
      this.currentAudio = null;
    }
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

class WebSpeechTTSService implements TTSService {
  async speak(text: string): Promise<void> {
    if (!this.isAvailable()) {
      throw new Error('Web Speech API not available');
    }

    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.onend = () => resolve();
      utterance.onerror = reject;
      window.speechSynthesis.speak(utterance);
    });
  }

  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }

  async getVoices(): Promise<string[]> {
    if (!this.isAvailable()) return [];
    const voices = window.speechSynthesis.getVoices();
    return voices
      .filter(voice => voice.lang.startsWith('ru'))
      .map(voice => voice.name);
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