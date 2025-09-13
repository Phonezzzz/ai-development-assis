import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Stop, Copy, SpeakerHigh } from '@phosphor-icons/react';
import { useTTS } from '@/hooks/use-tts';
import { toast } from 'sonner';

interface MessageActionsProps {
  message: string;
  messageId: string;
  className?: string;
}

export function MessageActions({ message, messageId, className = '' }: MessageActionsProps) {
  const { ttsState, speak, stop } = useTTS();
  const [isCurrentlyPlaying, setIsCurrentlyPlaying] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      toast.success('Сообщение скопировано');
    } catch (error) {
      console.error('Failed to copy message:', error);
      toast.error('Ошибка при копировании');
    }
  };

  const handleTTS = async () => {
    if (ttsState.isPlaying && ttsState.currentText && isCurrentlyPlaying) {
      stop();
      setIsCurrentlyPlaying(false);
    } else {
      try {
        setIsCurrentlyPlaying(true);
        await speak(message);
        
        // Reset playing state when TTS finishes
        setTimeout(() => {
          if (!ttsState.isPlaying) {
            setIsCurrentlyPlaying(false);
          }
        }, 1000);
      } catch (error) {
        console.error('TTS error:', error);
        setIsCurrentlyPlaying(false);
        toast.error('Ошибка воспроизведения речи');
      }
    }
  };

  const isPlayingThis = ttsState.isPlaying && isCurrentlyPlaying;
  const isLoading = ttsState.isLoading && isCurrentlyPlaying;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              <Copy size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Копировать</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTTS}
              disabled={isLoading}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            >
              {isLoading ? (
                <SpeakerHigh size={14} className="animate-pulse" />
              ) : isPlayingThis ? (
                <Stop size={14} />
              ) : (
                <Play size={14} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {isLoading 
                ? 'Загрузка...' 
                : isPlayingThis 
                  ? 'Остановить воспроизведение' 
                  : 'Воспроизвести голосом'
              }
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {ttsState.error && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-destructive">⚠</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{ttsState.error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}