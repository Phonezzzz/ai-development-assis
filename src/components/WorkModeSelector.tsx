import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { 
  Brain,
  Lightning
} from '@phosphor-icons/react';
import { WorkMode } from '@/lib/types';

const WORK_MODES = [
  { id: 'plan', name: 'План', icon: Brain, description: 'Создание детального плана' },
  { id: 'act', name: 'Действие', icon: Lightning, description: 'Выполнение задач' },
];

interface WorkModeSelectorProps {
  selectedMode?: WorkMode;
  onModeSelect: (mode: WorkMode) => void;
  className?: string;
}

export function WorkModeSelector({ selectedMode, onModeSelect, className }: WorkModeSelectorProps) {
  const currentMode = WORK_MODES.find(mode => mode.id === selectedMode);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "h-6 w-6 p-0 bg-muted/50 hover:bg-muted",
            className
          )}
          title={`Режим: ${currentMode?.name || 'Не выбран'}`}
        >
          {currentMode?.icon ? <currentMode.icon size={14} /> : <Brain size={14} />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {WORK_MODES.map((mode) => (
          <DropdownMenuItem
            key={mode.id}
            onClick={() => onModeSelect(mode.id as WorkMode)}
            className={cn(
              "flex items-start gap-3 p-3 cursor-pointer",
              selectedMode === mode.id && "bg-accent"
            )}
          >
            <mode.icon size={16} />
            <div className="flex-1">
              <div className="font-medium">{mode.name}</div>
              <div className="text-xs text-muted-foreground">{mode.description}</div>
            </div>
            {selectedMode === mode.id && (
              <div className="w-2 h-2 bg-accent rounded-full" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}