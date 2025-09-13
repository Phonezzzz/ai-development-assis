import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AgentSelector } from '@/components/AgentSelector';
import { WorkModeSelector } from '@/components/WorkModeSelector';
import { WorkMode } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { cn } from '@/lib/utils';
import { 
  PaperPlaneRight, 
  Paperclip, 
  Microphone, 
  MicrophoneSlash,
  Robot,
  Wrench,
  Brain,
  CaretDown
} from '@phosphor-icons/react';

interface ModernChatInputProps {
  onSubmit: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  enabled: boolean;
}

const AVAILABLE_MODELS: ModelOption[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', contextLength: 8192, enabled: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'OpenAI', contextLength: 128000, enabled: true },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', contextLength: 16384, enabled: true },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', contextLength: 200000, enabled: false },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', contextLength: 200000, enabled: false },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', contextLength: 32768, enabled: false },
];

const AGENT_TOOLS = [
  { id: 'web-search', name: 'Веб поиск', icon: '🔍', description: 'Поиск информации в интернете' },
  { id: 'add-new-tool', name: '+ Добавить инструмент', icon: '➕', description: 'Создать новый инструмент' },
];

export function ModernChatInput({ onSubmit, placeholder = "Спросите что угодно или упомяните пространство", disabled }: ModernChatInputProps) {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useKV<string>('selected-model', 'gpt-4');
  const [workMode, setWorkMode] = useKV<WorkMode>('work-mode', 'plan');
  const [selectedTools, setSelectedTools] = useKV<string[]>('selected-tools', []);
  const [selectedAgent, setSelectedAgent] = useKV<string>('selected-agent', 'architector');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || disabled) return;
    
    onSubmit(input, workMode || 'plan', isListening);
    setInput('');
  }, [input, workMode, onSubmit, disabled, isListening]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const toggleVoiceRecognition = useCallback(() => {
    setIsListening(!isListening);
    // Here would be the actual voice recognition logic
  }, [isListening]);

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

  const selectedModelData = AVAILABLE_MODELS.find(m => m.id === selectedModel);

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
                  title={`Модель: ${selectedModelData?.name || 'Не выбрана'}`}
                >
                  <Brain size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {AVAILABLE_MODELS.map((model) => (
                  <DropdownMenuItem
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    disabled={!model.enabled}
                    className={cn(
                      "flex flex-col items-start gap-1 p-3",
                      selectedModel === model.id && "bg-accent",
                      !model.enabled && "opacity-50"
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{model.name}</span>
                      {!model.enabled && (
                        <span className="text-xs text-muted-foreground">Недоступно</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {model.provider} • {model.contextLength.toLocaleString()} токенов
                    </div>
                  </DropdownMenuItem>
                ))}
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
                isListening 
                  ? "text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              title={isListening ? "Остановить запись" : "Голосовой ввод"}
            >
              {isListening ? <MicrophoneSlash size={16} /> : <Microphone size={16} />}
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
        {(isListening || (selectedTools && selectedTools.length > 0) || selectedAgent) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {isListening && (
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
      </form>
    </Card>
  );
}