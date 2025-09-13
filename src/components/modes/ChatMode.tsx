import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ModernChatInput } from '@/components/ModernChatInput';
import { TTSControls } from '@/components/TTSControls';
import { Message, AgentType, WorkMode } from '@/lib/types';
import { cn, formatTimestamp } from '@/lib/utils';
import { useVoiceRecognition } from '@/hooks/use-voice';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface ChatModeProps {
  messages: Message[];
  onSendMessage: (text: string, mode: WorkMode, isVoice?: boolean) => void;
  isProcessing: boolean;
}

export function ChatMode({ messages, onSendMessage, isProcessing }: ChatModeProps) {
  const { speak } = useVoiceRecognition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, [messages]);

  // Typing indicator animation
  const TypingIndicator = () => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3 justify-start"
    >
      <Avatar className="w-8 h-8 bg-card border">
        <div className="text-lg">🤖</div>
      </Avatar>
      <div className="max-w-[70%]">
        <Card className="p-3 bg-card">
          <div className="flex items-center gap-1">
            <div className="flex gap-1">
              <motion.div
                className="w-2 h-2 bg-accent rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0
                }}
              />
              <motion.div
                className="w-2 h-2 bg-accent rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.2
                }}
              />
              <motion.div
                className="w-2 h-2 bg-accent rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.4
                }}
              />
            </div>
            <span className="text-sm text-muted-foreground ml-2">ИИ печатает...</span>
          </div>
        </Card>
      </div>
    </motion.div>
  );

  const getAgentInfo = (agentType: AgentType) => {
    const agentMap = {
      planner: { name: 'Планировщик', avatar: '🧠', color: 'bg-blue-500' },
      worker: { name: 'Исполнитель', avatar: '⚡', color: 'bg-green-500' },
      supervisor: { name: 'Супервизор', avatar: '👁️', color: 'bg-purple-500' },
      'error-fixer': { name: 'Отладчик', avatar: '🔧', color: 'bg-red-500' },
    };
    return agentMap[agentType] || { name: 'Ассистент', avatar: '🤖', color: 'bg-gray-500' };
  };

  return (
    <div className="chat-mode-container">
      <div className="chat-messages-area">
        <ScrollArea className="h-full chat-scroll-area">
          {messages.length === 0 ? (
            <div className="p-8">
              <Card className="p-8 text-center">
                <div className="text-4xl mb-4">💬</div>
                <h3 className="font-semibold text-lg mb-2">Начните беседу</h3>
                <p className="text-muted-foreground">
                  Общайтесь с системой ИИ агентов. Вы можете использовать голосовой ввод или печатать сообщения.
                </p>
              </Card>
            </div>
          ) : (
            <div className="messages-container">
              <div className="messages-list">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <motion.div
                      key={message.id}
                      initial={{ 
                        opacity: 0, 
                        y: 20,
                        scale: 0.95
                      }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        scale: 1
                      }}
                      exit={{ 
                        opacity: 0, 
                        y: -10,
                        scale: 0.95
                      }}
                      transition={{
                        duration: 0.3,
                        ease: [0.25, 0.46, 0.45, 0.94],
                        delay: index === messages.length - 1 ? 0.1 : 0
                      }}
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
                            <TTSControls text={message.content} />
                          )}
                        </div>
                      </Card>
                    </div>

                    {message.type === 'user' && (
                      <Avatar className="w-8 h-8 bg-primary text-primary-foreground">
                        <div className="text-sm font-semibold">П</div>
                      </Avatar>
                    )}
                  </motion.div>
                ))}
                </AnimatePresence>
                
                {/* Показать индикатор печати когда ИИ обрабатывает запрос */}
                <AnimatePresence>
                  {isProcessing && <TypingIndicator />}
                </AnimatePresence>
              </div>
              
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} className="auto-scroll-anchor" />
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="chat-input-area p-4">
        <ModernChatInput
          onSubmit={onSendMessage}
          placeholder="Задайте вопрос агентам..."
          disabled={isProcessing}
        />
      </div>
    </div>
  );
}