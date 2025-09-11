import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { VoiceInput } from '@/components/VoiceInput';
import { Message, AgentType, WorkMode } from '@/lib/types';
import { cn, formatTimestamp } from '@/lib/utils';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { Volume2 } from '@phosphor-icons/react';

interface ChatModeProps {
  messages: Message[];
  onSendMessage: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  isProcessing: boolean;
}

export function ChatMode({ messages, onSendMessage, isProcessing }: ChatModeProps) {
  const { speak } = useVoiceRecognition();

  const getAgentInfo = (agentType: AgentType) => {
    const agentMap = {
      planner: { name: 'Планировщик', avatar: '🧠', color: 'bg-blue-500' },
      worker: { name: 'Исполнитель', avatar: '⚡', color: 'bg-green-500' },
      supervisor: { name: 'Супервизор', avatar: '👁️', color: 'bg-purple-500' },
      'error-fixer': { name: 'Отладчик', avatar: '🔧', color: 'bg-red-500' },
    };
    return agentMap[agentType] || { name: 'Ассистент', avatar: '🤖', color: 'bg-gray-500' };
  };

  const speakMessage = (text: string) => {
    speak(text);
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
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {message.content.includes('```') ? (
                          <pre className="syntax-highlight whitespace-pre-wrap overflow-x-auto">
                            {message.content}
                          </pre>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      
                      {message.type === 'agent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakMessage(message.content)}
                          className="h-6 w-6 p-0 ml-2 opacity-50 hover:opacity-100"
                        >
                          <Volume2 size={12} />
                        </Button>
                      )}
                    </div>
                    
                    <div className="text-xs opacity-70 mt-2">
                      {formatTimestamp(message.timestamp)}
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
        <VoiceInput
          onSubmit={onSendMessage}
          placeholder="Задайте вопрос агентам..."
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}