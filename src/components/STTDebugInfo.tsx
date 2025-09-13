import { useVoiceSTT } from '@/hooks/use-voice-stt';
import { Card } from '@/components/ui/card';

export function STTDebugInfo() {
  const { voiceState, isSupported } = useVoiceSTT();

  const hasWindow = typeof window !== 'undefined';
  const hasSpeechRecognition = hasWindow && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  const hasMediaDevices = hasWindow && navigator?.mediaDevices;
  const hasGetUserMedia = hasMediaDevices && navigator.mediaDevices.getUserMedia;

  return (
    <Card className="p-4 text-sm space-y-2 bg-card/80 border-border">
      <div className="font-semibold">STT Диагностика:</div>
      <div className="space-y-1">
        <div>Поддержка: {isSupported ? '✅' : '❌'}</div>
        <div>Web Speech API: {hasSpeechRecognition ? '✅' : '❌'}</div>
        <div>MediaDevices: {hasMediaDevices ? '✅' : '❌'}</div>
        <div>getUserMedia: {hasGetUserMedia ? '✅' : '❌'}</div>
        <div>Состояние: {voiceState.isListening ? 'Слушает' : voiceState.isProcessing ? 'Обработка' : 'Ожидание'}</div>
        <div>Кнопка: {voiceState.isListening ? 'Активна' : 'Готова'}</div>
        <div>Транскрипт: "{voiceState.transcript}"</div>
        {hasWindow && (
          <div className="text-xs opacity-70">
            Браузер: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Edge') ? 'Edge' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Другой'}
          </div>
        )}
      </div>
    </Card>
  );
}