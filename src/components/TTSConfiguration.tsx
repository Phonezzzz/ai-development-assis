import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useKV } from '@github/spark/hooks';
import { ttsService } from '@/lib/services/tts';
import { Play, X } from '@phosphor-icons/react';
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

export function TTSConfiguration() {
  const [settings, setSettings] = useKV<TTSSettings>('tts-settings', {
    elevenLabsApiKey: '',
    selectedVoiceId: '21m00Tcm4TlvDq8ikWAM',
    enabled: true,
    speed: 1,
    pitch: 1,
    volume: 0.8,
  });

  const [availableVoices, setAvailableVoices] = useState<string[]>([]);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(settings.elevenLabsApiKey);

  useEffect(() => {
    loadAvailableVoices();
  }, [settings.elevenLabsApiKey]);

  const loadAvailableVoices = async () => {
    try {
      const voices = await ttsService.getVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  const handleSaveApiKey = () => {
    setSettings(prev => ({ ...prev, elevenLabsApiKey: apiKeyInput }));
    toast.success('API ключ ElevenLabs сохранен');
    
    // Set environment variable for immediate use
    if (typeof window !== 'undefined') {
      (window as any).VITE_ELEVENLABS_API_KEY = apiKeyInput;
    }
  };

  const handleTestVoice = async () => {
    if (!settings.enabled) {
      toast.error('TTS отключен');
      return;
    }

    setIsTestingVoice(true);
    try {
      await ttsService.speak(
        'Привет! Это тестовое сообщение для проверки синтеза речи.',
        settings.selectedVoiceId
      );
      toast.success('Тест голоса выполнен успешно');
    } catch (error) {
      console.error('Error testing voice:', error);
      toast.error('Ошибка при тестировании голоса');
    } finally {
      setIsTestingVoice(false);
    }
  };

  const isConfigured = ttsService.isAvailable() && settings.elevenLabsApiKey;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Настройки TTS</h3>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <Badge variant="default">ElevenLabs</Badge>
          ) : (
            <Badge variant="outline">Браузерный TTS</Badge>
          )}
        </div>
      </div>

      {/* Enable/Disable TTS */}
      <div className="flex items-center justify-between">
        <Label htmlFor="tts-enabled">Включить TTS</Label>
        <Switch
          id="tts-enabled"
          checked={settings.enabled}
          onCheckedChange={(enabled) => 
            setSettings(prev => ({ ...prev, enabled }))
          }
        />
      </div>

      {settings.enabled && (
        <>
          {/* ElevenLabs API Key */}
          <div className="space-y-2">
            <Label htmlFor="elevenlabs-api-key">API ключ ElevenLabs</Label>
            <div className="flex gap-2">
              <Input
                id="elevenlabs-api-key"
                type="password"
                placeholder="sk-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput || apiKeyInput === settings.elevenLabsApiKey}
              >
                Сохранить
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Получите API ключ на{' '}
              <a
                href="https://elevenlabs.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                elevenlabs.io
              </a>
            </p>
          </div>

          {/* Voice Selection */}
          {isConfigured && availableVoices.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="voice-select">Выбор голоса</Label>
              <div className="flex gap-2">
                <Select
                  value={settings.selectedVoiceId}
                  onValueChange={(voiceId) =>
                    setSettings(prev => ({ ...prev, selectedVoiceId: voiceId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите голос" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voiceId) => (
                      <SelectItem key={voiceId} value={voiceId}>
                        {voiceId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleTestVoice}
                  disabled={isTestingVoice}
                  className="gap-2"
                >
                  <Play size={16} />
                  {isTestingVoice ? 'Тест...' : 'Тест'}
                </Button>
              </div>
            </div>
          )}

          {/* Voice Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tts-speed">Скорость</Label>
              <input
                id="tts-speed"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.speed}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, speed: parseFloat(e.target.value) }))
                }
                className="w-full"
              />
              <div className="text-xs text-center text-muted-foreground">
                {settings.speed}x
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts-pitch">Тон</Label>
              <input
                id="tts-pitch"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={settings.pitch}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, pitch: parseFloat(e.target.value) }))
                }
                className="w-full"
              />
              <div className="text-xs text-center text-muted-foreground">
                {settings.pitch}x
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts-volume">Громкость</Label>
              <input
                id="tts-volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) =>
                  setSettings(prev => ({ ...prev, volume: parseFloat(e.target.value) }))
                }
                className="w-full"
              />
              <div className="text-xs text-center text-muted-foreground">
                {Math.round(settings.volume * 100)}%
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Статус:</span>
              <div className="flex items-center gap-2">
                {isConfigured ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-600">Подключено к ElevenLabs</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="text-orange-600">Браузерный TTS</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}