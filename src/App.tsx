import { useState, useCallback, useMemo } from 'react';
import { useKV } from '@github/spark/hooks';
import { Toaster } from '@/components/ui/sonner';
import { ModeSelector } from '@/components/ModeSelector';
import { AgentDisplay } from '@/components/AgentDisplay';
import { PlanViewer } from '@/components/PlanViewer';
import { ChatMode } from '@/components/modes/ChatMode';
import { ImageCreatorMode } from '@/components/modes/ImageCreatorMode';
import { WorkspaceMode } from '@/components/modes/WorkspaceMode';
import { useAgentSystem } from '@/hooks/use-agent-system';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { OperatingMode, Message } from '@/lib/types';
import { toast } from 'sonner';

function App() {
  // Use hooks inside a try-catch to prevent resolver issues
  const [currentMode, setCurrentMode] = useKV<OperatingMode>('current-mode', 'chat');
  const [messages, setMessages] = useKV<Message[]>('chat-messages', []);
  const [isProcessing, setIsProcessing] = useState(false);
  
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

  const handleSendMessage = useCallback(async (text: string, isVoice?: boolean) => {
    if (!text.trim()) return;

    setIsProcessing(true);

    const userMessage = createMessage(text, 'user', undefined, isVoice);
    setMessages((prev) => [...prev, userMessage]);

    try {
      if (text.toLowerCase().includes('plan') || text.toLowerCase().includes('create a plan')) {
        const plan = await createPlan(text);
        
        const plannerResponse = createMessage(
          `I've created a comprehensive plan for your request. The plan includes ${plan.steps.length} steps that will be handled by our agent system. Please review the plan and confirm if you'd like to proceed.`,
          'agent',
          'planner'
        );

        setMessages((prev) => [...prev, plannerResponse]);
        
        if (isVoice) {
          speak(plannerResponse.content);
        }
        
        toast.success('Plan created successfully');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const agentResponse = createMessage(
          `I understand your request: "${text}". I can help you with various tasks including planning, code generation, image creation, and workspace management. Would you like me to create a detailed plan for this task?`,
          'agent',
          'planner'
        );

        setMessages((prev) => [...prev, agentResponse]);
        
        if (isVoice) {
          speak(agentResponse.content);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast.error('Failed to process message');
    } finally {
      setIsProcessing(false);
    }
  }, [setMessages, createPlan, speak, createMessage]);

  const handleConfirmPlan = useCallback(() => {
    confirmPlan();
    toast.success('Plan confirmed! Ready to execute.');
  }, [confirmPlan]);

  const handleExecutePlan = useCallback(async () => {
    try {
      const agentMessages = await executePlan();
      setMessages((prev) => [...prev, ...agentMessages]);
      
      agentMessages.forEach((message, index) => {
        setTimeout(() => {
          speak(message.content);
        }, index * 1000);
      });
      
      toast.success('Plan executed successfully!');
    } catch (error) {
      console.error('Error executing plan:', error);
      toast.error('Failed to execute plan');
    }
  }, [executePlan, setMessages, speak]);

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
              <h1 className="text-xl font-bold">AI Agent Workspace</h1>
              <p className="text-sm text-muted-foreground">
                Intelligent development environment with voice capabilities
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
            <AgentDisplay
              agents={agents}
              currentAgent={currentAgent}
            />
            
            {currentPlan && (
              <PlanViewer
                plan={currentPlan}
                onConfirmPlan={handleConfirmPlan}
                onExecutePlan={handleExecutePlan}
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