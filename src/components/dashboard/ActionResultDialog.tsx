import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { ConfirmActionHost } from './ConfirmDeleteDialog';
import { CheckCircle2, XCircle, Info, AlertTriangle } from 'lucide-react';
import { subscribeToasts, getCurrentToast, closeCurrentToast } from '../../utils/toast';

export type ActionResult = {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  details?: string[];
  // Botões personalizados; sem eles, mostra só "OK"
  actions?: ActionResultAction[];
};

export type ActionResultAction = {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'outline';
  icon?: React.ReactNode;
};

type ActionResultDialogProps = {
  result: ActionResult | null;
  onClose: () => void;
  // null desativa o fechamento automático
  autoCloseMs?: number | null;
};

// Cores e ícone de cada tipo de resultado
const VARIANTS = {
  success: {
    content: 'bg-green-50 border-green-200',
    iconWrap: 'bg-green-100',
    icon: <CheckCircle2 className="w-9 h-9 text-green-600" />,
    title: 'text-green-800',
    text: 'text-green-700',
    details: 'border-green-200 text-green-800',
    button: 'bg-green-600 hover:bg-green-700',
    bar: 'bg-green-400'
  },
  error: {
    content: 'bg-red-100 border-red-300',
    iconWrap: 'bg-red-200',
    icon: <XCircle className="w-9 h-9 text-red-600" />,
    title: 'text-red-800',
    text: 'text-red-700',
    details: 'border-red-300 text-red-800',
    button: 'bg-red-600 hover:bg-red-700',
    bar: 'bg-red-500'
  },
  info: {
    content: 'bg-sky-50 border-sky-200',
    iconWrap: 'bg-sky-100',
    icon: <Info className="w-9 h-9 text-sky-600" />,
    title: 'text-sky-800',
    text: 'text-sky-700',
    details: 'border-sky-200 text-sky-800',
    button: 'bg-sky-600 hover:bg-sky-700',
    bar: 'bg-sky-400'
  },
  warning: {
    content: 'bg-amber-50 border-amber-200',
    iconWrap: 'bg-amber-100',
    icon: <AlertTriangle className="w-9 h-9 text-amber-600" />,
    title: 'text-amber-800',
    text: 'text-amber-700',
    details: 'border-amber-200 text-amber-800',
    button: 'bg-amber-600 hover:bg-amber-700',
    bar: 'bg-amber-400'
  }
};

// Barra que esvazia até o modal fechar sozinho
function AutoCloseBar({ className, durationMs }: { className: string; durationMs: number }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="w-full h-1 rounded-full bg-black/5 overflow-hidden">
      <div
        className={`h-full rounded-full ${className}`}
        style={{
          width: started ? '0%' : '100%',
          transition: `width ${durationMs}ms linear`
        }}
      />
    </div>
  );
}

// Modal central de resultado (sucesso / falha / aviso / info) que fecha sozinho
export function ActionResultDialog({ result, onClose, autoCloseMs = 2000 }: ActionResultDialogProps) {
  // Com botões de escolha, o modal espera o usuário decidir
  const closeMs = result?.actions?.length ? null : autoCloseMs;

  useEffect(() => {
    if (!result || closeMs == null) return;
    const timer = setTimeout(onClose, closeMs);
    return () => clearTimeout(timer);
  }, [result, closeMs]);

  const v = VARIANTS[result?.type ?? 'success'];

  return (
    <Dialog open={!!result} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={`max-w-md text-center ${v.content}`}>
        {result && (
          <div className="flex flex-col items-center gap-4 py-2">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${v.iconWrap}`}>
              {v.icon}
            </div>
            <div className="space-y-1">
              <DialogTitle className={v.title}>
                {result.title}
              </DialogTitle>
              <DialogDescription className={`${v.text} whitespace-pre-line`}>
                {result.message || ''}
              </DialogDescription>
            </div>
            {result.details && result.details.length > 0 && (
              <ul className={`w-full rounded-lg border bg-white/70 px-4 py-3 text-sm text-left space-y-1 ${v.details}`}>
                {result.details.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
            )}
            {result.actions?.length ? (
              <div className="w-full flex flex-col gap-2">
                {result.actions.map((action, idx) => (
                  <Button
                    key={action.label}
                    autoFocus={idx === 0}
                    variant={action.variant === 'outline' ? 'outline' : 'default'}
                    onClick={action.onClick}
                    className={`w-full ${
                      action.variant === 'outline' ? '' : `text-white ${v.button}`
                    }`}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            ) : (
              <Button autoFocus onClick={onClose} className={`w-full text-white ${v.button}`}>
                OK
              </Button>
            )}
            {closeMs != null && (
              <AutoCloseBar
                key={`${result.type}-${result.title}-${result.message}`}
                durationMs={closeMs}
                className={v.bar}
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Modal global que exibe os avisos disparados por toast.success/error/info/warning
export function ActionResultHost() {
  const current = useSyncExternalStore(subscribeToasts, getCurrentToast);
  return (
    <>
      <ActionResultDialog
        result={current?.result ?? null}
        onClose={closeCurrentToast}
        autoCloseMs={current?.durationMs}
      />
      <ConfirmActionHost />
    </>
  );
}
