import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { agentTools } from '@/lib/services/agent-tools';
import { toast } from 'sonner';
import { 
  FileCode, 
  MagnifyingGlass, 
  Lightning, 
  Tree,
  Wrench,
  Play,
  Stop,
  ClipboardText,
  FolderOpen,
  Terminal,
  Globe,
  Database,
} from '@phosphor-icons/react';

const toolIcons: Record<string, any> = {
  'file_analysis': FileCode,
  'code_generator': Lightning,
  'semantic_search': MagnifyingGlass,
  'project_indexer': Tree,
  'web_scraper': Globe,
  'database_query': Database,
  'text_processor': ClipboardText,
  'file_manager': FolderOpen,
  'terminal_executor': Terminal,
};

export function AgentToolsDisplay() {
  const [runningTools, setRunningTools] = useState<Set<string>>(new Set());

  const getToolIcon = (toolName: string) => {
    const IconComponent = toolIcons[toolName] || Wrench;
    return <IconComponent size={20} />;
  };

  const runTool = async (tool: any) => {
    const toolId = tool.name;
    setRunningTools(prev => new Set([...prev, toolId]));
    toast.info(`Запуск инструмента: ${tool.name}...`);

    try {
      // Симуляция выполнения инструмента
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const result = await agentTools.find(t => t.name === tool.name)?.execute({
        input: 'test_input',
        context: 'agent_execution',
      });

      toast.success(`Инструмент "${tool.name}" выполнен успешно`);
      console.log('Tool result:', result);
    } catch (error) {
      toast.error(`Ошибка при выполнении "${tool.name}"`);
    } finally {
      setRunningTools(prev => {
        const newSet = new Set(prev);
        newSet.delete(toolId);
        return newSet;
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Wrench size={20} className="text-accent" />
        <h3 className="font-semibold">Инструменты агентов</h3>
        <Badge variant="secondary" className="ml-auto">
          {agentTools.length}
        </Badge>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {agentTools.map((tool, index) => {
          const isRunning = runningTools.has(tool.name);
          
          return (
            <div key={tool.name}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  {getToolIcon(tool.name)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{tool.displayName}</h4>
                    <Badge 
                      variant={isRunning ? "default" : "outline"} 
                      className="text-xs"
                    >
                      {isRunning ? "Выполняется" : "Готов"}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mb-2">
                    {tool.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(tool.parameters).slice(0, 3).map((param) => (
                        <Badge key={param} variant="secondary" className="text-xs">
                          {param}
                        </Badge>
                      ))}
                      {Object.keys(tool.parameters).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{Object.keys(tool.parameters).length - 3}
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => runTool(tool)}
                      disabled={isRunning}
                      className="h-6 px-2"
                    >
                      {isRunning ? (
                        <Stop size={12} />
                      ) : (
                        <Play size={12} />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              
              {index < agentTools.length - 1 && (
                <Separator className="mt-3" />
              )}
            </div>
          );
        })}
      </div>

      <Separator className="my-4" />
      
      <div className="text-xs text-muted-foreground">
        <p className="mb-2">Возможности системы:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Анализ и обработка файлов</li>
          <li>Генерация кода с помощью ИИ</li>
          <li>Семантический поиск по проектам</li>
          <li>Автоматическая индексация проектов</li>
          <li>Веб-скрапинг и API интеграции</li>
          <li>Работа с базами данных</li>
          <li>Управление файловой системой</li>
          <li>Выполнение команд терминала</li>
        </ul>
      </div>
    </Card>
  );
}