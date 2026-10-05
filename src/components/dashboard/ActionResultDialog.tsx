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

// Cada tipo tem linguagem visual própria; o corpo é cinza, como o restante do sistema
const VARIANTS = {
  success: {
    // Sucesso: faixa de confirmação com anéis que se expandem ao redor do ícone
    band: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600',
    ring: 'border-emerald-300',
    iconWrap: 'bg-white text-emerald-600 shadow-emerald-900/30',
    title: 'text-zinc-900',
    text: 'text-zinc-600',
    detail: 'border-emerald-200 bg-emerald-50/70 text-zinc-800',
    detailDot: 'text-emerald-600',
    button: 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-emerald-600/30',
    bar: 'bg-gradient-to-r from-emerald-400 to-teal-600',
    pattern: '',
    icon: CheckCircle2,
    iconClass: 'w-11 h-11'
  },
  error: {
    // Erro: listras de atenção na faixa e ícone que treme ao aparecer
    band: 'bg-gradient-to-br from-rose-600 via-red-600 to-red-800',
    ring: 'border-rose-300',
    iconWrap: 'bg-white text-red-600 shadow-red-900/30',
    title: 'text-zinc-900',
    text: 'text-zinc-600',
    detail: 'border-red-200 bg-red-50/70 text-zinc-800',
    detailDot: 'text-red-600',
    button: 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 shadow-red-600/30',
    bar: 'bg-gradient-to-r from-rose-500 to-red-700',
    pattern: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.10) 0 12px, transparent 12px 24px)',
    icon: XCircle,
    iconClass: 'w-11 h-11 seice-shake'
  },
  info: {
    band: 'bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700',
    ring: 'border-sky-300',
    iconWrap: 'bg-white text-sky-600 shadow-sky-900/30',
    title: 'text-zinc-900',
    text: 'text-zinc-600',
    detail: 'border-sky-200 bg-sky-50/70 text-zinc-800',
    detailDot: 'text-sky-600',
    button: 'bg-gradient-to-r from-sky-500 to-blue-700 hover:from-sky-600 hover:to-blue-800 shadow-sky-600/30',
    bar: 'bg-gradient-to-r from-sky-400 to-blue-700',
    pattern: '',
    icon: Info,
    iconClass: 'w-11 h-11'
  },
  warning: {
    // Atenção: listras amarelas de sinalização e ícone pulsando
    band: 'bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600',
    ring: 'border-amber-300',
    iconWrap: 'bg-white text-amber-600 shadow-amber-900/30',
    title: 'text-zinc-900',
    text: 'text-zinc-600',
    detail: 'border-amber-200 bg-amber-50/80 text-zinc-800',
    detailDot: 'text-amber-600',
    button: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-600/30',
    bar: 'bg-gradient-to-r from-amber-400 to-orange-600',
    pattern: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0 14px, transparent 14px 28px)',
    icon: AlertTriangle,
    iconClass: 'w-11 h-11 animate-pulse motion-reduce:animate-none'
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
    <div className="w-full h-1.5 rounded-full bg-zinc-200 overflow-hidden">
      <div
        className={`h-full w-full rounded-full origin-left ${className}`}
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
      {/* Mais largo que o padrão e em cinza; entrada e saída lentas para dar tempo de ler */}
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-zinc-200 bg-zinc-50 shadow-2xl rounded-3xl text-center duration-700 data-[state=open]:ease-out data-[state=closed]:duration-600 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-6 before:hidden">
        {result && (
          <>
            {/* Faixa colorida com o ícone; a textura muda conforme o tipo */}
            <div className={`relative flex flex-col items-center gap-4 overflow-hidden px-8 pt-10 pb-12 ${v.band}`}>
              {v.pattern && (
                <div className="pointer-events-none absolute inset-0 opacity-70" style={{ backgroundImage: v.pattern }} />
              )}
              <div className="pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />

              <div className="relative animate-in zoom-in-50 fade-in duration-700 delay-300 fill-mode-both motion-reduce:animate-none">
                {result.type === 'success' && (
                  <>
                    <span className={`absolute inset-0 rounded-full border-4 seice-ring motion-reduce:hidden ${v.ring}`} />
                    <span className={`absolute inset-0 rounded-full border-4 seice-ring motion-reduce:hidden [animation-delay:0.6s] ${v.ring}`} />
                  </>
                )}
                <div className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ring-8 ring-white/30 ${v.iconWrap}`}>
                  <Icon className={v.iconClass} strokeWidth={2.4} />
                </div>
              </div>

              <div className="relative space-y-1 px-1 animate-in slide-in-from-bottom-2 fade-in duration-700 delay-500 fill-mode-both motion-reduce:animate-none">
                <DialogTitle className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                  {result.title}
                </DialogTitle>
              </div>
            </div>

            {/* Corpo cinza: mensagem, detalhes, botões e barra de tempo */}
            <div className="relative -mt-6 mx-5 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-6 pb-6 pt-6 shadow-lg">
              {result.message && (
                <DialogDescription className={`text-base font-medium leading-relaxed whitespace-pre-line ${v.text}`}>
                  {result.message}
                </DialogDescription>
              )}
              {result.details && result.details.length > 0 && (
                <ul className={`w-full rounded-xl border px-4 py-3 text-sm text-left space-y-1.5 ${v.detail}`}>
                  {result.details.map((d) => (
                    <li key={d} className="font-medium">
                      <span className={`mr-1.5 font-bold ${v.detailDot}`}>•</span>{d}
                    </li>
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
                      className={`w-full h-12 font-semibold transition-all duration-200 ${
                        action.variant === 'outline'
                          ? 'border-2 border-zinc-300'
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
                  className={`w-full h-12 text-base font-semibold text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${v.button}`}
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
            <div className="h-5" />
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
