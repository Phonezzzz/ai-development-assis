import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useKV } from '@github/spark/hooks';
import { ttsService, Voice } from '@/lib/services/tts';
import { Play } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface TTSSettings {
  elevenLabsApiKey: string;
  selectedVoiceId: string;
  enabled: boolean;
  speed: number;
  pitch: number;
  volume: number;
}

const defaultSettings: TTSSettings = {
  elevenLabsApiKey: '',
  selectedVoiceId: '21m00Tcm4TlvDq8ikWAM',
  enabled: true,
  speed: 1,
  pitch: 1,
  volume: 0.8,
};

export function TTSConfiguration() {
  const [settings, setSettings] = useKV<TTSSettings>('tts-settings', defaultSettings);
  const [availableVoices, setAvailableVoices] = useState<Voice[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');

  const currentSettings = settings || defaultSettings;

  useEffect(() => {
    setApiKeyInput(currentSettings.elevenLabsApiKey);
  }, [currentSettings.elevenLabsApiKey]);

  useEffect(() => {
    if (currentSettings.elevenLabsApiKey) {
      loadAvailableVoices();
    }
  }, [currentSettings.elevenLabsApiKey]);

  const loadAvailableVoices = async () => {
    try {
      const voices = await ttsService.getVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Error loading voices:', error);
      toast.error('Ошибка загрузки голосов');
    }
  };

  const handleSaveApiKey = () => {
    setSettings({
      ...currentSettings,
      elevenLabsApiKey: apiKeyInput,
    });
    toast.success('API ключ сохранён');
  };

  const handleTestVoice = async () => {
    setIsTestingVoice(true);
    try {
      await ttsService.speak('Тестирование голоса ElevenLabs', currentSettings.selectedVoiceId);
      toast.success('Тест голоса завершён');
    } catch (error) {
      console.error('Voice test error:', error);
      toast.error('Ошибка тестирования голоса');
    } finally {
      setIsTestingVoice(false);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    setSettings({
      ...currentSettings,
      enabled,
    });
  };

  const handleVoiceChange = (voiceId: string) => {
    setSettings({
      ...currentSettings,
      selectedVoiceId: voiceId,
    });
  };

  const handleSpeedChange = (speed: number) => {
    setSettings({
      ...currentSettings,
      speed,
    });
  };

  const handlePitchChange = (pitch: number) => {
    setSettings({
      ...currentSettings,
      pitch,
    });
  };

  const handleVolumeChange = (volume: number) => {
    setSettings({
      ...currentSettings,
      volume,
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Настройки TTS</h3>
          <p className="text-sm text-muted-foreground">
            Конфигурация синтеза речи для голосовых ответов
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="tts-enabled">Включить TTS</Label>
            <Switch
              id="tts-enabled"
              checked={currentSettings.enabled}
              onCheckedChange={handleToggleEnabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">ElevenLabs API Key</Label>
            <div className="flex gap-2">
              <Input
                id="api-key"
                type="password"
                placeholder="Введите API ключ ElevenLabs"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <Button onClick={handleSaveApiKey} variant="outline">
                Сохранить
              </Button>
            </div>
          </div>

          {availableVoices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="voice-select">Голос</Label>
              <div className="flex gap-2">
                <Select
                  value={currentSettings.selectedVoiceId}
                  onValueChange={handleVoiceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите голос" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleTestVoice} 
                  variant="outline" 
                  size="icon"
                  disabled={isTestingVoice}
                >
                  <Play size={16} />
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="speed">Скорость: {currentSettings.speed}</Label>
              <input
                id="speed"
                type="range"
                min="0.25"
                max="2"
                step="0.1"
                value={currentSettings.speed}
                onChange={(e) => handleSpeedChange(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pitch">Тон: {currentSettings.pitch}</Label>
              <input
                id="pitch"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={currentSettings.pitch}
                onChange={(e) => handlePitchChange(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="volume">Громкость: {Math.round(currentSettings.volume * 100)}%</Label>
              <input
                id="volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={currentSettings.volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}