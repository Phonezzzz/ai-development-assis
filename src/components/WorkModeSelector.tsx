import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WorkMode } from '@/lib/types';
import { Brain, Sparkle, Robot } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface WorkModeSelectorProps {
  selectedMode: WorkMode;
  onModeSelect: (mode: WorkMode) => void;
  disabled?: boolean;
}

export function WorkModeSelector({ selectedMode, onModeSelect, disabled = false }: WorkModeSelectorProps) {
  const modes = [
    {
      id: 'plan' as WorkMode,
      name: 'План',
      icon: Brain,
      description: 'Создать план без выполнения',
      color: 'bg-blue-500'
    },
    {
      id: 'act' as WorkMode,
      name: 'Действие',
      icon: Sparkle,
      description: 'Выполнить задачу сразу',
      color: 'bg-green-500'
    },
    {
      id: 'ask' as WorkMode,
      name: 'Спросить',
      icon: Robot,
      description: 'Задать вопрос ИИ',
      color: 'bg-purple-500'
    }
  ];

  return (
    <div className="flex gap-1 p-1 bg-muted/30 rounded-lg border">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isSelected = selectedMode === mode.id;
        
        return (
          <Button
            key={mode.id}
            variant={isSelected ? "default" : "ghost"}
            size="sm"
            disabled={disabled}
            onClick={() => onModeSelect(mode.id)}
            className={cn(
              "flex items-center gap-2 text-xs h-8 px-3",
              isSelected && "bg-accent text-accent-foreground shadow-sm"
            )}
            title={mode.description}
          >
            <Icon size={14} />
            <span>{mode.name}</span>
          </Button>
        );
      })}
    </div>
  );
}