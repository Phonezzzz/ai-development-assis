import { useState, useCallback, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { ModelOption } from '@/lib/types';
import { openRouterService, OpenRouterModel } from '@/lib/openrouter';

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useKV<string>('selected-model', 'meta-llama/llama-3.1-8b-instruct:free');
  const [isSelecting, setIsSelecting] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const openRouterModels = await openRouterService.getModels();
      const modelOptions: ModelOption[] = openRouterModels.map((model: OpenRouterModel) => ({
        id: model.id,
        name: model.name,
        provider: getProviderFromId(model.id),
        description: `${formatContextLength(model.context_length)} • $${model.pricing.prompt}/$${model.pricing.completion}`,
        contextLength: model.context_length,
        pricing: model.pricing,
        free: model.pricing.prompt === '0' && model.pricing.completion === '0'
      }));
      
      // Sort models: free first, then by provider
      modelOptions.sort((a, b) => {
        if (a.free && !b.free) return -1;
        if (!a.free && b.free) return 1;
        return a.provider.localeCompare(b.provider);
      });
      
      setAvailableModels(modelOptions);
    } catch (error) {
      console.error('Ошибка загрузки моделей:', error);
      // Fallback to basic models if loading fails
      setAvailableModels([
        {
          id: 'meta-llama/llama-3.1-8b-instruct:free',
          name: 'Llama 3.1 8B (Free)',
          provider: 'Meta',
          description: 'Бесплатная модель',
          free: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const getProviderFromId = (id: string): string => {
    if (id.includes('openai/')) return 'OpenAI';
    if (id.includes('anthropic/')) return 'Anthropic';
    if (id.includes('meta-llama/')) return 'Meta';
    if (id.includes('google/')) return 'Google';
    if (id.includes('mistral/')) return 'Mistral AI';
    if (id.includes('cohere/')) return 'Cohere';
    return 'Other';
  };

  const formatContextLength = (length: number): string => {
    if (length >= 1000000) return `${(length / 1000000).toFixed(1)}M tokens`;
    if (length >= 1000) return `${(length / 1000).toFixed(0)}K tokens`;
    return `${length} tokens`;
  };

  const getModelById = useCallback((id: string) => {
    return availableModels.find(model => model.id === id);
  }, [availableModels]);

  const getCurrentModel = useCallback(() => {
    return getModelById(selectedModel) || availableModels[0];
  }, [selectedModel, getModelById, availableModels]);

  const selectModel = useCallback((modelId: string) => {
    setSelectedModel(modelId);
    setIsSelecting(false);
  }, [setSelectedModel]);

  const isConfigured = openRouterService.isConfigured();

  return {
    availableModels,
    selectedModel,
    currentModel: getCurrentModel(),
    isSelecting,
    setIsSelecting,
    selectModel,
    getModelById,
    isLoading,
    isConfigured,
    refreshModels: loadModels,
  };
}