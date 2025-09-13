import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AgentSelector } from '@/components/AgentSelector';
import { WorkModeSelector } from '@/components/WorkModeSelector';
import { WorkMode } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { useModelSelection } from '@/hooks/use-model-selection';
import { useVoiceSTT } from '@/hooks/use-voice-stt-fixed';
import { cn } from '@/lib/utils';
import { 
  PaperPlaneRight, 
  Paperclip, 
  Microphone, 
  MicrophoneSlash,
  Robot,
  Wrench,
  Brain,
  CaretDown,
  Sparkle,
  ArrowClockwise
} from '@phosphor-icons/react';

interface ModernChatInputProps {
  onSubmit: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

const AGENT_TOOLS = [
  { id: 'web-search', name: 'Веб поиск', icon: '🔍', description: 'Поиск информации в интернете' },
  { id: 'add-new-tool', name: '+ Добавить инструмент', icon: '➕', description: 'Создать новый инструмент' },
];

export function ModernChatInput({ onSubmit, placeholder = "Спросите что угодно или упомяните пространство", disabled }: ModernChatInputProps) {
  const [input, setInput] = useState('');
  const [workMode, setWorkMode] = useKV<WorkMode>('work-mode', 'ask');
  const [selectedTools, setSelectedTools] = useKV<string[]>('selected-tools', []);
  const [selectedAgent, setSelectedAgent] = useKV<string>('selected-agent', 'architector');
  const inputRef = useRef<HTMLInputElement>(null);

  // Используем хук для работы с моделями
  const {
    availableModels,
    currentModel,
    selectModel,
    isLoading,
    isConfigured,
    refreshModels,
  } = useModelSelection();

  // Используем хук для распознавания речи
  const { 
    voiceState, 
    startListening, 
    stopListening, 
    isSupported 
  } = useVoiceSTT();

  // Обновляем input при получении транскрипта
  useEffect(() => {
    if (voiceState.transcript && !voiceState.isProcessing && !voiceState.isListening) {
      setInput(voiceState.transcript);
      // Не отправляем автоматически, позволяем пользователю решить
    }
  }, [voiceState.transcript, voiceState.isProcessing, voiceState.isListening]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    
    onSubmit(input, workMode || 'plan', voiceState.isListening);
    setInput('');
  }, [input, workMode, onSubmit, disabled, voiceState.isListening]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const toggleVoiceRecognition = useCallback(async () => {
    console.log('=== STT TOGGLE CLICKED ===');
    console.log('Кнопка STT нажата!');
    console.log('isSupported:', isSupported);
    console.log('voiceState:', voiceState);
    
    if (!isSupported) {
      console.warn('Speech recognition not supported');
      alert('Распознавание речи не поддерживается в этом браузере.\nТребуется Chrome, Edge или Safari.');
      return;
    }

    if (voiceState.isListening) {
      console.log('Stopping voice recognition...');
      stopListening();
    } else {
      console.log('Starting voice recognition...');
      try {
        await startListening();
        console.log('startListening() completed');
      } catch (error) {
        console.error('Error in startListening:', error);
        alert(`Ошибка запуска STT: ${error}`);
      }
    }
  }, [voiceState.isListening, isSupported, startListening, stopListening]);

  const handleFileUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '*/*';
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        // Handle file upload logic here
        console.log('Files selected:', Array.from(files));
      }
    };
    input.click();
  }, []);

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'openai': return 'bg-green-500/20 text-green-300';
      case 'anthropic': return 'bg-orange-500/20 text-orange-300';
      case 'meta': return 'bg-blue-500/20 text-blue-300';
      case 'google': return 'bg-red-500/20 text-red-300';
      case 'mistral ai': return 'bg-purple-500/20 text-purple-300';
      case 'cohere': return 'bg-teal-500/20 text-teal-300';
      case 'deepseek': return 'bg-indigo-500/20 text-indigo-300';
      case 'qwen': return 'bg-cyan-500/20 text-cyan-300';
      case 'perplexity': return 'bg-amber-500/20 text-amber-300';
      case 'nvidia': return 'bg-lime-500/20 text-lime-300';
      case 'microsoft': return 'bg-sky-500/20 text-sky-300';
      case 'hugging face': return 'bg-yellow-500/20 text-yellow-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <Card className="p-4 bg-card border">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Input field with icons */}
        <div className="relative">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {/* Models dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-accent hover:shadow-[0_0_8px_rgba(147,51,234,0.3)]"
                  title={`Модель: ${currentModel?.name || 'Не выбрана'}`}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ArrowClockwise size={14} className="animate-spin" />
                  ) : (
                    <Brain size={14} />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-80">
                <div className="flex items-center justify-between p-2">
                  <DropdownMenuLabel>Выбор модели ИИ</DropdownMenuLabel>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshModels}
                    className="h-6 w-6 p-0"
                  >
                    <ArrowClockwise className="h-3 w-3" />
                  </Button>
                </div>
                
                {!isConfigured && (
                  <>
                    <div className="px-2 py-1">
                      <div className="flex items-center gap-2 text-sm text-yellow-400">
                        <span>⚠️ API не настроен - демо режим</span>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}

                <div className="max-h-96 overflow-y-auto">
                  {availableModels.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => selectModel(model.id)}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium">{model.name}</span>
                        <div className="flex items-center gap-1 ml-auto">
                          {model.free && (
                            <Badge variant="secondary" className="text-xs">
                              FREE
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-xs ${getProviderColor(model.provider)}`}
                          >
                            {model.provider}
                          </Badge>
                        </div>
                      </div>
                      {model.description && (
                        <p className="text-xs text-muted-foreground">
                          {model.description}
                        </p>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>

                {availableModels.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Модели не найдены
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Tools dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0 bg-muted/50 hover:bg-muted transition-all duration-200 border border-transparent hover:border-accent hover:shadow-[0_0_8px_rgba(147,51,234,0.3)]"
                  title={`Инструменты: ${selectedTools?.length || 0} активно`}
                >
                  <Wrench size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {AGENT_TOOLS.map((tool) => (
                  <DropdownMenuItem
                    key={tool.id}
                    onClick={() => {
                      if (tool.id === 'add-new-tool') {
                        // Handle new tool creation
                        console.log('Adding new tool...');
                        return;
                      }
                      setSelectedTools(prev => 
                        (prev || []).includes(tool.id) 
                          ? (prev || []).filter(id => id !== tool.id)
                          : [...(prev || []), tool.id]
                      );
                    }}
                    className="flex items-start gap-3 p-3"
                  >
                    <div className="text-lg">{tool.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-xs text-muted-foreground">{tool.description}</div>
                    </div>
                    {(selectedTools || []).includes(tool.id) && tool.id !== 'add-new-tool' && (
                      <div className="w-2 h-2 bg-accent rounded-full" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Agents dropdown */}
            <AgentSelector
              selectedAgent={selectedAgent}
              onAgentSelect={setSelectedAgent}
            />
          </div>

          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-32 pr-28 py-3 text-sm bg-background border-input focus:border-accent transition-colors"
          />

          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
            {/* Voice recognition button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={toggleVoiceRecognition}
              className={cn(
                "h-7 w-7 p-0 transition-all duration-200 border border-transparent",
                "hover:border-accent hover:shadow-[0_0_8px_rgba(147,51,234,0.3)]",
                voiceState.isListening 
                  ? "text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={voiceState.isListening ? "Остановить запись" : "Голосовой ввод"}
              disabled={!isSupported}
            >
              {voiceState.isListening ? <MicrophoneSlash size={16} /> : <Microphone size={16} />}
            </Button>

            {/* Attach file button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleFileUpload}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200 border border-transparent hover:border-accent hover:shadow-[0_0_8px_rgba(147,51,234,0.3)]"
              title="Прикрепить файл"
            >
              <Paperclip size={16} />
            </Button>

            {/* Submit button */}
            <Button
              type="submit"
              size="sm"
              disabled={!input.trim() || disabled}
              className={cn(
                "h-7 w-7 p-0 bg-accent hover:bg-accent/90 text-accent-foreground transition-all duration-200",
                "border border-accent hover:shadow-[0_0_12px_rgba(147,51,234,0.5)]",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:border-transparent"
              )}
              title="Отправить сообщение"
            >
              <PaperPlaneRight size={16} />
            </Button>
          </div>
        </div>

        {/* Work Mode selector moved to the right side under the buttons */}
        <div className="flex justify-end">
          <WorkModeSelector
            selectedMode={workMode}
            onModeSelect={setWorkMode}
          />
        </div>

        {/* Status indicators */}
        {(voiceState.isListening || (selectedTools && selectedTools.length > 0) || selectedAgent) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {voiceState.isListening && (
              <div className="flex items-center gap-1">
                <div className="voice-waveform">
                  <div className="voice-bar"></div>
                  <div className="voice-bar"></div>
                  <div className="voice-bar"></div>
                  <div className="voice-bar"></div>
                  <div className="voice-bar"></div>
                </div>
                <span>Слушаю...</span>
              </div>
            )}
            {selectedTools && selectedTools.length > 0 && (
              <div className="flex items-center gap-1">
                <Wrench size={12} />
                <span>{selectedTools.length} инструментов активно</span>
              </div>
            )}
            {selectedAgent && (
              <div className="flex items-center gap-1">
                <Robot size={12} />
                <span>Агент выбран</span>
              </div>
            )}
          </div>
        )}
        
        {/* Debug info for STT */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-muted-foreground">
            STT поддержка: {isSupported ? '✅' : '❌'} | 
            Web Speech API: {(window as any).SpeechRecognition || (window as any).webkitSpeechRecognition ? '✅' : '❌'} |
            MediaDevices: {navigator.mediaDevices ? '✅' : '❌'} |
            getUserMedia: {typeof navigator.mediaDevices?.getUserMedia === 'function' ? '✅' : '❌'} |
            Состояние: {voiceState.isListening ? 'Слушаю' : 'Ожидание'} |
            Кнопка: {!isSupported ? 'Заблокирована' : 'Активна'} |
            Транскрипт: "{voiceState.transcript}"
          </div>
        )}
      </form>
    </Card>
  );
}