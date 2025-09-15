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
import { useVoiceSimple } from '@/hooks/use-voice-simple';
import { cn } from '@/lib/utils';
import { 
  PaperPlaneRight, 
  Paperclip, 
  Microphone, 
  MicrophoneSlash,
  Robot,
  Wrench,
  Brain,
  Sparkle,
  CaretDown,
  Gear,
  Stop,
  Play
} from '@phosphor-icons/react';

interface ModernChatInputProps {
  onSubmit: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  workMode: WorkMode | null;
  setWorkMode: (mode: WorkMode) => void;
}

export function ModernChatInput({
  onSubmit,
  disabled = false,
  placeholder = "Напишите сообщение...",
  workMode,
  setWorkMode,
}: ModernChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedAgent] = useKV<string>('selected-agent', 'architector');
  const [selectedTools, setSelectedTools] = useKV<string[]>('selected-tools', []);
  const [showDebugMode] = useKV<boolean>('show-debug-mode', false);
  const [workModeState, setWorkModeState] = useState<WorkMode>(workMode || 'plan');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Model selection hook
  const { availableModels, selectedModel, selectModel, isLoading: modelsLoading } = useModelSelection();

  // Используем упрощенный хук для распознавания речи
  const { 
    voiceState, 
    startListening, 
    stopListening, 
    isSupported,
    supportDetails,
  } = useVoiceSimple();

  // Определяем метод STT
  const currentSTTState = voiceState;
  const isSTTAvailable = isSupported;

  // Обновляем input при получении транскрипта - предотвращаем циклы
  useEffect(() => {
    if (voiceState.transcript.trim() && voiceState.transcript !== input) {
      setInput(voiceState.transcript.trim());
    }
  }, [voiceState.transcript, input]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    
    const isVoiceInput = voiceState.isListening;
    
    onSubmit(input, workMode || 'plan', isVoiceInput);
    setInput('');
  }, [input, workMode, onSubmit, disabled, currentSTTState.isListening]);

  // Debug информация - упрощено чтобы избежать циклов
  useEffect(() => {
    if (showDebugMode) {
      console.log('STT Debug Info:', {
        isSupported,
        isListening: voiceState.isListening,
        hasTranscript: !!voiceState.transcript,
        error: voiceState.error
      });
    }
  }, [showDebugMode, isSupported, voiceState.isListening, voiceState.error]);

  // Функция для переключения голосового ввода
  const toggleVoiceRecognition = useCallback(async () => {
    console.log('Кнопка STT нажата! Поддержка:', isSupported ? 'Да' : 'Нет');
    
    if (!isSupported) {
      return;
    }

    try {
      await startListening();
    } catch (error) {
      console.error('Ошибка при запуске STT:', error);
    }
  }, [isSupported, startListening]);

  // Зависимости для переключения - упрощено
  useEffect(() => {
    if (voiceState.transcript && voiceState.transcript !== input) {
      console.log('STT transcript received:', voiceState.transcript);
    }
  }, [voiceState.transcript, input]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  // Инструменты для агентов
  const availableTools = [
    { id: 'web-search', name: 'Веб поиск', icon: Brain },
  ];

  const toolIcons: Record<string, any> = {
    'web-search': Brain,
  };

  // Доступные агенты
  const availableAgents = [
    { id: 'architector', name: 'Архитектор', icon: Robot },
    { id: 'fixer', name: 'Исправитель', icon: Wrench },
    { id: 'coder', name: 'Программист', icon: Sparkle },
  ];

  const agentIcons: Record<string, any> = {
    'architector': Robot,
    'fixer': Wrench,
    'coder': Sparkle,
  };

  const getAgentName = (id: string) => {
    return availableAgents.find(agent => agent.id === id)?.name || id;
  };

  const handleToolToggle = (toolId: string) => {
    setSelectedTools(prev => {
      const current = prev || [];
      return current.includes(toolId) 
        ? current.filter(id => id !== toolId)
        : [...current, toolId];
    });
  };

  // Режимы работы с иконками
  const workModes = [
    { id: 'plan' as WorkMode, name: 'План', icon: Brain },
    { id: 'act' as WorkMode, name: 'Действие', icon: Sparkle },
    { id: 'ask' as WorkMode, name: 'Спросить', icon: Robot },
  ];

  return (
    <div className="space-y-4">
      {/* Отладочная информация */}
      {showDebugMode && (
        <Card className="p-4 bg-muted/50 text-sm font-mono">
          <div className="space-y-1">
            <div>
              STT поддержка: {isSupported ? '✅' : '❌'} | 
              Web Speech API: {supportDetails.hasSpeechRecognition ? '✅' : '❌'} | 
              MediaDevices: {supportDetails.hasMediaDevices ? '✅' : '❌'} | 
              getUserMedia: {supportDetails.hasGetUserMedia ? '✅' : '❌'} | 
              Состояние: {voiceState.isListening ? 'Слушает' : voiceState.isProcessing ? 'Обрабатывает' : 'Ожидание'} | 
              Кнопка: {isSupported ? 'Доступна' : 'Заблокирована'}
            </div>
            <div>
              Транскрипт: "{voiceState.transcript}" | 
              Уверенность: {(voiceState.confidence * 100).toFixed(1)}%
              {voiceState.error && ` | Ошибка: ${voiceState.error}`}
            </div>
            <div>
              Браузер: {supportDetails.userAgent.substring(0, 50)}... | 
              Протокол: {supportDetails.protocol} | 
              Безопасный контекст: {supportDetails.isSecureContext ? 'Да' : 'Нет'}
            </div>
          </div>
        </Card>
      )}

      <Card className="relative border-2 border-border hover:border-accent/50 transition-colors duration-200">
        <div className="flex items-center gap-2 p-3">
          {/* Левая панель - модели и инструменты */}
          <div className="flex items-center gap-2">
            {/* Селектор моделей */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 hover:bg-accent/20 border border-border"
                  disabled={modelsLoading}
                >
                  {modelsLoading ? (
                    <Skeleton className="w-16 h-4" />
                  ) : (
                    <>
                      <Gear size={14} className="mr-1" />
                    <span className="text-xs max-w-[100px] truncate">
                        {availableModels.find(m => m.id === selectedModel)?.name || 'Модель'}
                      </span>
                      <CaretDown size={12} className="ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Локальные модели</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => {
                    const url = prompt('Введите адрес локального сервера:', 'http://localhost:11964');
                    if (url) {
                      // Store the local server URL and refresh models
                      localStorage.setItem('local-server-url', url);
                      window.location.reload(); // Simple refresh for now
                    }
                  }}
                  className="text-blue-400 font-medium"
                >
                  ⚙️ Настроить локальный сервер
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                <DropdownMenuLabel>Модели</DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* Local Models Section */}
                {availableModels.filter(m => m.isLocal).length > 0 && (
                  <>
                    {availableModels.filter(m => m.isLocal).map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onClick={() => selectModel(model.id)}
                        className={cn(
                          "flex items-center justify-between",
                          selectedModel === model.id && "bg-accent"
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium text-green-400">🏠 {model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Локальная модель
                          </span>
                        </div>
                        {selectedModel === model.id && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                  </>
                )}
                
                {/* OpenRouter Models */}
                {availableModels.filter(m => !m.isLocal).map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => selectModel(model.id)}
                    className={cn(
                      "flex items-center justify-between",
                      selectedModel === model.id && "bg-accent"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      {model.description && (
                        <span className="text-xs text-muted-foreground">
                          {model.description}
                        </span>
                      )}
                    </div>
                    {selectedModel === model.id && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Селектор инструментов */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 hover:bg-accent/20 border border-border"
                >
                  <Wrench size={14} className="mr-1" />
                  <span className="text-xs">
                    {(selectedTools || []).length} инструментов активно
                  </span>
                  <CaretDown size={12} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Инструменты</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTools.map((tool) => {
                  const ToolIcon = toolIcons[tool.id];
                  const isSelected = (selectedTools || []).includes(tool.id);
                  return (
                    <DropdownMenuItem
                      key={tool.id}
                      onClick={() => handleToolToggle(tool.id)}
                      className={cn(
                        "flex items-center gap-2",
                        isSelected && "bg-accent"
                      )}
                    >
                      <ToolIcon size={16} />
                      <span>{tool.name}</span>
                      {isSelected && (
                        <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Селектор агентов */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2 hover:bg-accent/20 border border-border"
                >
                  <Robot size={14} className="mr-1" />
                  <span className="text-xs">Агент выбран</span>
                  <CaretDown size={12} className="ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Агенты</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableAgents.map((agent) => {
                  const AgentIcon = agentIcons[agent.id];
                  const isSelected = selectedAgent === agent.id;
                  return (
                    <DropdownMenuItem
                      key={agent.id}
                      onClick={() => {}}
                      className={cn(
                        "flex items-center gap-2",
                        isSelected && "bg-accent"
                      )}
                    >
                      <AgentIcon size={16} />
                      <span>{agent.name}</span>
                      {isSelected && (
                        <div className="ml-auto w-2 h-2 bg-primary rounded-full" />
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Основной ввод */}
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className="border-0 focus-visible:ring-0 bg-transparent pr-24"
            />
          </div>

          {/* Правая панель - STT, вложения, отправка */}
          <div className="flex items-center gap-2">
            {/* Кнопка STT */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleVoiceRecognition}
              disabled={!isSupported}
              className={cn(
                "h-8 w-8 p-0 hover:bg-accent/20",
                voiceState.isListening && "bg-accent text-accent-foreground",
                !isSupported && "opacity-50 cursor-not-allowed"
              )}
              title={
                isSupported 
                  ? "Нажмите для голосового ввода"
                  : "Голосовой ввод недоступен в этом браузере"
              }
            >
              {voiceState.isListening ? (
                <MicrophoneSlash size={16} />
              ) : (
                <Microphone size={16} />
              )}
            </Button>

            {/* Кнопка вложений */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent/20"
              disabled={disabled}
            >
              <Paperclip size={16} />
            </Button>

            {/* Кнопка отправки */}
            <Button
              onClick={handleSubmit}
              disabled={disabled || !input.trim()}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <PaperPlaneRight size={16} />
            </Button>
          </div>
        </div>

        {/* Индикатор голосового ввода */}
        {voiceState.isListening && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent/20">
            <div className="h-full bg-accent animate-pulse" />
          </div>
        )}
      </Card>

      {/* Режимы работы */}
      <div className="flex justify-end">
        <WorkModeSelector 
          selectedMode={workModeState} 
          onModeSelect={(mode) => {
            setWorkModeState(mode);
            setWorkMode(mode);
          }}
        />
      </div>
    </div>
  );
}