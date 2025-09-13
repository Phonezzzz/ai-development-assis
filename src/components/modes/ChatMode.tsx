import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ModernChatInput } from '@/components/ModernChatInput';
import { Message, AgentType, WorkMode } from '@/lib/types';
import { cn, formatTimestamp } from '@/lib/utils';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { ttsService } from '@/lib/services/tts';
import { SpeakerHigh, Copy, Check } from '@phosphor-icons/react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ChatModeProps {
  messages: Message[];
  onSendMessage: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  isProcessing: boolean;
}

export function ChatMode({ messages, onSendMessage, isProcessing }: ChatModeProps) {
  const { speak } = useVoiceRecognition();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const getAgentInfo = (agentType: AgentType) => {
    const agentMap = {
      planner: { name: 'Планировщик', avatar: '🧠', color: 'bg-blue-500' },
      worker: { name: 'Исполнитель', avatar: '⚡', color: 'bg-green-500' },
      supervisor: { name: 'Супервизор', avatar: '👁️', color: 'bg-purple-500' },
      'error-fixer': { name: 'Отладчик', avatar: '🔧', color: 'bg-red-500' },
    };
    return agentMap[agentType] || { name: 'Ассистент', avatar: '🤖', color: 'bg-gray-500' };
  };

  const speakMessage = async (text: string, messageId: string) => {
    try {
      setSpeakingMessageId(messageId);
      await ttsService.speak(text);
      toast.success('Сообщение воспроизведено');
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback to browser speech
      try {
        await speak(text);
      } catch (fallbackError) {
        toast.error('Ошибка воспроизведения речи');
      }
    } finally {
      setSpeakingMessageId(null);
    }
  };

  const copyMessage = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      toast.success('Сообщение скопировано');
      
      // Reset copy indicator after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Copy Error:', error);
      toast.error('Ошибка копирования');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="font-semibold text-lg mb-2">Начните беседу</h3>
            <p className="text-muted-foreground">
              Общайтесь с системой ИИ агентов. Вы можете использовать голосовой ввод или печатать сообщения.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3",
                  message.type === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.type === 'agent' && (
                  <Avatar className="w-8 h-8 bg-card border">
                    <div className="text-lg">
                      {getAgentInfo(message.agentType!).avatar}
                    </div>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "max-w-[70%] space-y-1",
                    message.type === 'user' ? "items-end" : "items-start"
                  )}
                >
                  {message.type === 'agent' && (
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getAgentInfo(message.agentType!).color, "text-white")}
                      >
                        {getAgentInfo(message.agentType!).name}
                      </Badge>
                      {message.isVoice && (
                        <Badge variant="outline" className="text-xs">
                          Голос
                        </Badge>
                      )}
                    </div>
                  )}

                  <Card
                    className={cn(
                      "p-3",
                      message.type === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-card"
                    )}
                  >
                    <div className="mb-2">
                      {message.content.includes('```') ? (
                        <pre className="syntax-highlight whitespace-pre-wrap overflow-x-auto">
                          {message.content}
                        </pre>
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-xs opacity-70">
                        {formatTimestamp(message.timestamp)}
                      </div>
                      
                      {message.type === 'agent' && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(message.content, message.id)}
                            className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                            title="Скопировать сообщение"
                          >
                            {copiedMessageId === message.id ? (
                              <Check size={12} className="text-green-500" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => speakMessage(message.content, message.id)}
                            disabled={speakingMessageId === message.id}
                            className={cn(
                              "h-6 w-6 p-0 opacity-50 hover:opacity-100",
                              speakingMessageId === message.id && "opacity-100 text-accent"
                            )}
                            title="Воспроизвести сообщение"
                          >
                            <SpeakerHigh size={12} />
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>

                {message.type === 'user' && (
                  <Avatar className="w-8 h-8 bg-primary text-primary-foreground">
                    <div className="text-sm font-semibold">П</div>
                  </Avatar>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t bg-background">
        <ModernChatInput
          onSubmit={onSendMessage}
          placeholder="Задайте вопрос агентам..."
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}