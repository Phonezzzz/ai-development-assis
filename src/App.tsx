import { useState, useCallback, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import { Toaster } from '@/components/ui/sonner';
import { ModeSelector } from '@/components/ModeSelector';
import { ChatHistory } from '@/components/ChatHistory';
import { PlanViewer } from '@/components/PlanViewer';
import { ApiConfigurationWarning } from '@/components/ApiConfigurationWarning';
import { ChatMode } from '@/components/modes/ChatMode';
import { ImageCreatorMode } from '@/components/modes/ImageCreatorMode';
import { WorkspaceMode } from '@/components/modes/WorkspaceMode';
import { useAgentSystem } from '@/hooks/use-agent-system';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { OperatingMode, Message, AgentType, WorkMode } from '@/lib/types';
import { vectorService } from '@/lib/services/vector';
import { toast } from 'sonner';

function App() {
  // Use hooks inside a try-catch to prevent resolver issues
  const [currentMode, setCurrentMode] = useKV<OperatingMode>('current-mode', 'chat');
  const [messages, setMessages] = useKV<Message[]>('chat-messages', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  
  // Memoize agent system and voice recognition to prevent unnecessary re-renders
  const agentSystem = useAgentSystem();
  const voiceRecognition = useVoiceRecognition();

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

    setIsProcessing(true);

    const userMessage = createMessage(text, 'user', undefined, isVoice);
    setMessages((prev) => [...prev, userMessage]);

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
        // Plan mode - create plan and ask for confirmation
        const plan = await createPlan(text);
        
        const plannerResponse = createMessage(
          `Я создал подробный план для вашего запроса. План включает ${plan.steps.length} шагов:\n\n${plan.steps.map((step, i) => `${i + 1}. ${step.description}`).join('\n')}\n\nВы хотите выполнить этот план? Скажите "да" чтобы продолжить или "нет" чтобы изменить план.`,
          'agent',
          'planner'
        );

        setMessages((prev) => [...prev, plannerResponse]);
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
          speak(plannerResponse.content);
        }
        
        toast.success('План создан успешно');
      } else if (mode === 'act') {
        // Act mode - execute directly or confirm pending plan
        if (awaitingConfirmation && currentPlan) {
          if (text.toLowerCase().includes('да') || text.toLowerCase().includes('yes')) {
            handleConfirmPlan();
            await handleExecutePlan();
            setAwaitingConfirmation(false);
          } else {
            const response = createMessage(
              'Хорошо, давайте изменим план. Опишите что именно вы хотели бы изменить.',
              'agent',
              'planner'
            );
            setMessages((prev) => [...prev, response]);
            if (isVoice) speak(response.content);
            setAwaitingConfirmation(false);
          }
        } else {
          // Direct execution - create plan and execute immediately
          const plan = await createPlan(text);
          confirmPlan();
          
          const agentMessages = await executePlan();
          setMessages((prev) => [...prev, ...agentMessages]);
          
          agentMessages.forEach((message, index) => {
            setTimeout(() => {
              speak(message.content);
            }, index * 1000);
          });
          
          toast.success('Задача выполнена!');
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Ошибка при обработке сообщения');
    } finally {
      setIsProcessing(false);
    }
  }, [setMessages, createPlan, speak, createMessage, awaitingConfirmation, currentPlan, confirmPlan, executePlan]);

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
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
        );
      case 'image-creator':
        return <ImageCreatorMode />;
      case 'workspace':
        return <WorkspaceMode />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card p-4">
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
          
          <ModeSelector
            currentMode={currentMode}
            onModeChange={setCurrentMode}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="w-80 border-r bg-card flex flex-col">
          <div className="p-4 space-y-4">
            <ApiConfigurationWarning />
            
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
          </div>
        </aside>

        {/* Main View */}
        <main className="flex-1 min-w-0">
          {renderMode()}
        </main>
      </div>

      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'oklch(0.25 0.05 245)',
            color: 'oklch(0.9 0.05 280)',
            border: '1px solid oklch(0.3 0.05 245)',
          },
        }}
      />
    </div>
  );
}

export default App;