import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { agentTools } from '@/lib/services/agent-tools';
import { 
  FileCode, 
  MagnifyingGlass, 
  Lightning, 
  Tree,
  Wrench,
} from '@phosphor-icons/react';

const toolIcons: Record<string, any> = {
  'file_analysis': FileCode,
  'code_generator': Lightning,
  'search': MagnifyingGlass,
  'project_map': Tree,
};

export function AgentToolsDisplay() {
  const getToolIcon = (toolName: string) => {
    const IconComponent = toolIcons[toolName] || Wrench;
    return <IconComponent size={20} />;
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

      <div className="space-y-3">
        {agentTools.map((tool, index) => (
          <div key={tool.name}>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                {getToolIcon(tool.name)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm">{tool.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    Активен
                  </Badge>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {tool.description}
                </p>
                
                <div className="flex flex-wrap gap-1">
                  {Object.keys(tool.parameters).map((param) => (
                    <Badge key={param} variant="secondary" className="text-xs">
                      {param}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {index < agentTools.length - 1 && (
              <Separator className="mt-3" />
            )}
          </div>
        ))}
      </div>

      <Separator className="my-4" />
      
      <div className="text-xs text-muted-foreground">
        <p className="mb-2">Возможности:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Анализ файлов (код, текст, изображения)</li>
          <li>Генерация кода на любом языке</li>
          <li>Семантический поиск по истории</li>
          <li>Создание карты проекта</li>
        </ul>
      </div>
    </Card>
  );
}