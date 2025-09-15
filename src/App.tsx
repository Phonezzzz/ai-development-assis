import { useState, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ModeSelector } from '@/components/ModeSelector';
import { ChatHistory } from '@/components/ChatHistory';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ChatMode } from '@/components/modes/ChatMode';
import { ImageCreatorMode } from '@/components/modes/ImageCreatorMode';
import { WorkspaceMode } from '@/components/modes/WorkspaceMode';
import { useTTS } from '@/hooks/use-tts';
import { OperatingMode, Message, AgentType, WorkMode } from '@/lib/types';
import { llmService } from '@/lib/services/llm';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

function App() {
  const [currentMode, setCurrentMode] = useKV<OperatingMode>('current-mode', 'chat');
  const [messages, setMessages] = useKV<Message[]>('chat-messages', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentWorkMode, setCurrentWorkMode] = useState<WorkMode>('act');
  const [sidebarCollapsed, setSidebarCollapsed] = useKV<boolean>('sidebar-collapsed', false);
  
  const { speak: ttsSpeak } = useTTS();

  const createMessage = useCallback((content: string, type: 'user' | 'agent', agentType?: AgentType, isVoice?: boolean): Message => {
    return {
      id: `msg_${Date.now()}_${Math.random()}`,
      type,
      content,
      timestamp: new Date(),
      agentType,
      isVoice,
    };
  }, []);

  const handleSendMessage = useCallback(async (text: string, mode: WorkMode, isVoice?: boolean) => {
    if (!text.trim() || isProcessing) return;

    setCurrentQuery(text);
    setCurrentWorkMode(mode);
    setIsProcessing(true);

    try {
      const userMessage = createMessage(text, 'user', undefined, isVoice);
      setMessages((prev) => [...(prev || []), userMessage]);

      if (mode === 'ask') {
        const llmResponse = await llmService.askQuestion(text);
        const assistantMessage = createMessage(llmResponse, 'agent');
        setMessages((prev) => [...(prev || []), assistantMessage]);
        
        if (isVoice) {
          ttsSpeak(llmResponse);
        }
        toast.success('Ответ получен!');
        
      } else {
        // For plan and act modes - simple responses for now
        const responseText = mode === 'plan' ? 
          'План создан. В данный момент система настраивается.' :
          'Действие выполнено. Система в процессе настройки.';
        
        const agentMessage = createMessage(responseText, 'agent', 'planner');
        setMessages((prev) => [...(prev || []), agentMessage]);
        
        if (isVoice) {
          ttsSpeak(responseText);
        }
        toast.success('Готово!');
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Ошибка при обработке сообщения');
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, createMessage, setMessages, ttsSpeak]);

  const handleClearHistory = useCallback(() => {
    setMessages([]);
    toast.success('История чата очищена');
  }, [setMessages]);

  const renderMode = () => {
    switch (currentMode) {
      case 'chat':
        return (
          <ChatMode
            messages={messages || []}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        );
      case 'image-creator':
        return (
          <ImageCreatorMode
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        );
      case 'workspace':
        return (
          <WorkspaceMode
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        );
      default:
        return null;
    }
  };

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
            <SettingsDialog />
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
              <>
                <ChatHistory
                  messages={messages || []}
                  onClearHistory={handleClearHistory}
                />
              </>
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
          {renderMode()}
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