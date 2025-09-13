import { useState, useCallback, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import { Toaster } from '@/components/ui/sonner';
import { Button } from '@/components/ui/button';
import { ModeSelector } from '@/components/ModeSelector';
import { ChatHistory } from '@/components/ChatHistory';
import { PlanViewer } from '@/components/PlanViewer';
import { SettingsDialog } from '@/components/SettingsDialog';
import { SmartContextPanel } from '@/components/SmartContextPanel';
import { ChatMode } from '@/components/modes/ChatMode';
import { ImageCreatorMode } from '@/components/modes/ImageCreatorMode';
import { WorkspaceMode } from '@/components/modes/WorkspaceMode';
import { useAgentSystem } from '@/hooks/use-agent-system';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { useTTS } from '@/hooks/use-tts';
import { useSmartContext } from '@/hooks/use-smart-context';
import { OperatingMode, Message, AgentType, WorkMode } from '@/lib/types';
import { vectorService } from '@/lib/services/vector';
import { llmService } from '@/lib/services/llm';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { toast } from 'sonner';

function App() {
  // Use hooks inside a try-catch to prevent resolver issues
  const [currentMode, setCurrentMode] = useKV<OperatingMode>('current-mode', 'chat');
  const [messages, setMessages] = useKV<Message[]>('chat-messages', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [currentQuery, setCurrentQuery] = useState('');
  const [currentWorkMode, setCurrentWorkMode] = useState<WorkMode>('act');
  const [sidebarCollapsed, setSidebarCollapsed] = useKV<boolean>('sidebar-collapsed', false);
  
  // Memoize agent system and voice recognition to prevent unnecessary re-renders
  const agentSystem = useAgentSystem();
  const voiceRecognition = useVoiceRecognition();
  const { speak: ttsSpeak } = useTTS();
  const { addMessageToContext } = useSmartContext();

  const {
    agents,
    currentPlan,
    isWorking,
    currentAgent,
    createPlan,
    confirmPlan,
    executePlan,
    resetAllAgents,
  } = agentSystem;

  const { speak } = voiceRecognition;

  const createMessage = useCallback((content: string, type: 'user' | 'agent', agentType?: AgentType, isVoice?: boolean): Message => {
    return {
      id: `msg_${Date.now()}_${type}`,
      type,
      content,
      timestamp: new Date(),
      agentType,
      isVoice,
    };
  }, []);

  const handleSendMessage = useCallback(async (text: string, mode: WorkMode, isVoice?: boolean) => {
    if (!text.trim()) return;

    setCurrentQuery(text);
    setCurrentWorkMode(mode);
    setIsProcessing(true);

    const userMessage = createMessage(text, 'user', undefined, isVoice);
    setMessages((prev) => [...(prev || []), userMessage]);

    // Добавляем сообщение в умный контекст
    try {
      await addMessageToContext(userMessage);
    } catch (error) {
      console.error('Error adding message to smart context:', error);
    }

    // Store user message in vector database
    try {
      await vectorService.addDocument({
        id: userMessage.id,
        content: text,
        metadata: {
          type: 'user_message',
          timestamp: userMessage.timestamp.toISOString(),
          isVoice: isVoice || false,
          mode,
        },
      });
    } catch (error) {
      console.error('Error storing message in vector DB:', error);
    }

    try {
      if (mode === 'plan') {
        // ПЛАН режим - НИКАКИХ действий, только планирование и запрос подтверждения
        if (awaitingConfirmation && currentPlan) {
          // Уже есть план в ожидании - обрабатываем ответ пользователя
          if (text.toLowerCase().includes('да') || text.toLowerCase().includes('подтверждаю') || text.toLowerCase().includes('ок') || text.toLowerCase().includes('yes')) {
            handleConfirmPlan();
            const confirmationResponse = createMessage(
              'План подтверждён! Перейдите в режим "Действие" чтобы начать выполнение или дайте команду в режиме "Действие".',
              'agent',
              'planner'
            );
            setMessages((prev) => [...(prev || []), confirmationResponse]);
            setAwaitingConfirmation(false);
            
            if (isVoice) {
              ttsSpeak(confirmationResponse.content);
            }
            
            toast.success('План подтверждён! Готов к выполнению.');
          } else {
            // Пользователь хочет изменить план
            setAwaitingConfirmation(false);
            const plan = await createPlan(text);
            
            const plannerResponse = createMessage(
              `Я обновил план согласно вашим пожеланиям. Новый план включает ${plan.steps.length} шагов:\n\n${plan.steps.map((step, i) => `${i + 1}. ${step.description}`).join('\n')}\n\nВсё правильно? Подтверждаете план? (Скажите "да" для подтверждения)`,
              'agent',
              'planner'
            );

            setMessages((prev) => [...(prev || []), plannerResponse]);
            setAwaitingConfirmation(true);
            
            if (isVoice) {
              ttsSpeak(plannerResponse.content);
            }
            
            toast.success('План обновлён');
          }
        } else {
          // Создаём новый план
          const plan = await createPlan(text);
          
          const plannerResponse = createMessage(
            `✅ План создан:\n\n📋 **${plan.title}**\n${plan.description}\n\n**Шаги выполнения:**\n${plan.steps.map((step, i) => `${i + 1}. ${step.description} (${step.agentType})`).join('\n')}\n\n⚠️ **Внимание**: Это только план! Никаких действий не предпринимается.\n\n❓ **Подтверждаете план?** Скажите "да" для подтверждения или объясните что нужно изменить.`,
            'agent',
            'planner'
          );

          setMessages((prev) => [...(prev || []), plannerResponse]);
          setAwaitingConfirmation(true);
          
          // Store planner response in vector database
          try {
            await vectorService.addDocument({
              id: plannerResponse.id,
              content: plannerResponse.content,
              metadata: {
                type: 'agent_message',
                agentType: 'planner',
                timestamp: plannerResponse.timestamp.toISOString(),
                isVoice: isVoice || false,
              },
            });
          } catch (error) {
            console.error('Error storing agent message in vector DB:', error);
          }
          
          if (isVoice) {
            ttsSpeak(plannerResponse.content);
          }
          
          toast.success('План создан - ожидает подтверждения');
        }
        
      } else if (mode === 'act') {
        // ДЕЙСТВИЕ режим - выполняем план или создаём и сразу выполняем
        if (currentPlan && currentPlan.status === 'confirmed') {
          // Есть подтверждённый план - выполняем его
          const agentMessages = await executePlan();
          setMessages((prev) => [...(prev || []), ...agentMessages]);
          
          agentMessages.forEach((message, index) => {
            setTimeout(() => {
              ttsSpeak(message.content);
            }, index * 1000);
          });
          
          toast.success('План выполнен!');
        } else {
          // Нет подтверждённого плана - создаём и сразу выполняем
          const executionStart = createMessage(
            'Создаю план и сразу выполняю задачу...',
            'agent',
            'planner'
          );
          setMessages((prev) => [...(prev || []), executionStart]);
          
          const plan = await createPlan(text);
          confirmPlan();
          
          const agentMessages = await executePlan();
          setMessages((prev) => [...(prev || []), ...agentMessages]);
          
          agentMessages.forEach((message, index) => {
            setTimeout(() => {
              ttsSpeak(message.content);
            }, index * 1500);
          });
          
          toast.success('Задача выполнена!');
        }
        
      } else if (mode === 'ask') {
        // ASK режим - прямой вопрос к ИИ без планирования
        const llmResponse = await llmService.askQuestion(text);
        
        const assistantMessage = createMessage(
          llmResponse,
          'agent'
        );
        
        setMessages((prev) => [...(prev || []), assistantMessage]);
        
        // Store assistant response in vector database
        try {
          await vectorService.addDocument({
            id: assistantMessage.id,
            content: assistantMessage.content,
            metadata: {
              type: 'agent_message',
              timestamp: assistantMessage.timestamp.toISOString(),
              isVoice: isVoice || false,
              mode: 'ask',
            },
          });
        } catch (error) {
          console.error('Error storing assistant message in vector DB:', error);
        }
        
        if (isVoice) {
          ttsSpeak(llmResponse);
        }
        
        toast.success('Ответ получен!');
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Ошибка при обработке сообщения');
    } finally {
      setIsProcessing(false);
    }
  }, [setMessages, createPlan, speak, createMessage, awaitingConfirmation, currentPlan, confirmPlan, executePlan, addMessageToContext]);

  const handleConfirmPlan = useCallback(() => {
    confirmPlan();
    toast.success('План подтвержден! Готов к выполнению.');
  }, [confirmPlan]);

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
                
                {currentPlan && (
                  <PlanViewer
                    plan={currentPlan}
                    onConfirmPlan={handleConfirmPlan}
                    onExecutePlan={() => {}}
                    isExecuting={isWorking}
                  />
                )}

                {/* Умный контекст */}
                {currentQuery && (
                  <SmartContextPanel
                    query={currentQuery}
                    mode={currentWorkMode}
                    onSuggestionClick={(suggestion) => {
                      // TODO: Добавить обработку клика по предложению
                      console.log('Suggestion clicked:', suggestion);
                    }}
                    className="mt-4"
                  />
                )}
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
            background: 'rgba(39, 39, 42, 0.9)',
            color: 'oklch(0.9 0.05 280)',
            border: '1px solid oklch(0.3 0.05 245)',
            backdropFilter: 'blur(8px)',
          },
        }}
      />
    </div>
  );
}

export default App;