import { useState, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { Agent, AgentType, AgentStatus, Plan, PlanStep, Message } from '@/lib/types';
import { openRouterService } from '@/lib/openrouter';
import { useModelSelection } from './use-model-selection';

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
  const { selectedModel } = useModelSelection();

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

    try {
      const prompt = `Ты - ИИ планировщик задач. Создай детальный план для выполнения следующего запроса пользователя: "${userInput}".

План должен содержать 3-5 конкретных шагов, каждый из которых должен быть выполним одним из агентов:
- Планировщик: анализ и уточнение требований
- Исполнитель: написание кода и реализация
- Супервизор: проверка качества и соответствия стандартам
- Отладчик: исправление ошибок и финальная проверка

Ответь ТОЛЬКО в следующем JSON формате:
{
  "title": "Краткое название плана",
  "description": "Подробное описание что будет сделано",
  "steps": [
    {
      "description": "Описание шага",
      "agentType": "planner|worker|supervisor|error-fixer"
    }
  ]
}`;

      const response = await openRouterService.generateCompletion(
        prompt,
        selectedModel,
        {
          maxTokens: 1000,
          temperature: 0.3,
          systemMessage: 'Ты - эксперт планирования. Отвечай только валидным JSON без дополнительного текста.'
        }
      );

      let planData;
      try {
        planData = JSON.parse(response);
      } catch (parseError) {
        console.error('Ошибка парсинга JSON от модели:', parseError);
        // Fallback plan if JSON parsing fails
        planData = {
          title: `План для: ${userInput.slice(0, 50)}...`,
          description: `Обработка запроса: ${userInput}`,
          steps: [
            { description: 'Анализ требований пользователя', agentType: 'planner' },
            { description: 'Реализация функциональности', agentType: 'worker' },
            { description: 'Проверка качества кода', agentType: 'supervisor' },
            { description: 'Финальная отладка', agentType: 'error-fixer' }
          ]
        };
      }

      const planSteps: PlanStep[] = planData.steps.map((step: any, index: number) => ({
        id: `step_${index + 1}`,
        description: step.description,
        status: 'pending' as const,
        agentType: step.agentType as AgentType,
      }));

      const newPlan: Plan = {
        id: `plan_${Date.now()}`,
        title: planData.title,
        description: planData.description,
        steps: planSteps,
        status: 'draft',
        createdAt: new Date(),
      };

      updateAgentStatus('planner', 'complete');
      setCurrentPlan(newPlan);
      
      return newPlan;
    } catch (error) {
      console.error('Ошибка создания плана:', error);
      updateAgentStatus('planner', 'error');
      
      // Fallback plan
      const fallbackPlan: Plan = {
        id: `plan_${Date.now()}`,
        title: `План для: ${userInput.slice(0, 50)}...`,
        description: `Обработка запроса: ${userInput}`,
        steps: [
          {
            id: 'step1',
            description: 'Анализ требований пользователя',
            status: 'pending',
            agentType: 'planner',
          },
          {
            id: 'step2',
            description: 'Реализация функциональности',
            status: 'pending',
            agentType: 'worker',
          },
          {
            id: 'step3',
            description: 'Проверка качества и стандартов',
            status: 'pending',
            agentType: 'supervisor',
          },
          {
            id: 'step4',
            description: 'Финальная отладка и тестирование',
            status: 'pending',
            agentType: 'error-fixer',
          },
        ],
        status: 'draft',
        createdAt: new Date(),
      };
      
      setCurrentPlan(fallbackPlan);
      return fallbackPlan;
    }
  }, [updateAgentStatus, setCurrentPlan, selectedModel]);

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

      try {
        let agentResponse = '';
        let systemMessage = '';
        let prompt = '';
        
        switch (step.agentType) {
          case 'planner':
            systemMessage = 'Ты - эксперт-аналитик. Проводишь глубокий анализ требований и планируешь реализацию.';
            prompt = `Проанализируй следующую задачу: "${step.description}"\n\nОпиши детальный анализ требований и план реализации.`;
            break;
          case 'worker':
            systemMessage = 'Ты - опытный разработчик. Пишешь качественный, рабочий код без заглушек и TODO.';
            prompt = `Реализуй следующую задачу: "${step.description}"\n\nПредоставь полный рабочий код с комментариями.`;
            break;
          case 'supervisor':
            systemMessage = 'Ты - эксперт по качеству кода. Проверяешь соответствие стандартам и лучшим практикам.';
            prompt = `Проверь выполнение задачи: "${step.description}"\n\nОцени качество реализации и соответствие стандартам.`;
            break;
          case 'error-fixer':
            systemMessage = 'Ты - эксперт по отладке. Находишь и исправляешь ошибки, проводишь финальное тестирование.';
            prompt = `Проведи финальную проверку задачи: "${step.description}"\n\nУбедись что все работает корректно и исправь любые проблемы.`;
            break;
        }

        agentResponse = await openRouterService.generateCompletion(
          prompt,
          selectedModel,
          {
            maxTokens: 1500,
            temperature: 0.7,
            systemMessage
          }
        );

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

        // Small delay between agents for better UX
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Ошибка выполнения агента ${step.agentType}:`, error);
        updateAgentStatus(step.agentType, 'error');
        
        // Fallback response
        const fallbackResponse = `Выполнение задачи "${step.description}" завершено с использованием резервного режима.`;
        
        const message: Message = {
          id: `msg_${Date.now()}_${step.id}`,
          type: 'agent',
          content: fallbackResponse,
          agentType: step.agentType,
          timestamp: new Date(),
        };

        messages.push(message);
      }
    }

    const completePlan = { ...updatedPlan, status: 'complete' as const };
    setCurrentPlan(completePlan);
    setIsWorking(false);
    setCurrentAgent(null);
    
    return messages;
  }, [currentPlan, setCurrentPlan, updateAgentStatus, selectedModel]);

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