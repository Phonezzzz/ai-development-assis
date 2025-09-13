import { useState, useEffect } from 'react';
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
import { Gear } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}

export function SettingsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVoice, setSelectedVoice] = useKV<string>('selected-voice', '');
  const [systemPrompt, setSystemPrompt] = useKV<string>('system-prompt', 
    'Вы - умный помощник, который отвечает на русском языке. Будьте полезными, точными и дружелюбными.'
  );
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);

  // Получаем доступные русские голоса
  const getRussianVoices = (): VoiceOption[] => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return [];
    
    const voices = window.speechSynthesis.getVoices();
    return voices
      .filter(voice => voice.lang.startsWith('ru'))
      .map(voice => ({
        name: voice.name,
        lang: voice.lang,
        voiceURI: voice.voiceURI
      }));
  };

  // Загружаем голоса при открытии диалога и обновляем их
  useEffect(() => {
    const updateVoices = () => {
      const voices = getRussianVoices();
      setAvailableVoices(voices);
    };

    // Обновляем голоса сразу
    updateVoices();

    // Слушаем событие загрузки голосов
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, [isOpen]);

  const handleSaveSettings = () => {
    toast.success('Настройки сохранены!');
    setIsOpen(false);
  };

  const testVoice = () => {
    if (!selectedVoice) {
      toast.error('Сначала выберите голос');
      return;
    }

    const utterance = new SpeechSynthesisUtterance('Привет! Это тестирование выбранного голоса.');
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.voiceURI === selectedVoice);
    
    if (voice) {
      utterance.voice = voice;
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
      toast.success('Воспроизведение тестовой фразы...');
    } else {
      toast.error('Выбранный голос не найден');
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
              Голос для озвучивания
            </Label>
            <div className="flex gap-2">
              <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                <SelectTrigger className="bg-background border-border text-foreground flex-1">
                  <SelectValue placeholder="Выберите голос..." />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {availableVoices.length > 0 ? (
                    availableVoices.map((voice) => (
                      <SelectItem 
                        key={voice.voiceURI} 
                        value={voice.voiceURI}
                        className="text-foreground hover:bg-accent/20"
                      >
                        {voice.name} ({voice.lang})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="default" className="text-muted-foreground">
                      Русские голоса не найдены
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={testVoice}
                disabled={!selectedVoice}
                className="border-border hover:border-accent text-foreground px-3"
              >
                Тест
              </Button>
            </div>
            {availableVoices.length === 0 && (
              <p className="text-xs text-yellow-400">
                Голоса загружаются... Если проблема не решается, перезагрузите страницу.
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