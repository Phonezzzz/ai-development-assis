import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { useModelSelection } from '@/hooks/use-model-selection';
import { WorkMode } from '@/lib/types';
import { Microphone, MicrophoneSlash, PaperPlaneTilt, Brain, Lightning, List } from '@phosphor-icons/react';
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
  const { voiceState, startListening, stopListening, isSupported } = useVoiceRecognition();
  const { availableModels, currentModel, selectModel, isSelecting, setIsSelecting } = useModelSelection();

  useEffect(() => {
    if (voiceState.transcript && !voiceState.isProcessing && !voiceState.isListening) {
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
        <Select 
          value={currentModel.id} 
          onValueChange={selectModel}
          open={isSelecting}
          onOpenChange={setIsSelecting}
        >
          <SelectTrigger className="w-48">
            <div className="flex items-center gap-2">
              <List size={16} />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableModels.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex flex-col items-start">
                  <div className="font-medium">{model.name}</div>
                  <div className="text-xs text-muted-foreground">{model.provider}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Badge variant="outline" className="text-xs">
          {currentModel.provider}
        </Badge>
      </div>

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