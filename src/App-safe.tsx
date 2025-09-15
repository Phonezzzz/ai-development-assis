import { useState, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ModeSelector } from '@/components/ModeSelector';
import { OperatingMode, Message, WorkMode } from '@/lib/types';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

function App() {
  // Simple state management without complex hooks
  const [currentMode, setCurrentMode] = useKV<OperatingMode>('current-mode', 'chat');
  const [messages, setMessages] = useKV<Message[]>('chat-messages', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useKV<boolean>('sidebar-collapsed', false);

  const handleSendMessage = useCallback(async (text: string, mode: WorkMode, isVoice?: boolean) => {
    if (!text.trim()) return;

    setIsProcessing(true);

    const userMessage: Message = {
      id: `msg_${Date.now()}_user`,
      type: 'user',
      content: text,
      timestamp: new Date(),
      isVoice,
    };

    setMessages((prev) => [...(prev || []), userMessage]);

    try {
      // Simple response without complex agent system
      const responseMessage: Message = {
        id: `msg_${Date.now()}_agent`,
        type: 'agent',
        content: `Получено сообщение в режиме "${mode}": ${text}`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...(prev || []), responseMessage]);
      toast.success('Сообщение обработано');
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Ошибка при обработке сообщения');
    } finally {
      setIsProcessing(false);
    }
  }, [setMessages]);

  const handleClearHistory = useCallback(() => {
    setMessages([]);
    toast.success('История чата очищена');
  }, [setMessages]);

  return (
    <div className="h-screen w-screen text-foreground flex flex-col relative bg-transparent">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm p-4 relative z-10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h1 className="text-xl font-bold">Рабочее пространство ИИ агентов</h1>
              <p className="text-sm text-muted-foreground">
                Интеллектуальная среда разработки с голосовыми возможностями
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ModeSelector
              currentMode={currentMode || 'chat'}
              onModeChange={setCurrentMode}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className={`${sidebarCollapsed ? 'w-0' : 'w-80'} transition-all duration-300 border-r bg-card/80 backdrop-blur-sm flex flex-col relative z-10 flex-shrink-0 overflow-hidden`}>
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {!sidebarCollapsed && (
              <div>
                <h3 className="text-lg font-semibold mb-4">История чата</h3>
                <div className="space-y-2">
                  {(messages || []).map((message) => (
                    <div key={message.id} className="p-2 bg-muted/50 rounded text-sm">
                      <div className="font-medium">
                        {message.type === 'user' ? '👤 Пользователь' : '🤖 Агент'}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
                <Button 
                  onClick={handleClearHistory} 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4"
                >
                  Очистить историю
                </Button>
              </div>
            )}
          </div>
        </aside>

        {/* Sidebar Toggle Button */}
        <div className="flex flex-col justify-center relative z-10">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-l-none border-l-0 h-12 w-6 p-0 border-border hover:border-accent"
          >
            {sidebarCollapsed ? (
              <CaretRight size={16} />
            ) : (
              <CaretLeft size={16} />
            )}
          </Button>
        </div>

        {/* Main View */}
        <main className="flex-1 min-w-0 bg-transparent relative z-10 flex flex-col">
          <div className="flex-1 flex flex-col p-4">
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="space-y-4">
                {(messages || []).map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary/20 ml-auto max-w-[70%]'
                        : 'bg-card/60 mr-auto max-w-[70%]'
                    }`}
                  >
                    <div className="text-sm text-muted-foreground mb-1">
                      {message.type === 'user' ? '👤 Вы' : '🤖 Агент'}
                    </div>
                    <div>{message.content}</div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="bg-card/60 mr-auto max-w-[70%] p-4 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">🤖 Агент</div>
                    <div className="flex items-center gap-1">
                      <span>Обрабатываю...</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-100"></div>
                        <div className="w-2 h-2 bg-accent rounded-full animate-pulse delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Simple Input */}
            <div className="border-t bg-card/80 p-4 rounded-lg">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Введите сообщение..."
                  className="flex-1 bg-background border border-input rounded-md px-3 py-2"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isProcessing) {
                      const input = e.target as HTMLInputElement;
                      handleSendMessage(input.value, 'ask');
                      input.value = '';
                    }
                  }}
                />
                <Button 
                  onClick={() => {
                    const input = document.querySelector('input') as HTMLInputElement;
                    if (input?.value && !isProcessing) {
                      handleSendMessage(input.value, 'ask');
                      input.value = '';
                    }
                  }}
                  disabled={isProcessing}
                >
                  Отправить
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 15, 35, 0.9)',
            color: 'oklch(0.9 0.05 290)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
    </div>
  );
}

export default App;