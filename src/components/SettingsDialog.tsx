import { useState } from 'react';
import { useKV } from '@github/spark/hooks';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gear, Play, Stop } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useTTS, ELEVENLABS_VOICES } from '@/hooks/use-tts';

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useKV<string>('selected-voice', '21masSU9f4isSNm7Egqd');
  const [systemPrompt, setSystemPrompt] = useKV<string>('system-prompt', 
    'Вы - умный помощник, который отвечает на русском языке. Будьте полезными, точными и дружелюбными.'
  );
  
  const { speak, stop, ttsState, isAvailable, setSelectedVoice: setTTSVoice } = useTTS();

  const handleSaveSettings = () => {
    // Синхронизация голоса с TTS хуком
    if (selectedVoice) {
      setTTSVoice(selectedVoice);
    }
    toast.success('Настройки сохранены!');
    setIsOpen(false);
  };

  const testVoice = async () => {
    if (!selectedVoice) {
      toast.error('Сначала выберите голос');
      return;
    }

    if (ttsState.isPlaying) {
      stop();
      return;
    }

    try {
      await speak('Привет! Это тестирование выбранного голоса ElevenLabs. Голос звучит хорошо для русского языка.');
      toast.success('Воспроизведение тестовой фразы...');
    } catch (error) {
      console.error('TTS test error:', error);
      toast.error('Ошибка при тестировании голоса');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-border hover:border-accent">
          <Gear size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Настройки</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Настройте голосовые возможности и системный промпт
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Выбор голоса */}
          <div className="space-y-2">
            <Label htmlFor="voice-select" className="text-foreground">
              Голос ElevenLabs для озвучивания
            </Label>
            <div className="flex gap-2">
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="bg-background border-border text-foreground flex-1">
                  <SelectValue placeholder="Выберите голос..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {ELEVENLABS_VOICES.map((voice) => (
                    <SelectItem 
                      key={voice.id} 
                      value={voice.id}
                      className="text-foreground hover:bg-accent/20"
                    >
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={testVoice}
                disabled={!selectedVoice || !isAvailable()}
                className="border-border hover:border-accent text-foreground px-3"
              >
                {ttsState.isPlaying ? (
                  <Stop size={16} />
                ) : (
                  <Play size={16} />
                )}
              </Button>
            </div>
            {!isAvailable() && (
              <p className="text-xs text-yellow-400">
                ElevenLabs API ключ не настроен. Добавьте VITE_ELEVENLABS_API_KEY в переменные окружения.
              </p>
            )}
            {ttsState.isLoading && (
              <p className="text-xs text-blue-400">
                Генерация аудио...
              </p>
            )}
            {ttsState.error && (
              <p className="text-xs text-red-400">
                Ошибка: {ttsState.error}
              </p>
            )}
          </div>

          {/* Системный промпт */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt" className="text-foreground">
              Системный промпт
            </Label>
            <Textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Введите системный промпт для ИИ..."
              className="min-h-[120px] bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Этот промпт будет использоваться как системная инструкция для всех взаимодействий с ИИ
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="border-border hover:border-accent text-foreground"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSaveSettings}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}