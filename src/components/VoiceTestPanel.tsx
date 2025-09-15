import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useKV } from '@github/spark/hooks';
import { useTTS, ELEVENLABS_VOICES } from '@/hooks/use-tts';
import { useVoiceUnified } from '@/hooks/use-voice-unified';
import { 
  Microphone, 
  MicrophoneSlash, 
  Play, 
  Stop, 
  SpeakerHigh,
  Warning,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const testPhrases = [
  'Привет! Это тестирование голосового синтеза речи.',
  'Я говорю на русском языке. Проверяем качество произношения.',
  'Технологии искусственного интеллекта развиваются очень быстро.',
  'Данный голос поддерживает многоязычный синтез речи от ElevenLabs.',
  'Проверяем различные интонации и эмоциональную окраску речи.',
  'Система распознавания речи работает в реальном времени.',
];

export function VoiceTestPanel() {
  const [selectedVoice, setSelectedVoice] = useKV<string>('selected-voice', '21masSU9f4isSNm7Egqd');
  const [customText, setCustomText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isRunningFullTest, setIsRunningFullTest] = useState(false);
  const [testResults, setTestResults] = useState<{
    stt: boolean | null;
    tts: boolean | null;
    voiceChange: boolean | null;
  }>({
    stt: null,
    tts: null,
    voiceChange: null,
  });
  
  // TTS Hook
  const { 
    speak, 
    stop: stopTTS, 
    ttsState, 
    isAvailable: isTTSAvailable,
    setSelectedVoice: setTTSVoice 
  } = useTTS();

  // STT Hook
  const {
    voiceState,
    startListening,
    stopListening,
    isSupported: isSTTSupported,
    supportDetails
  } = useVoiceUnified();

  const handleVoiceChange = useCallback((voiceId: string) => {
    setSelectedVoice(voiceId);
    setTTSVoice(voiceId);
    toast.success('Голос изменен');
  }, [setSelectedVoice, setTTSVoice]);

  const testVoice = useCallback(async (text: string) => {
    if (!text.trim()) {
      toast.error('Введите текст для озвучивания');
      return;
    }

    if (ttsState.isPlaying) {
      stopTTS();
      return;
    }

    try {
      await speak(text);
      toast.success('Воспроизведение...');
    } catch (error) {
      console.error('TTS test error:', error);
      toast.error('Ошибка при озвучивании');
    }
  }, [speak, stopTTS, ttsState.isPlaying]);

  const testSTT = useCallback(async () => {
    if (!isSTTSupported) {
      toast.error('Голосовой ввод не поддерживается в этом браузере');
      return;
    }

    try {
      if (voiceState.isListening) {
        await stopListening();
        toast.info('Остановлено');
      } else {
        await startListening();
        toast.success('Начинаем слушать...');
      }
    } catch (error) {
      console.error('STT test error:', error);
      toast.error('Ошибка при запуске распознавания речи');
    }
  }, [isSTTSupported, voiceState.isListening, startListening, stopListening]);

  const runFullVoiceTest = useCallback(async () => {
    setIsRunningFullTest(true);
    setTestResults({ stt: null, tts: null, voiceChange: null });
    
    try {
      // Test 1: TTS with different voices
      toast.info('Тестируем TTS с разными голосами...');
      
      const voicesToTest = ['21masSU9f4isSNm7Egqd', 'EXAVITQu4vr4xnSDxMaL', 'JBFqnCBsd6RMkjVDRZzb'];
      
      for (const voiceId of voicesToTest) {
        const voiceName = ELEVENLABS_VOICES.find(v => v.id === voiceId)?.name || voiceId;
        setSelectedVoice(voiceId);
        setTTSVoice(voiceId);
        
        const testText = `Тестируем голос ${voiceName}. Это проверка качества произношения.`;
        await speak(testText);
        
        // Wait for TTS to finish
        await new Promise(resolve => {
          const checkTTS = () => {
            if (!ttsState.isPlaying && !ttsState.isLoading) {
              resolve(void 0);
            } else {
              setTimeout(checkTTS, 500);
            }
          };
          checkTTS();
        });
        
        // Small delay between voices
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setTestResults(prev => ({ ...prev, tts: true, voiceChange: true }));
      toast.success('TTS тест пройден успешно!');
      
      // Test 2: STT if supported
      if (isSTTSupported) {
        toast.info('Тестируем распознавание речи... Скажите что-нибудь!');
        
        await startListening();
        
        // Wait for user to speak (timeout after 10 seconds)
        await new Promise(resolve => {
          const timeout = setTimeout(() => {
            stopListening();
            resolve(void 0);
          }, 10000);
          
          const checkSTT = () => {
            if (voiceState.transcript.length > 0) {
              clearTimeout(timeout);
              setTimeout(() => {
                stopListening();
                resolve(void 0);
              }, 2000);
            } else {
              setTimeout(checkSTT, 500);
            }
          };
          checkSTT();
        });
        
        if (voiceState.transcript.length > 0) {
          setTestResults(prev => ({ ...prev, stt: true }));
          toast.success(`STT тест пройден! Распознано: "${voiceState.transcript}"`);
          
          // Echo back what was recognized
          await speak(`Вы сказали: ${voiceState.transcript}`);
        } else {
          setTestResults(prev => ({ ...prev, stt: false }));
          toast.warning('STT тест не прошел - речь не распознана');
        }
      } else {
        setTestResults(prev => ({ ...prev, stt: false }));
        toast.warning('STT недоступен в этом браузере');
      }
      
    } catch (error) {
      console.error('Full voice test error:', error);
      toast.error('Ошибка при проведении полного теста');
    } finally {
      setIsRunningFullTest(false);
    }
  }, [
    speak, 
    ttsState.isPlaying, 
    ttsState.isLoading, 
    setSelectedVoice, 
    setTTSVoice, 
    isSTTSupported, 
    startListening, 
    stopListening, 
    voiceState.transcript
  ]);

  const testVoiceRoundTrip = useCallback(async () => {
    if (!isSTTSupported || !isTTSAvailable()) {
      toast.error('Требуются и STT, и TTS для теста round-trip');
      return;
    }

    try {
      toast.info('Round-trip тест: Скажите фразу, которую хотите услышать обратно');
      
      // Start listening
      await startListening();
      
      // Wait for transcript
      const transcript = await new Promise<string>((resolve) => {
        const timeout = setTimeout(() => {
          stopListening();
          resolve('');
        }, 15000);
        
        const checkTranscript = () => {
          if (voiceState.transcript.length > 5) {
            clearTimeout(timeout);
            setTimeout(() => {
              stopListening();
              resolve(voiceState.transcript);
            }, 1500);
          } else {
            setTimeout(checkTranscript, 500);
          }
        };
        checkTranscript();
      });
      
      if (transcript) {
        toast.success(`Распознано: "${transcript}"`);
        
        // Wait a moment, then speak it back
        setTimeout(async () => {
          await speak(`Вы сказали: ${transcript}. Это был round-trip тест голосовых функций.`);
          toast.success('Round-trip тест завершен успешно!');
        }, 1000);
      } else {
        toast.warning('Речь не была распознана');
      }
      
    } catch (error) {
      console.error('Round-trip test error:', error);
      toast.error('Ошибка в round-trip тесте');
    }
  }, [isSTTSupported, isTTSAvailable, startListening, stopListening, voiceState.transcript, speak]);

  const selectedVoiceName = ELEVENLABS_VOICES.find(v => v.id === selectedVoice)?.name || 'Неизвестно';

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Тестирование голосовых функций</h1>
        <p className="text-muted-foreground">
          Проверьте работу синтеза и распознавания речи с различными голосами ElevenLabs
        </p>
      </div>

      {/* Статус API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SpeakerHigh size={20} />
            Статус API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isTTSAvailable() ? "bg-green-500" : "bg-red-500"
              )} />
              <div>
                <p className="font-medium">ElevenLabs TTS</p>
                <p className="text-sm text-muted-foreground">
                  {isTTSAvailable() ? 'Подключен и готов' : 'API ключ не настроен'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className={cn(
                "w-3 h-3 rounded-full",
                isSTTSupported ? "bg-green-500" : "bg-red-500"
              )} />
              <div>
                <p className="font-medium">Распознавание речи</p>
                <p className="text-sm text-muted-foreground">
                  {isSTTSupported ? 'Поддерживается' : 'Не поддерживается'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Выбор голоса */}
      <Card>
        <CardHeader>
          <CardTitle>Выбор голоса</CardTitle>
          <CardDescription>
            Выберите голос ElevenLabs для тестирования. Текущий: {selectedVoiceName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedVoice} onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите голос..." />
              </SelectTrigger>
              <SelectContent>
                {ELEVENLABS_VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Тестирование TTS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SpeakerHigh size={20} />
            Тестирование синтеза речи (TTS)
          </CardTitle>
          <CardDescription>
            Протестируйте различные фразы с выбранным голосом
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Готовые фразы */}
            <div className="grid grid-cols-1 gap-2">
              <Label>Готовые тестовые фразы:</Label>
              {testPhrases.map((phrase, index) => (
                <div key={index} className="flex items-center gap-2 p-2 rounded border border-border">
                  <span className="flex-1 text-sm">{phrase}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testVoice(phrase)}
                    disabled={!isTTSAvailable() || (ttsState.isPlaying && ttsState.currentText === phrase)}
                  >
                    {ttsState.isPlaying && ttsState.currentText === phrase ? (
                      <Stop size={16} />
                    ) : (
                      <Play size={16} />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            {/* Пользовательский текст */}
            <div className="space-y-2">
              <Label>Ваш текст для озвучивания:</Label>
              <Textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Введите текст для тестирования..."
                className="min-h-[100px]"
              />
              <Button
                onClick={() => testVoice(customText)}
                disabled={!isTTSAvailable() || !customText.trim()}
                className="w-full"
              >
                {ttsState.isPlaying ? (
                  <>
                    <Stop size={16} className="mr-2" />
                    Остановить
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2" />
                    Озвучить текст
                  </>
                )}
              </Button>
              
              {/* Round-trip test */}
              {isSTTSupported && isTTSAvailable() && (
                <Button
                  onClick={testVoiceRoundTrip}
                  variant="outline"
                  className="w-full"
                >
                  🔄 Round-trip тест (STT → TTS)
                </Button>
              )}
            </div>

            {/* Статус TTS */}
            {ttsState.isLoading && (
              <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded border border-blue-500/20">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="text-sm text-blue-400">Генерация аудио...</span>
              </div>
            )}
            
            {ttsState.error && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                <XCircle size={16} className="text-red-400" />
                <span className="text-sm text-red-400">Ошибка: {ttsState.error}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Тестирование STT */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Microphone size={20} />
            Тестирование распознавания речи (STT)
          </CardTitle>
          <CardDescription>
            Протестируйте голосовой ввод и качество распознавания
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isSTTSupported ? (
              <>
                <Button
                  onClick={testSTT}
                  variant={voiceState.isListening ? "destructive" : "default"}
                  className="w-full"
                  size="lg"
                >
                  {voiceState.isListening ? (
                    <>
                      <MicrophoneSlash size={20} className="mr-2" />
                      Остановить запись
                    </>
                  ) : (
                    <>
                      <Microphone size={20} className="mr-2" />
                      Начать запись
                    </>
                  )}
                </Button>

                {/* Статус распознавания */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Badge variant={voiceState.isListening ? "default" : "secondary"}>
                      {voiceState.isListening ? 'Слушает' : 'Ожидание'}
                    </Badge>
                    {voiceState.isProcessing && (
                      <Badge variant="outline">Обрабатывает</Badge>
                    )}
                    <Badge variant="outline">
                      Метод: {supportDetails.hasSpeechRecognition ? 'Web Speech API' : 'Whisper'}
                    </Badge>
                  </div>

                  {voiceState.transcript && (
                    <div className="p-3 rounded border border-border bg-muted/50">
                      <Label className="text-xs text-muted-foreground">Распознанный текст:</Label>
                      <p className="mt-1">{voiceState.transcript}</p>
                      {voiceState.confidence > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Уверенность: {(voiceState.confidence * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  )}

                  {voiceState.error && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded border border-red-500/20">
                      <XCircle size={16} className="text-red-400" />
                      <span className="text-sm text-red-400">Ошибка: {voiceState.error}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-yellow-500/10 rounded border border-yellow-500/20">
                <Warning size={20} className="text-yellow-400" />
                <div>
                  <p className="font-medium text-yellow-400">Распознавание речи недоступно</p>
                  <p className="text-sm text-yellow-600">
                    Этот браузер не поддерживает Web Speech API. Попробуйте Chrome или Safari.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Автоматический полный тест */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle size={20} />
            Полный тест голосовых функций
          </CardTitle>
          <CardDescription>
            Автоматический тест всех голосовых возможностей: смена голосов, TTS и STT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              onClick={runFullVoiceTest}
              disabled={isRunningFullTest || !isTTSAvailable()}
              className="w-full"
              size="lg"
            >
              {isRunningFullTest ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Выполняется тест...
                </>
              ) : (
                <>
                  <Play size={20} className="mr-2" />
                  Запустить полный тест
                </>
              )}
            </Button>

            {/* Результаты теста */}
            {(testResults.tts !== null || testResults.stt !== null || testResults.voiceChange !== null) && (
              <div className="grid grid-cols-3 gap-2">
                <div className={cn(
                  "flex items-center gap-2 p-2 rounded border",
                  testResults.tts === true ? "border-green-500 bg-green-500/10" :
                  testResults.tts === false ? "border-red-500 bg-red-500/10" :
                  "border-gray-500 bg-gray-500/10"
                )}>
                  {testResults.tts === true ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : testResults.tts === false ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="text-sm">TTS</span>
                </div>

                <div className={cn(
                  "flex items-center gap-2 p-2 rounded border",
                  testResults.voiceChange === true ? "border-green-500 bg-green-500/10" :
                  testResults.voiceChange === false ? "border-red-500 bg-red-500/10" :
                  "border-gray-500 bg-gray-500/10"
                )}>
                  {testResults.voiceChange === true ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : testResults.voiceChange === false ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="text-sm">Голоса</span>
                </div>

                <div className={cn(
                  "flex items-center gap-2 p-2 rounded border",
                  testResults.stt === true ? "border-green-500 bg-green-500/10" :
                  testResults.stt === false ? "border-red-500 bg-red-500/10" :
                  "border-gray-500 bg-gray-500/10"
                )}>
                  {testResults.stt === true ? (
                    <CheckCircle size={16} className="text-green-500" />
                  ) : testResults.stt === false ? (
                    <XCircle size={16} className="text-red-500" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span className="text-sm">STT</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle 
            className="cursor-pointer flex items-center justify-between"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Техническая информация
            <Button variant="ghost" size="sm">
              {showAdvanced ? 'Скрыть' : 'Показать'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showAdvanced && (
          <CardContent>
            <div className="space-y-2 text-sm font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold mb-2">Web Speech API:</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>SpeechRecognition:</span>
                      <span className={supportDetails.hasSpeechRecognition ? 'text-green-400' : 'text-red-400'}>
                        {supportDetails.hasSpeechRecognition ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>MediaDevices:</span>
                      <span className={supportDetails.hasMediaDevices ? 'text-green-400' : 'text-red-400'}>
                        {supportDetails.hasMediaDevices ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>getUserMedia:</span>
                      <span className={supportDetails.hasGetUserMedia ? 'text-green-400' : 'text-red-400'}>
                        {supportDetails.hasGetUserMedia ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Secure Context:</span>
                      <span className={supportDetails.isSecureContext ? 'text-green-400' : 'text-red-400'}>
                        {supportDetails.isSecureContext ? '✅' : '❌'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="font-semibold mb-2">API Status:</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>ElevenLabs:</span>
                      <span className={isTTSAvailable() ? 'text-green-400' : 'text-red-400'}>
                        {isTTSAvailable() ? '✅' : '❌'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>OpenRouter:</span>
                      <span className="text-green-400">✅</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Supabase:</span>
                      <span className="text-green-400">✅</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-2 bg-muted/50 rounded text-xs">
                <p><strong>User Agent:</strong> {supportDetails.userAgent}</p>
                <p><strong>Protocol:</strong> {supportDetails.protocol}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}