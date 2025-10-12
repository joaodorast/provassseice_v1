import React from 'react';
import { Loader2 } from 'lucide-react';
import { Progress } from './progress';

type ProgressiveLoaderProps = {
  stages: Array<{
    name: string;
    completed: boolean;
  }>;
  currentStage?: string;
  className?: string;
};

export function ProgressiveLoader({ stages, currentStage, className = "" }: ProgressiveLoaderProps) {
  const completedStages = stages.filter(stage => stage.completed).length;
  const totalStages = stages.length;
  const progress = (completedStages / totalStages) * 100;

  return (
    <div className={`flex items-center justify-center min-h-[200px] ${className}`}>
      <div className="text-center max-w-md">
        <div className="seice-gradient w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        
        <h3 className="text-lg font-semibold mb-2">Carregando Sistema SEICE</h3>
        
        <div className="space-y-3 mb-4">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-muted-foreground">
            {completedStages} de {totalStages} componentes carregados
          </p>
        </div>

        {currentStage && (
          <div className="text-sm text-blue-600 font-medium">
            {currentStage}
          </div>
        )}

        <div className="mt-4 space-y-1">
          {stages.map((stage, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className={stage.completed ? 'text-green-600' : 'text-muted-foreground'}>
                {stage.name}
              </span>
              <span className="text-muted-foreground">
                {stage.completed ? '✓' : '⋯'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SimpleLoader({ message = "Carregando...", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center h-32 ${className}`}>
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}