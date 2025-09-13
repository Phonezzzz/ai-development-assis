import { useState, useCallback, useEffect } from 'react';
import { useKV } from '@github/spark/hooks';
import { ModelOption } from '@/lib/types';
import { openRouterService, Model } from '@/lib/services/openrouter';

export function useModelSelection() {
  const [selectedModel, setSelectedModel] = useKV<string>('selected-model', 'meta-llama/llama-3.1-8b-instruct:free');
  const [isSelecting, setIsSelecting] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadModels = useCallback(async () => {
    setIsLoading(true);
    try {
      const openRouterModels = await openRouterService.getModels();
      const modelOptions: ModelOption[] = openRouterModels.map((model: Model) => ({
        id: model.id,
        name: model.name,
        provider: model.provider,
        description: `${formatContextLength(model.contextLength)} • $${model.pricing.prompt}/$${model.pricing.completion}`,
        contextLength: model.contextLength,
        pricing: model.pricing,
        free: model.pricing.prompt === 0 && model.pricing.completion === 0
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
    if (id.includes('mistralai/')) return 'Mistral AI';
    if (id.includes('cohere/')) return 'Cohere';
    if (id.includes('deepseek/')) return 'DeepSeek';
    if (id.includes('qwen/')) return 'Qwen';
    if (id.includes('perplexity/')) return 'Perplexity';
    if (id.includes('nvidia/')) return 'NVIDIA';
    if (id.includes('microsoft/')) return 'Microsoft';
    if (id.includes('huggingfaceh4/')) return 'Hugging Face';
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
    if (!selectedModel || !availableModels.length) return undefined;
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