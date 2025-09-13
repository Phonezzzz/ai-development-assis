import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useModelSelection } from '@/hooks/use-model-selection';
import { CaretDown, Sparkle, Warning, ArrowClockwise } from '@phosphor-icons/react';

export function ModelSelector() {
  const {
    availableModels,
    currentModel,
    selectModel,
    isLoading,
    isConfigured,
    refreshModels,
  } = useModelSelection();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshModels();
    setIsRefreshing(false);
  };

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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-32" />
        <CaretDown className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 min-w-48 justify-between"
        >
          <div className="flex items-center gap-2">
            <Sparkle className="h-4 w-4" />
            <span className="truncate">
              {currentModel?.name || 'Выберите модель'}
            </span>
            {currentModel?.free && (
              <Badge variant="secondary" className="text-xs">
                FREE
              </Badge>
            )}
          </div>
          <CaretDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between p-2">
          <DropdownMenuLabel>Выбор модели ИИ</DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-6 w-6 p-0"
          >
            <ArrowClockwise className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {!isConfigured && (
          <>
            <div className="px-2 py-1">
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <Warning className="h-4 w-4" />
                <span>API не настроен - демо режим</span>
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

        <DropdownMenuSeparator />
        <div className="p-2 text-xs text-muted-foreground">
          {isConfigured ? (
            <span>Используется OpenRouter API</span>
          ) : (
            <span>Настройте VITE_OPENROUTER_API_KEY для доступа к реальным моделям</span>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}