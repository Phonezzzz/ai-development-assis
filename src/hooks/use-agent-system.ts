import { useState, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { Agent, AgentType, AgentStatus, Plan, PlanStep, Message } from '@/lib/types';

const AGENTS: Agent[] = [
  {
    id: 'planner',
    name: 'Planner',
    description: 'Creates detailed plans and clarifies requirements',
    status: 'idle',
    avatar: '🧠',
  },
  {
    id: 'worker',
    name: 'Worker', 
    description: 'Executes tasks and generates code',
    status: 'idle',
    avatar: '⚡',
  },
  {
    id: 'supervisor',
    name: 'Supervisor',
    description: 'Oversees quality and ensures standards',
    status: 'idle',
    avatar: '👁️',
  },
  {
    id: 'error-fixer',
    name: 'Error Fixer',
    description: 'Identifies and fixes issues',
    status: 'idle',
    avatar: '🔧',
  },
];

export function useAgentSystem() {
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [currentPlan, setCurrentPlan] = useKV<Plan | null>('agent-current-plan', null);
  const [plans, setPlans] = useKV<Plan[]>('agent-plans', []);
  const [isWorking, setIsWorking] = useState(false);
  const [currentAgent, setCurrentAgent] = useState<AgentType | null>(null);

  const updateAgentStatus = useCallback((agentId: AgentType, status: AgentStatus) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, status } : agent
    ));
  }, []);

  const resetAllAgents = useCallback(() => {
    setAgents(prev => prev.map(agent => ({ ...agent, status: 'idle' })));
    setCurrentAgent(null);
    setIsWorking(false);
  }, []);

  const createPlan = useCallback(async (userInput: string): Promise<Plan> => {
    updateAgentStatus('planner', 'thinking');
    setCurrentAgent('planner');

    await new Promise(resolve => setTimeout(resolve, 2000));

    const planSteps: PlanStep[] = [
      {
        id: 'step1',
        description: 'Analyze user requirements and context',
        status: 'pending',
        agentType: 'planner',
      },
      {
        id: 'step2', 
        description: 'Generate implementation code',
        status: 'pending',
        agentType: 'worker',
      },
      {
        id: 'step3',
        description: 'Review code quality and standards',
        status: 'pending',
        agentType: 'supervisor',
      },
      {
        id: 'step4',
        description: 'Fix any identified issues',
        status: 'pending',
        agentType: 'error-fixer',
      },
    ];

    const newPlan: Plan = {
      id: `plan_${Date.now()}`,
      title: `Plan for: ${userInput.slice(0, 50)}...`,
      description: `Comprehensive plan to address: ${userInput}`,
      steps: planSteps,
      status: 'draft',
      createdAt: new Date(),
    };

    updateAgentStatus('planner', 'complete');
    setCurrentPlan(newPlan);
    
    return newPlan;
  }, [updateAgentStatus, setCurrentPlan]);

  const confirmPlan = useCallback(() => {
    if (!currentPlan) return;
    
    const confirmedPlan = { ...currentPlan, status: 'confirmed' as const };
    setCurrentPlan(confirmedPlan);
    setPlans(prev => [...prev, confirmedPlan]);
  }, [currentPlan, setCurrentPlan, setPlans]);

  const executePlan = useCallback(async (): Promise<Message[]> => {
    if (!currentPlan || currentPlan.status !== 'confirmed') return [];

    setIsWorking(true);
    const messages: Message[] = [];
    const updatedPlan = { ...currentPlan, status: 'executing' as const };
    setCurrentPlan(updatedPlan);

    for (const step of currentPlan.steps) {
      updateAgentStatus(step.agentType, 'active');
      setCurrentAgent(step.agentType);

      await new Promise(resolve => setTimeout(resolve, 3000));

      let agentResponse = '';
      
      switch (step.agentType) {
        case 'planner':
          agentResponse = 'Requirements analyzed. Implementation plan validated.';
          break;
        case 'worker':
          agentResponse = '```typescript\n// Generated implementation code\nfunction implementFeature() {\n  console.log("Feature implemented successfully");\n  return { success: true };\n}\n```';
          break;
        case 'supervisor':
          agentResponse = 'Code review complete. Quality standards met. No issues found.';
          break;
        case 'error-fixer':
          agentResponse = 'Final validation complete. All systems operational.';
          break;
      }

      const message: Message = {
        id: `msg_${Date.now()}_${step.id}`,
        type: 'agent',
        content: agentResponse,
        agentType: step.agentType,
        timestamp: new Date(),
      };

      messages.push(message);
      updateAgentStatus(step.agentType, 'complete');

      const updatedStep = { ...step, status: 'complete' as const, result: agentResponse };
      const updatedSteps = updatedPlan.steps.map(s => s.id === step.id ? updatedStep : s);
      const finalPlan = { ...updatedPlan, steps: updatedSteps };
      setCurrentPlan(finalPlan);
    }

    const completePlan = { ...updatedPlan, status: 'complete' as const };
    setCurrentPlan(completePlan);
    setIsWorking(false);
    setCurrentAgent(null);
    
    return messages;
  }, [currentPlan, setCurrentPlan, updateAgentStatus]);

  const getAgentByType = useCallback((type: AgentType) => {
    return agents.find(agent => agent.id === type);
  }, [agents]);

  return {
    agents,
    currentPlan,
    plans,
    isWorking,
    currentAgent,
    createPlan,
    confirmPlan,
    executePlan,
    resetAllAgents,
    updateAgentStatus,
    getAgentByType,
  };
}