import { useState, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { Agent, AgentType, AgentStatus, Plan, PlanStep, Message } from '@/lib/types';

const AGENTS: Agent[] = [
  {
    id: 'planner',
    name: 'Планировщик',
    description: 'Создает детальные планы и уточняет требования',
    status: 'idle',
    avatar: '🧠',
  },
  {
    id: 'worker',
    name: 'Исполнитель', 
    description: 'Выполняет задачи и генерирует код',
    status: 'idle',
    avatar: '⚡',
  },
  {
    id: 'supervisor',
    name: 'Супервизор',
    description: 'Контролирует качество и соблюдение стандартов',
    status: 'idle',
    avatar: '👁️',
  },
  {
    id: 'error-fixer',
    name: 'Отладчик',
    description: 'Находит и исправляет ошибки',
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
    setAgents((prev) => prev.map(agent => 
      agent.id === agentId ? { ...agent, status } : agent
    ));
  }, []);

  const resetAllAgents = useCallback(() => {
    setAgents((prev) => prev.map(agent => ({ ...agent, status: 'idle' })));
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
        description: 'Проанализировать требования пользователя и контекст',
        status: 'pending',
        agentType: 'planner',
      },
      {
        id: 'step2', 
        description: 'Сгенерировать код реализации',
        status: 'pending',
        agentType: 'worker',
      },
      {
        id: 'step3',
        description: 'Проверить качество кода и соответствие стандартам',
        status: 'pending',
        agentType: 'supervisor',
      },
      {
        id: 'step4',
        description: 'Исправить выявленные проблемы',
        status: 'pending',
        agentType: 'error-fixer',
      },
    ];

    const newPlan: Plan = {
      id: `plan_${Date.now()}`,
      title: `План для: ${userInput.slice(0, 50)}...`,
      description: `Комплексный план для выполнения: ${userInput}`,
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
    setPlans((prev) => [...prev, confirmedPlan]);
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
          agentResponse = 'Требования проанализированы. План реализации проверен и готов к выполнению.';
          break;
        case 'worker':
          agentResponse = '```typescript\n// Сгенерированный код реализации\nfunction implementFeature() {\n  console.log("Функция успешно реализована");\n  return { success: true };\n}\n```';
          break;
        case 'supervisor':
          agentResponse = 'Проверка кода завершена. Стандарты качества соблюдены. Проблем не выявлено.';
          break;
        case 'error-fixer':
          agentResponse = 'Финальная проверка завершена. Все системы работают корректно.';
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