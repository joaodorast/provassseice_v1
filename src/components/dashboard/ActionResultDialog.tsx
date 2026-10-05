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

// Paleta forte de cada tipo de resultado (contraste alto, cores saturadas e legíveis)
const VARIANTS = {
  success: {
    hero: 'from-emerald-100 via-emerald-50 to-white',
    orb: 'from-emerald-400 to-green-600 shadow-emerald-500/50',
    halo: 'bg-emerald-400',
    accent: 'from-emerald-400 via-green-500 to-emerald-600',
    title: 'text-emerald-900',
    text: 'text-emerald-800',
    details: 'border-l-emerald-500 bg-emerald-50 text-emerald-900',
    button: 'from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/40',
    bar: 'from-emerald-400 to-green-600',
    icon: CheckCircle2
  },
  error: {
    hero: 'from-red-100 via-red-50 to-white',
    orb: 'from-rose-500 to-red-700 shadow-red-500/50',
    halo: 'bg-red-500',
    accent: 'from-rose-500 via-red-600 to-rose-700',
    title: 'text-red-900',
    text: 'text-red-800',
    details: 'border-l-red-600 bg-red-50 text-red-900',
    button: 'from-rose-500 to-red-700 hover:from-rose-600 hover:to-red-800 shadow-red-500/40',
    bar: 'from-rose-500 to-red-700',
    icon: XCircle
  },
  info: {
    hero: 'from-sky-100 via-sky-50 to-white',
    orb: 'from-sky-400 to-blue-700 shadow-sky-500/50',
    halo: 'bg-sky-400',
    accent: 'from-sky-400 via-blue-500 to-sky-600',
    title: 'text-sky-900',
    text: 'text-sky-800',
    details: 'border-l-sky-500 bg-sky-50 text-sky-900',
    button: 'from-sky-500 to-blue-700 hover:from-sky-600 hover:to-blue-800 shadow-sky-500/40',
    bar: 'from-sky-400 to-blue-700',
    icon: Info
  },
  warning: {
    hero: 'from-amber-100 via-amber-50 to-white',
    orb: 'from-amber-400 to-orange-600 shadow-amber-500/50',
    halo: 'bg-amber-400',
    accent: 'from-amber-400 via-orange-500 to-amber-600',
    title: 'text-amber-900',
    text: 'text-amber-800',
    details: 'border-l-amber-500 bg-amber-50 text-amber-900',
    button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/40',
    bar: 'from-amber-400 to-orange-600',
    icon: AlertTriangle
  }
};

// Barra que esvazia até o modal fechar sozinho (só transform, sem recalcular layout)
function AutoCloseBar({ className, durationMs }: { className: string; durationMs: number }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <div
        className={`h-full w-full rounded-full bg-gradient-to-r origin-left ${className}`}
        style={{
          transform: started ? 'scaleX(0)' : 'scaleX(1)',
          transition: `transform ${durationMs}ms linear`
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
  const Icon = v.icon;

  return (
    <Dialog open={!!result} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl text-center">
        {result && (
          <>
            {/* Faixa de topo com o ícone em destaque */}
            <div className={`relative flex flex-col items-center gap-4 bg-gradient-to-b px-6 pt-9 pb-6 ${v.hero}`}>
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${v.accent}`} />
              <div className="relative animate-in zoom-in-50 fade-in duration-500 motion-reduce:animate-none">
                <span className={`absolute inset-0 rounded-full opacity-30 animate-ping motion-reduce:hidden ${v.halo}`} />
                <div className={`relative w-20 h-20 rounded-full bg-gradient-to-br shadow-xl flex items-center justify-center ring-4 ring-white ${v.orb}`}>
                  <Icon className="w-10 h-10 text-white drop-shadow" strokeWidth={2.5} />
                </div>
              </div>
              <div className="space-y-1.5 px-2">
                <DialogTitle className={`text-xl font-bold tracking-tight ${v.title}`}>
                  {result.title}
                </DialogTitle>
                {result.message && (
                  <DialogDescription className={`text-base font-medium whitespace-pre-line leading-relaxed ${v.text}`}>
                    {result.message}
                  </DialogDescription>
                )}
              </div>
            </div>

            {/* Corpo: detalhes, botões e barra de tempo */}
            <div className="flex flex-col gap-4 bg-white px-6 pb-6 pt-4">
              {result.details && result.details.length > 0 && (
                <ul className={`w-full rounded-xl border-l-4 px-4 py-3 text-sm text-left space-y-1.5 shadow-sm ${v.details}`}>
                  {result.details.map((d) => (
                    <li key={d} className="font-medium">• {d}</li>
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
                      className={`w-full h-11 font-semibold transition-all duration-200 ${
                        action.variant === 'outline'
                          ? 'border-2'
                          : `text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${v.button}`
                      }`}
                    >
                      {action.icon}
                      {action.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <Button
                  autoFocus
                  onClick={onClose}
                  className={`w-full h-11 text-base font-semibold text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${v.button}`}
                >
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
