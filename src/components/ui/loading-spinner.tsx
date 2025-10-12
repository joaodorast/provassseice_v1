import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ message = 'Carregando...', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-600 mb-3`} />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function LoadingCard({ message = 'Carregando dados...' }: { message?: string }) {
  return (
    <div className="seice-card p-12">
      <div className="flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="font-medium text-slate-800 mb-2">{message}</h3>
        <p className="text-slate-500 text-sm">Aguarde um momento...</p>
      </div>
    </div>
  );
}
