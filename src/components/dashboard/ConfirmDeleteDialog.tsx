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

// Paleta por tom: exclusão (vermelho forte) ou atenção (âmbar forte)
const TONES = {
  danger: {
    hero: 'from-red-100 via-red-50 to-white',
    orb: 'from-rose-500 to-red-700 shadow-red-500/50',
    accent: 'from-rose-500 via-red-600 to-rose-700',
    title: 'text-red-900',
    button: 'from-rose-500 to-red-700 hover:from-rose-600 hover:to-red-800 shadow-red-500/40',
    itemBox: 'border-l-red-600 bg-red-50',
    spinner: 'Excluindo...'
  },
  warning: {
    hero: 'from-amber-100 via-amber-50 to-white',
    orb: 'from-amber-400 to-orange-600 shadow-amber-500/50',
    accent: 'from-amber-400 via-orange-500 to-amber-600',
    title: 'text-amber-900',
    button: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-amber-500/40',
    itemBox: 'border-l-amber-500 bg-amber-50',
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
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden border-0 shadow-2xl rounded-2xl text-center">
        <div className={`relative flex flex-col items-center gap-3 bg-gradient-to-b px-6 pt-9 pb-5 ${t.hero}`}>
          <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${t.accent}`} />
          <div className="relative animate-in zoom-in-50 fade-in duration-500 motion-reduce:animate-none">
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br shadow-xl flex items-center justify-center ring-4 ring-white ${t.orb}`}>
              <Icon className="w-9 h-9 text-white drop-shadow" strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-1.5 px-2">
            <DialogTitle className={`text-xl font-bold tracking-tight ${t.title}`}>{title}</DialogTitle>
            <DialogDescription className="text-base font-medium text-slate-600">{description}</DialogDescription>
          </div>
        </div>

        <div className="flex flex-col gap-4 bg-white px-6 pb-6 pt-4">
          {itemName && (
            <div className={`w-full rounded-xl border-l-4 px-4 py-3 text-left shadow-sm ${t.itemBox}`}>
              <p className="font-semibold text-slate-900 break-words">{itemName}</p>
              {itemDetail && <p className="text-xs font-medium text-slate-600 mt-1">{itemDetail}</p>}
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
            <Button variant="outline" onClick={onCancel} disabled={loading} autoFocus className="h-11 border-2 font-semibold">
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
              className={`h-11 font-semibold text-white bg-gradient-to-r shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 ${t.button}`}
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
