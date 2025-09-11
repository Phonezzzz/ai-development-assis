import { useState, useCallback } from 'react';
import { useKV } from '@github/spark/hooks';
import { ModelOption } from '@/lib/types';

const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Самая мощная модель OpenAI'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Быстрая и эффективная модель'
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Высокая производительность от Anthropic'
  },
  {
    id: 'mistral-large',
    name: 'Mistral Large',
    provider: 'Mistral AI',
    description: 'Мощная европейская модель'
  },
  {
    id: 'llama-3-70b-instruct',
    name: 'Llama 3 70B',
    provider: 'Meta',
    description: 'Открытая модель высокого качества'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Многомодальная модель Google'
  }
];

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useKV<string>('selected-model', 'gpt-4-turbo');
  const [isSelecting, setIsSelecting] = useState(false);

  const getModelById = useCallback((id: string) => {
    return AVAILABLE_MODELS.find(model => model.id === id);
  }, []);

  const getCurrentModel = useCallback(() => {
    return getModelById(selectedModel) || AVAILABLE_MODELS[0];
  }, [selectedModel, getModelById]);

  const selectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setIsSelecting(false);
  }, [setSelectedModel]);

  return {
    availableModels: AVAILABLE_MODELS,
    selectedModel,
    currentModel: getCurrentModel(),
    isSelecting,
    setIsSelecting,
    selectModel,
    getModelById,
  };
}