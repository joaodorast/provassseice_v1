import React, { useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { answerConfirm, getCurrentConfirm, subscribeConfirm } from '../../utils/confirm';

type ConfirmDeleteDialogProps = {
  open: boolean;
  title: string;
  // Nome do item que será excluído, mostrado em destaque
  itemName?: string;
  itemDetail?: string;
  warning?: React.ReactNode;
  description?: string;
  confirmLabel?: string;
  loading?: boolean;
  // 'danger' para exclusões; 'warning' para outras confirmações (cancelar, sair sem salvar...)
  tone?: 'danger' | 'warning';
  // Desabilita o botão de confirmar (ex: falta marcar uma opção)
  confirmDisabled?: boolean;
  // Conteúdo extra (ex: caixas de opção) mostrado antes dos botões
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
};

// Cada tom tem sua faixa: exclusão com listras vermelhas e ícone tremendo; atenção com listras amarelas
// Cabeçalho cinza-carvão, igual aos avisos; vermelho para exclusão e um toque de amarelo para atenção
const TONES = {
  danger: {
    band: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700',
    glow: 'bg-red-500/30',
    rule: 'bg-gradient-to-r from-red-700 via-red-500 to-red-700',
    iconWrap: 'bg-red-600 text-white shadow-red-900/50 ring-zinc-700 seice-shake',
    iconClass: 'w-10 h-10',
    detail: 'border-zinc-200 bg-zinc-100',
    button: 'bg-gradient-to-r from-red-600 to-zinc-800 hover:from-red-700 hover:to-zinc-900 shadow-zinc-900/30',
    spinner: 'Excluindo...'
  },
  warning: {
    band: 'bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700',
    glow: 'bg-amber-400/20',
    rule: 'bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500',
    iconWrap: 'bg-amber-400 text-zinc-900 shadow-amber-900/40 ring-zinc-700 animate-pulse motion-reduce:animate-none',
    iconClass: 'w-10 h-10',
    detail: 'border-amber-200 bg-amber-50/70',
    button: 'bg-gradient-to-r from-amber-500 to-zinc-700 hover:from-amber-600 hover:to-zinc-800 shadow-zinc-900/30',
    spinner: 'Aguarde...'
  }
};

// Modal de confirmação de exclusão (substitui o window.confirm do navegador)
export function ConfirmDeleteDialog({
  open,
  title,
  itemName,
  itemDetail,
  warning,
  description = 'Esta ação não pode ser desfeita.',
  confirmLabel = 'Sim, excluir',
  loading = false,
  tone = 'danger',
  confirmDisabled = false,
  children,
  onConfirm,
  onCancel
}: ConfirmDeleteDialogProps) {
  const isDanger = tone === 'danger';
  const t = TONES[isDanger ? 'danger' : 'warning'];
  const Icon = isDanger ? Trash2 : AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !loading) onCancel(); }}>
      {/* Mais largo que o padrão e em cinza; entrada e saída lentas para o usuário ler antes de confirmar */}
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-zinc-300 bg-zinc-100 shadow-2xl rounded-3xl text-center duration-700 data-[state=open]:ease-out data-[state=closed]:duration-600 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-6 before:hidden">
        <div className={`relative flex flex-col items-center gap-3 overflow-hidden px-8 pt-10 pb-12 ${t.band}`}>
          <div className={`pointer-events-none absolute -top-20 -right-16 h-56 w-56 rounded-full blur-3xl ${t.glow}`} />
          <div className={`absolute inset-x-0 bottom-0 h-1 ${t.rule}`} />
          <div className="relative animate-in zoom-in-50 fade-in duration-700 delay-300 fill-mode-both motion-reduce:animate-none">
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl ring-8 ring-white/30 ${t.iconWrap}`}>
              <Icon className={t.iconClass} strokeWidth={2.4} />
            </div>
          </div>
          <DialogTitle className="relative text-2xl font-bold tracking-tight text-white">{title}</DialogTitle>
        </div>

        <div className="relative -mt-6 mx-5 mb-5 flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white px-6 pb-6 pt-6 shadow-lg">
          <DialogDescription className="text-base font-medium text-zinc-600">{description}</DialogDescription>

          {itemName && (
            <div className={`w-full rounded-xl border px-4 py-3 text-left ${t.detail}`}>
              <p className="font-semibold text-zinc-900 break-words">{itemName}</p>
              {itemDetail && <p className="text-xs font-medium text-zinc-600 mt-1">{itemDetail}</p>}
            </div>
          )}

          {warning && (
            <div className="w-full flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-left text-sm font-medium text-amber-900">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
              <span>{warning}</span>
            </div>
          )}

          {children && <div className="w-full text-left text-sm">{children}</div>}

          <div className="w-full grid grid-cols-2 gap-3 pt-1">
            <Button variant="outline" onClick={onCancel} disabled={loading} autoFocus className="h-12 border-2 border-zinc-300 font-semibold">
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
              className={`h-12 font-semibold text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${t.button}`}
            >
              {isDanger && !loading && <Trash2 className="w-4 h-4 mr-2" />}
              {loading ? t.spinner : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal global usado por confirmAction() (utils/confirm), montado junto do ActionResultHost
export function ConfirmActionHost() {
  const current = useSyncExternalStore(subscribeConfirm, getCurrentConfirm);
  const options = current?.options;
  const isDanger = (options?.tone ?? 'danger') === 'danger';
  return (
    <ConfirmDeleteDialog
      open={!!current}
      title={options?.title ?? ''}
      itemName={options?.itemName}
      itemDetail={options?.itemDetail}
      warning={options?.warning}
      description={options?.description ?? (isDanger ? undefined : '')}
      confirmLabel={options?.confirmLabel ?? (isDanger ? undefined : 'Sim, continuar')}
      tone={options?.tone}
      onConfirm={() => answerConfirm(true)}
      onCancel={() => answerConfirm(false)}
    />
  );
}
