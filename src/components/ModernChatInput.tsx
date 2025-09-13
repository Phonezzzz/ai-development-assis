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
import { useVoiceUnified } from '@/hooks/use-voice-unified';
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

  // Используем унифицированный хук для распознавания речи
  const { 
    voiceState, 
    startListening, 
    stopListening, 
    isSupported,
    supportDetails,
  } = useVoiceUnified();

  // Определяем метод STT
  const currentSTTState = voiceState;
  const isSTTAvailable = isSupported;

  // Обновляем input при получении транскрипта
  useEffect(() => {
    if (currentSTTState.transcript.trim()) {
      setInput(currentSTTState.transcript.trim());
    }
  }, [currentSTTState.transcript]);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    
    const isVoiceInput = currentSTTState.isListening;
    
    onSubmit(input, workMode || 'plan', isVoiceInput);
    setInput('');
  }, [input, workMode, onSubmit, disabled, voiceState.isListening]);

  // Debug информация
  useEffect(() => {
    console.log('STT Debug Info:');
    console.log('isSTTAvailable:', isSTTAvailable);
    console.log('supportDetails:', supportDetails);
    console.log('currentSTTState:', currentSTTState);
    
    if (currentSTTState.isListening && currentSTTState.transcript) {
      console.log('Получен транскрипт:', currentSTTState.transcript);
    }
  }, [isSTTAvailable, supportDetails, currentSTTState]);

  // Функция для переключения голосового ввода
  const toggleVoiceRecognition = useCallback(async () => {
    console.log('Кнопка STT нажата! Поддержка:', isSTTAvailable ? 'Да' : 'Нет');
    
    if (!isSTTAvailable) {
      return;
    }

    try {
      await startListening();
    } catch (error) {
      console.error('Ошибка при запуске STT:', error);
    }
  }, [isSTTAvailable, startListening]);

  // Зависимости для переключения
  useEffect(() => {
    console.log('STT State change:', {
      isListening: currentSTTState.isListening,
      isProcessing: currentSTTState.isProcessing,
      transcript: currentSTTState.transcript,
      error: currentSTTState.error,
    });
  }, [isSTTAvailable, currentSTTState, startListening, stopListening]);

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
              STT поддержка: {isSTTAvailable ? '✅' : '❌'} | 
              Web Speech API: {supportDetails.hasSpeechRecognition ? '✅' : '❌'} | 
              MediaDevices: {supportDetails.hasMediaDevices ? '✅' : '❌'} | 
              getUserMedia: {supportDetails.hasGetUserMedia ? '✅' : '❌'} | 
              Состояние: {currentSTTState.isListening ? 'Слушает' : currentSTTState.isProcessing ? 'Обрабатывает' : 'Ожидание'} | 
              Кнопка: {isSTTAvailable ? 'Доступна' : 'Заблокирована'}
            </div>
            <div>
              Транскрипт: "{currentSTTState.transcript}" | 
              Уверенность: {(currentSTTState.confidence * 100).toFixed(1)}%
              {currentSTTState.error && ` | Ошибка: ${currentSTTState.error}`}
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
                <DropdownMenuLabel>Модели</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableModels.map((model) => (
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
              disabled={!isSTTAvailable}
              className={cn(
                "h-8 w-8 p-0 hover:bg-accent/20",
                currentSTTState.isListening && "bg-accent text-accent-foreground",
                !isSTTAvailable && "opacity-50 cursor-not-allowed"
              )}
              title={
                isSTTAvailable 
                  ? "Нажмите для голосового ввода"
                  : "Голосовой ввод недоступен в этом браузере"
              }
            >
              {currentSTTState.isListening ? (
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
        {currentSTTState.isListening && (
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