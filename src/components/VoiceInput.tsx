import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ModelSelector } from '@/components/ModelSelector';
import { TTSConfiguration } from '@/components/TTSConfiguration';
import { cn } from '@/lib/utils';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { useModelSelection } from '@/hooks/use-model-selection';
import { WorkMode } from '@/lib/types';
import { Microphone, MicrophoneSlash, Brain, Lightning, SpeakerHigh } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

interface VoiceInputProps {
  onSubmit: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  currentMode?: WorkMode;
}

export function VoiceInput({ 
  onSubmit, 
  placeholder = "Введите ваше сообщение...", 
  disabled,
  currentMode = 'plan'
}: VoiceInputProps) {
  const [inputText, setInputText] = useState('');
  const [workMode, setWorkMode] = useState<WorkMode>(currentMode);
  const [showTTSConfig, setShowTTSConfig] = useState(false);
  const { voiceState, startListening, stopListening, isSupported } = useVoiceRecognition();
  const { currentModel, isConfigured } = useModelSelection();

  useEffect(() => {
    if (voiceState.transcript && !voiceState.isProcessing && !voiceState.isListening) {
      console.log('VoiceInput: Устанавливаем транскрипт в поле ввода:', voiceState.transcript);
      setInputText(voiceState.transcript);
    }
  }, [voiceState.transcript, voiceState.isProcessing, voiceState.isListening]);

  const handleSubmit = (e: React.FormEvent, mode?: WorkMode) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmit(inputText.trim(), mode || workMode, voiceState.transcript === inputText);
      setInputText('');
    }
  };

  const handlePlanClick = () => {
    if (inputText.trim()) {
      onSubmit(inputText.trim(), 'plan', voiceState.transcript === inputText);
      setInputText('');
    }
  };

  const handleActClick = () => {
    if (inputText.trim()) {
      onSubmit(inputText.trim(), 'act', voiceState.transcript === inputText);
      setInputText('');
    }
  };

  const toggleVoice = () => {
    if (voiceState.isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="space-y-3">
      {/* Model Selection */}
      <div className="flex items-center gap-2">
        <ModelSelector />
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTTSConfig(!showTTSConfig)}
          className="gap-2"
        >
          <SpeakerHigh size={16} />
          TTS
        </Button>
        
        {!isConfigured && (
          <Badge variant="destructive" className="text-xs">
            Демо режим
          </Badge>
        )}
      </div>

      {/* TTS Configuration */}
      {showTTSConfig && (
        <TTSConfiguration />
      )}

      {/* Main Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={voiceState.isListening ? "Слушаю..." : placeholder}
            disabled={disabled || voiceState.isListening}
            className={cn(
              "pr-12 transition-all",
              voiceState.isListening && "border-accent bg-accent/5"
            )}
          />
          {isSupported && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleVoice}
              disabled={disabled}
              className={cn(
                "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0",
                voiceState.isListening && "text-accent"
              )}
            >
              {voiceState.isListening ? (
                <MicrophoneSlash size={16} />
              ) : (
                <Microphone size={16} />
              )}
            </Button>
          )}
        </div>
      </form>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={handlePlanClick}
          disabled={disabled || !inputText.trim()}
          variant="outline"
          className="flex-1 gap-2"
        >
          <Brain size={16} />
          Планировать
        </Button>
        
        <Button 
          onClick={handleActClick}
          disabled={disabled || !inputText.trim()}
          className="flex-1 gap-2"
        >
          <Lightning size={16} />
          Выполнить
        </Button>
      </div>

      {voiceState.isListening && (
        <div className="flex items-center justify-center gap-2 p-2 bg-accent/10 rounded-lg">
          <div className="voice-waveform">
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
          </div>
          <span className="text-sm text-muted-foreground">Слушаю...</span>
        </div>
      )}

      {voiceState.transcript && voiceState.isProcessing && (
        <div className="p-2 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Обработка: "{voiceState.transcript}"</p>
        </div>
      )}
    </div>
  );
}