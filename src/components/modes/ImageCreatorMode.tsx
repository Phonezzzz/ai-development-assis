import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ModernChatInput } from '@/components/ModernChatInput';
import { GeneratedImage, WorkMode } from '@/lib/types';
import { useKV } from '@github/spark/hooks';
import { formatDisplayDate } from '@/lib/utils';
import { imageGenerationService } from '@/lib/services/image-generation';
import { Image, Download, Trash, Plus, Robot } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface ImageCreatorModeProps {
  messages?: any[];
  onSendMessage?: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  isProcessing?: boolean;
}

export function ImageCreatorMode({ onSendMessage }: ImageCreatorModeProps) {
  const [prompt, setPrompt] = useState('');
  const [detailedPrompt, setDetailedPrompt] = useState('');
  const [images, setImages] = useKV<GeneratedImage[]>('generated-images', []);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workMode, setWorkMode] = useState<WorkMode>('plan');
  const [selectedModel, setSelectedModel] = useState('google/gemini-2.5-flash-image-preview');

  const imageModels = imageGenerationService.getImageModels();

  const generateImage = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    
    const newImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      prompt: prompt.trim(),
      url: '', // Will be set after generation
      timestamp: new Date(),
      isGenerating: true,
    };

    setImages((prev) => [newImage, ...(prev || [])]);

    try {
      // Generate image using the selected model
      const imageUrl = await imageGenerationService.generateImage({
        prompt: prompt.trim(),
        model: selectedModel,
        width: 512,
        height: 512,
      });

      // Update the image with the generated URL
      setImages((prev) => (prev || []).map(img => 
        img.id === newImage.id 
          ? { ...img, url: imageUrl, isGenerating: false }
          : img
      ));

      toast.success('Изображение сгенерировано!');
    } catch (error) {
      console.error('Error generating image:', error);
      // Remove failed image from list
      setImages((prev) => (prev || []).filter(img => img.id !== newImage.id));
      toast.error('Ошибка генерации изображения');
    } finally {
      setIsGenerating(false);
    }

    setPrompt('');
    setDetailedPrompt('');
  };

  const deleteImage = (imageId: string) => {
    setImages((prev) => (prev || []).filter(img => img.id !== imageId));
  };

  const downloadImage = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-screen">
      {/* Model Selector Header */}
      <div className="p-4 border-b bg-card/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Robot size={20} className="text-primary" />
            <span className="text-sm font-medium">Модель генерации:</span>
          </div>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Выберите модель" />
            </SelectTrigger>
            <SelectContent>
              {imageModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {imageModels.find(m => m.id === selectedModel)?.maxResolution || '512x512'}
          </Badge>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        {(images || []).length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🎨</div>
            <h3 className="font-semibold text-lg mb-2">Создайте первое изображение</h3>
            <p className="text-muted-foreground">
              Используйте окно ввода ниже для генерации ИИ-изображений для ваших проектов.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(images || []).map((image) => (
              <Card key={image.id} className="overflow-hidden">
                <div className="aspect-square relative">
                  {image.isGenerating ? (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-muted-foreground">Генерация...</p>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                  )}
                  
                  {!image.isGenerating && (
                    <div className="absolute top-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => downloadImage(image.url, `image-${image.id}.jpg`)}
                        className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                      >
                        <Download size={14} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => deleteImage(image.id)}
                        className="h-8 w-8 p-0 bg-black/50 hover:bg-black/70 text-white border-0"
                      >
                        <Trash size={14} />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="p-3">
                  <p className="text-sm font-medium line-clamp-2 mb-2">
                    {image.prompt}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      {formatDisplayDate(image.timestamp)}
                    </Badge>
                    {image.isGenerating && (
                      <Badge className="text-xs bg-accent text-accent-foreground">
                        Обработка
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Chat Input */}
      <div className="p-4 border-t bg-card/80 backdrop-blur-sm flex-shrink-0">
        <ModernChatInput
          onSubmit={(text, mode, isVoice) => {
            if (onSendMessage) {
              onSendMessage(text, mode, isVoice);
            } else {
              // Handle local image generation
              if (text.trim()) {
                generateImageFromPrompt(text);
              }
            }
          }}
          placeholder="Опишите изображение для генерации с помощью Gemini 2.5 Flash Image Preview..."
          disabled={isGenerating}
          workMode={workMode}
          setWorkMode={setWorkMode}
        />
      </div>
    </div>
  );

  function generateImageFromPrompt(promptText: string) {
    const newImage: GeneratedImage = {
      id: `img_${Date.now()}`,
      prompt: promptText.trim(),
      url: '', // Will be set after generation
      timestamp: new Date(),
      isGenerating: true,
    };

    setImages((prev) => [newImage, ...(prev || [])]);
    setIsGenerating(true);

    // Generate image using the service
    imageGenerationService.generateImage({
      prompt: promptText.trim(),
      model: selectedModel,
      width: 512,
      height: 512,
    }).then((imageUrl) => {
      setImages((prev) => (prev || []).map(img => 
        img.id === newImage.id 
          ? { ...img, url: imageUrl, isGenerating: false }
          : img
      ));
      toast.success('Изображение сгенерировано!');
    }).catch((error) => {
      console.error('Error generating image:', error);
      // Remove failed image from list
      setImages((prev) => (prev || []).filter(img => img.id !== newImage.id));
      toast.error('Ошибка генерации изображения');
    }).finally(() => {
      setIsGenerating(false);
    });
  }
}