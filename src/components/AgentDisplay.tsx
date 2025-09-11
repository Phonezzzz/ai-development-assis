import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Agent, AgentType } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AgentDisplayProps {
  agents: Agent[];
  currentAgent: AgentType | null;
  className?: string;
}

export function AgentDisplay({ agents, currentAgent, className }: AgentDisplayProps) {
  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'thinking':
      case 'active':
        return 'bg-accent text-accent-foreground';
      case 'complete':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: Agent['status']) => {
    switch (status) {
      case 'thinking':
        return 'Thinking';
      case 'active':
        return 'Active';
      case 'complete':
        return 'Complete';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  return (
    <Card className={cn("p-4", className)}>
      <h3 className="font-semibold mb-3 text-sm text-foreground">Agent System</h3>
      <div className="space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-all",
              currentAgent === agent.id && "bg-accent/20 border border-accent/50",
              agent.status === 'thinking' && "agent-thinking"
            )}
          >
            <div className="text-2xl">{agent.avatar}</div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm">{agent.name}</h4>
                <Badge 
                  variant="secondary" 
                  className={cn("text-xs", getStatusColor(agent.status))}
                >
                  {getStatusLabel(agent.status)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {agent.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}