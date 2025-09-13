import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Play, Stop, SpeakerHigh } from '@phosphor-icons/react';
import { useTTS } from '@/hooks/use-tts';
import { toast } from 'sonner';

interface TTSControlsProps {
  text: string;
  className?: string;
}

export const TTSControls = memo(({ text, className = '' }: TTSControlsProps) => {
  const { ttsState, speak, stop, isAvailable } = useTTS();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Скопировано в буфер обмена');
    } catch (error) {
      console.error('Failed to copy text:', error);
      toast.error('Ошибка копирования');
    }
  };

  const handlePlay = () => {
    if (ttsState.isPlaying) {
      stop();
    } else {
      speak(text);
    }
  };

  const isCurrentlyPlayingThis = ttsState.isPlaying && ttsState.currentText === text;
  const canPlay = isAvailable() && text.trim().length > 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Copy Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        title="Копировать"
      >
        <Copy size={16} />
      </Button>

      {/* TTS Play/Stop Button */}
      {canPlay && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePlay}
          disabled={ttsState.isLoading}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
          title={isCurrentlyPlayingThis ? "Остановить" : "Воспроизвести"}
        >
          {ttsState.isLoading ? (
            <SpeakerHigh size={16} className="animate-pulse" />
          ) : isCurrentlyPlayingThis ? (
            <Stop size={16} />
          ) : (
            <Play size={16} />
          )}
        </Button>
      )}

      {/* TTS Error */}
      {ttsState.error && (
        <span className="text-xs text-destructive">
          {ttsState.error}
        </span>
      )}
    </div>
  );
});

TTSControls.displayName = 'TTSControls';