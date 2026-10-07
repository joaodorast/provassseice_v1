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

// Cartão branco e limpo: a cor de cada tipo aparece só no ícone, no filete do topo e na barra de tempo.
// O botão principal segue o cinza-carvão do sistema em todos os tipos.
const VARIANTS = {
  success: {
    rule: 'bg-emerald-500',
    iconWrap: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
    iconAnim: 'seice-pop-icon',
    detail: 'border-zinc-200 bg-zinc-50',
    detailDot: 'bg-emerald-500',
    bar: 'bg-emerald-500',
    icon: CheckCircle2
  },
  error: {
    rule: 'bg-red-500',
    iconWrap: 'bg-red-50 text-red-600 ring-red-100',
    iconAnim: 'seice-pop-icon seice-shake',
    detail: 'border-zinc-200 bg-zinc-50',
    detailDot: 'bg-red-500',
    bar: 'bg-red-500',
    icon: XCircle
  },
  info: {
    rule: 'bg-sky-500',
    iconWrap: 'bg-sky-50 text-sky-600 ring-sky-100',
    iconAnim: 'seice-pop-icon',
    detail: 'border-zinc-200 bg-zinc-50',
    detailDot: 'bg-sky-500',
    bar: 'bg-sky-500',
    icon: Info
  },
  warning: {
    rule: 'bg-amber-400',
    iconWrap: 'bg-amber-50 text-amber-600 ring-amber-100',
    iconAnim: 'seice-pop-icon',
    detail: 'border-amber-200 bg-amber-50/60',
    detailDot: 'bg-amber-500',
    bar: 'bg-amber-400',
    icon: AlertTriangle
  }
};

// Filete na base do cartão que esvazia até o modal fechar sozinho (só transform, sem recalcular layout)
function AutoCloseBar({ className, durationMs }: { className: string; durationMs: number }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-zinc-100">
      <div
        className={`h-full w-full origin-left opacity-70 ${className}`}
        style={{
          transform: started ? 'scaleX(0)' : 'scaleX(1)',
          transition: `transform ${durationMs}ms linear`
        }}
      />
    </div>
  );
}

// Modal central de resultado (sucesso / falha / aviso / info) que fecha sozinho
export function ActionResultDialog({ result, onClose, autoCloseMs = 5000 }: ActionResultDialogProps) {
  // Com botões de escolha, o modal espera o usuário decidir
  const closeMs = result?.actions?.length ? null : autoCloseMs;

  useEffect(() => {
    if (!result || closeMs == null) return;
    const timer = setTimeout(onClose, closeMs);
    return () => clearTimeout(timer);
  }, [result, closeMs]);

  const v = VARIANTS[result?.type ?? 'success'];
  const Icon = v.icon;

  return (
    <Dialog open={!!result} onOpenChange={(open) => { if (!open) onClose(); }}>
      {/* Entrada e saída curtas e suaves vêm do DialogContent (classe seice-pop, em globals.css) */}
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden border-zinc-200/80 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] rounded-2xl text-center before:hidden">
        {result && (
          <>
            <div className={`absolute inset-x-0 top-0 h-1 ${v.rule}`} />

            <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-[6px] ${v.iconWrap} ${v.iconAnim}`}>
                <Icon className="w-6 h-6" strokeWidth={2.2} />
              </div>

              <div className="space-y-1">
                <DialogTitle className="text-[15px] font-semibold leading-snug text-zinc-900">
                  {result.title}
                </DialogTitle>
                {result.message && (
                  <DialogDescription className="text-[13px] leading-relaxed text-zinc-500 whitespace-pre-line">
                    {result.message}
                  </DialogDescription>
                )}
              </div>

              {result.details && result.details.length > 0 && (
                <ul className={`w-full rounded-lg border px-3 py-2 text-xs text-left text-zinc-700 space-y-1 ${v.detail}`}>
                  {result.details.map((d) => (
                    <li key={d} className="flex items-start gap-2">
                      <span className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${v.detailDot}`} />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="w-full flex flex-col gap-2 pt-1">
                {result.actions?.length ? (
                  result.actions.map((action, idx) => (
                    <Button
                      key={action.label}
                      autoFocus={idx === 0}
                      variant={action.variant === 'outline' ? 'outline' : 'default'}
                      onClick={action.onClick}
                      className={`w-full h-10 text-sm font-medium ${
                        action.variant === 'outline'
                          ? ''
                          : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm'
                      }`}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))
                ) : (
                  <Button
                    autoFocus
                    onClick={onClose}
                    className="w-full h-10 text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm"
                  >
                    OK
                  </Button>
                )}
              </div>
            </div>

            {closeMs != null && (
              <AutoCloseBar
                key={`${result.type}-${result.title}-${result.message}`}
                durationMs={closeMs}
                className={v.bar}
              />
            )}
          </>
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
