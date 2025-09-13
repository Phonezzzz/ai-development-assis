import { useWhisperSTT } from '@/hooks/use-whisper-stt';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function STTDebug() {
  const whisperSTT = useWhisperSTT();
  const voiceRecognition = useVoiceRecognition();

  const testWhisper = async () => {
    console.log('Testing Whisper STT...');
    try {
      await whisperSTT.startRecording();
    } catch (error) {
      console.error('Whisper STT error:', error);
    }
  };

  const testWebSpeech = async () => {
    console.log('Testing Web Speech API...');
    try {
      await voiceRecognition.startListening();
    } catch (error) {
      console.error('Web Speech API error:', error);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="font-semibold">STT Debug Panel</h3>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Whisper STT</h4>
        <p className="text-xs text-muted-foreground">
          Support: {whisperSTT.isSupported ? '✅' : '❌'}<br/>
          Recording: {whisperSTT.state.isRecording ? '✅' : '❌'}<br/>
          Processing: {whisperSTT.state.isProcessing ? '✅' : '❌'}<br/>
          Transcript: "{whisperSTT.state.transcript}"<br/>
          Error: {whisperSTT.state.error || 'None'}
        </p>
        <Button size="sm" onClick={testWhisper}>Test Whisper</Button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Web Speech API</h4>
        <p className="text-xs text-muted-foreground">
          Support: {voiceRecognition.isSupported ? '✅' : '❌'}<br/>
          Listening: {voiceRecognition.voiceState.isListening ? '✅' : '❌'}<br/>
          Processing: {voiceRecognition.voiceState.isProcessing ? '✅' : '❌'}<br/>
          Transcript: "{voiceRecognition.voiceState.transcript}"
        </p>
        <Button size="sm" onClick={testWebSpeech}>Test Web Speech</Button>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium">Environment</h4>
        <p className="text-xs text-muted-foreground">
          OpenRouter API: {import.meta.env.VITE_OPENROUTER_API_KEY ? '✅' : '❌'}<br/>
          OpenAI API: {import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_OPENAI_API_KEY !== 'your-openai-api-key-here' ? '✅' : '❌'}
        </p>
      </div>
    </Card>
  );
}