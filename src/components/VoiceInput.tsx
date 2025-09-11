import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { Microphone, MicrophoneSlash, PaperPlaneTilt } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';

interface VoiceInputProps {
  onSubmit: (text: string, isVoice?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function VoiceInput({ onSubmit, placeholder = "Type your message...", disabled }: VoiceInputProps) {
  const [inputText, setInputText] = useState('');
  const { voiceState, startListening, stopListening, isSupported } = useVoiceRecognition();

  useEffect(() => {
    if (voiceState.transcript && !voiceState.isProcessing && !voiceState.isListening) {
      setInputText(voiceState.transcript);
    }
  }, [voiceState.transcript, voiceState.isProcessing, voiceState.isListening]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      onSubmit(inputText.trim(), voiceState.transcript === inputText);
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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={voiceState.isListening ? "Listening..." : placeholder}
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
        <Button 
          type="submit" 
          disabled={disabled || !inputText.trim()}
          className="px-4"
        >
          <PaperPlaneTilt size={16} />
        </Button>
      </form>

      {voiceState.isListening && (
        <div className="flex items-center justify-center gap-2 p-2 bg-accent/10 rounded-lg">
          <div className="voice-waveform">
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
            <div className="voice-bar"></div>
          </div>
          <span className="text-sm text-muted-foreground">Listening...</span>
        </div>
      )}

      {voiceState.transcript && voiceState.isProcessing && (
        <div className="p-2 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Processing: "{voiceState.transcript}"</p>
        </div>
      )}
    </div>
  );
}