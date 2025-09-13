import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useKV } from '@github/spark/hooks';
import { Message } from '@/lib/types';
import { cn, formatTimestamp } from '@/lib/utils';
import { MagnifyingGlass, Trash, Clock } from '@phosphor-icons/react';
import { toast } from 'sonner';

interface ChatHistoryProps {
  messages: Message[];
  onClearHistory: () => void;
}

export function ChatHistory({ messages, onClearHistory }: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSessions, setChatSessions] = useKV<Array<{
    id: string;
    title: string;
    messages: Message[];
    timestamp: Date;
  }>>('chat-sessions', []);

  // Group messages into sessions (simplified for demo)
  const currentSession = {
    id: 'current',
    title: 'Текущая сессия',
    messages: messages,
    timestamp: new Date(),
  };

  const allSessions = [currentSession, ...chatSessions].filter(session => 
    session.messages.length > 0
  );

  const filteredSessions = allSessions.filter(session =>
    searchQuery === '' || 
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.messages.some(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleClearHistory = () => {
    onClearHistory();
    setChatSessions([]);
    toast.success('История чата очищена');
  };

  const getMessagePreview = (messages: Message[]) => {
    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    return lastUserMessage ? 
      lastUserMessage.content.substring(0, 60) + (lastUserMessage.content.length > 60 ? '...' : '') :
      'Новый чат';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">История чатов</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleClearHistory}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            title="Очистить историю"
          >
            <Trash size={14} />
          </Button>
        </div>
        
        <div className="relative">
          <MagnifyingGlass 
            size={16} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
          />
          <Input
            placeholder="Поиск в истории..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredSessions.length === 0 ? (
            <Card className="p-4 text-center">
              <Clock size={24} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Ничего не найдено' : 'История пуста'}
              </p>
            </Card>
          ) : (
            filteredSessions.map((session, index) => (
              <Card 
                key={session.id} 
                className={cn(
                  "p-3 cursor-pointer hover:bg-accent/50 transition-colors",
                  index === 0 && "border-accent bg-accent/20"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-1">
                        {session.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {getMessagePreview(session.messages)}
                      </p>
                    </div>
                    {index === 0 && (
                      <div className="w-2 h-2 bg-accent rounded-full ml-2 mt-1" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{session.messages.length} сообщений</span>
                    <span>{formatTimestamp(session.timestamp)}</span>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}