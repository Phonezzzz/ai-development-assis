import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Settings, ExternalLink } from '@phosphor-icons/react';
import { openRouterService } from '@/lib/openrouter';

export function ApiConfigurationWarning() {
  const isConfigured = openRouterService.isConfigured();

  if (isConfigured) {
    return null;
  }

  return (
    <Card className="border-yellow-500/20 bg-yellow-500/5 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-yellow-200">Демо режим</h4>
            <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-300">
              Без API
            </Badge>
          </div>
          
          <p className="text-sm text-yellow-200/80">
            Приложение работает в демонстрационном режиме с симулированными ответами. 
            Чтобы использовать реальные модели ИИ, настройте OpenRouter API.
          </p>
          
          <div className="space-y-2 text-xs text-yellow-200/70">
            <p>Для настройки:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Скопируйте <code className="bg-yellow-500/20 px-1 rounded">.env.example</code> в <code className="bg-yellow-500/20 px-1 rounded">.env</code></li>
              <li>Получите API ключ на <a href="https://openrouter.ai" target="_blank" rel="noopener noreferrer" className="text-yellow-300 hover:underline inline-flex items-center gap-1">openrouter.ai <ExternalLink className="h-3 w-3" /></a></li>
              <li>Добавьте ключ в переменную <code className="bg-yellow-500/20 px-1 rounded">VITE_OPENROUTER_API_KEY</code></li>
              <li>Перезапустите приложение</li>
            </ol>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://openrouter.ai', '_blank')}
              className="text-yellow-200 border-yellow-500/30 hover:bg-yellow-500/10"
            >
              <Settings className="h-4 w-4 mr-1" />
              Получить API ключ
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-yellow-200 hover:bg-yellow-500/10"
            >
              Проверить снова
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}