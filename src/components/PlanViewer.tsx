import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plan } from '@/lib/types';
import { CheckCircle, Clock, XCircle, Circle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

interface PlanViewerProps {
  plan: Plan | null;
  onConfirmPlan: () => void;
  onExecutePlan: () => void;
  isExecuting: boolean;
}

export function PlanViewer({ plan, onConfirmPlan, onExecutePlan, isExecuting }: PlanViewerProps) {
  if (!plan) {
    return (
      <Card className="p-6 text-center">
        <p className="text-muted-foreground">Нет активного плана. Создайте план, общаясь с агентом-планировщиком.</p>
      </Card>
    );
  }

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'in-progress':
        return <Clock size={16} className="text-accent" />;
      case 'error':
        return <XCircle size={16} className="text-destructive" />;
      default:
        return <Circle size={16} className="text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-yellow-500 text-white';
      case 'confirmed':
        return 'bg-blue-500 text-white';
      case 'executing':
        return 'bg-accent text-accent-foreground';
      case 'complete':
        return 'bg-green-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft':
        return 'черновик';
      case 'confirmed':
        return 'подтверждён';
      case 'executing':
        return 'выполняется';
      case 'complete':
        return 'завершён';
      default:
        return status;
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-lg">{plan.title}</h3>
          <p className="text-muted-foreground text-sm mt-1">{plan.description}</p>
        </div>
        <Badge className={cn("capitalize", getStatusColor(plan.status))}>
          {getStatusText(plan.status)}
        </Badge>
      </div>

      <div className="space-y-3">
        <h4 className="font-medium text-sm">Шаги плана:</h4>
        {plan.steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-shrink-0 mt-0.5">
              {getStepIcon(step.status)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium">Шаг {index + 1}</span>
                <Badge variant="outline" className="text-xs">
                  {step.agentType === 'planner' ? 'планировщик' :
                   step.agentType === 'worker' ? 'исполнитель' :
                   step.agentType === 'supervisor' ? 'супервизор' :
                   step.agentType === 'error-fixer' ? 'отладчик' : step.agentType}
                </Badge>
              </div>
              <p className="text-sm text-foreground">{step.description}</p>
              {step.result && (
                <div className="mt-2 p-2 bg-background rounded border text-xs">
                  <p className="text-muted-foreground mb-1">Результат:</p>
                  <div className="syntax-highlight">{step.result}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-4 border-t">
        {plan.status === 'draft' && (
          <Button onClick={onConfirmPlan} className="flex-1">
            Подтвердить план
          </Button>
        )}
        {plan.status === 'confirmed' && (
          <Button 
            onClick={onExecutePlan} 
            disabled={isExecuting}
            className="flex-1"
          >
            {isExecuting ? 'Выполняется...' : 'Выполнить план'}
          </Button>
        )}
        {plan.status === 'complete' && (
          <div className="flex-1 text-center text-sm text-green-500 font-medium py-2">
            ✓ План выполнен успешно
          </div>
        )}
      </div>
    </Card>
  );
}