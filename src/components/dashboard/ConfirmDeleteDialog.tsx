import React, { useSyncExternalStore } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { answerConfirm, getCurrentConfirm, subscribeConfirm } from '../../utils/confirm';
import { POPUP_BUTTON, POPUP_TONES } from './PopupHeader';

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

// Mesmo visual do ActionResultDialog: cartão branco, filete e ícone na cor do tom
const TONES = {
  danger: {
    iconAnim: 'seice-pop-icon seice-shake',
    detail: 'border-zinc-200 bg-zinc-50',
    button: POPUP_BUTTON.danger,
    spinner: 'Excluindo...'
  },
  warning: {
    iconAnim: 'seice-pop-icon',
    detail: 'border-amber-200 bg-amber-50/60',
    button: POPUP_BUTTON.primary,
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
  const c = POPUP_TONES[isDanger ? 'danger' : 'warning'];
  const Icon = isDanger ? Trash2 : AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !loading) onCancel(); }}>
      <DialogContent className="sm:max-w-[400px] p-0 gap-0 overflow-hidden border-zinc-200/80 bg-white shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] rounded-2xl text-center before:hidden">
        <div className={`absolute inset-x-0 top-0 h-1 ${c.rule}`} />

        <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ring-[6px] ${c.iconWrap} ${t.iconAnim}`}>
            <Icon className="w-6 h-6" strokeWidth={2.2} />
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-[15px] font-semibold leading-snug text-zinc-900">{title}</DialogTitle>
            {description ? (
              <DialogDescription className="text-[13px] leading-relaxed text-zinc-500">{description}</DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{title}</DialogDescription>
            )}
          </div>

          {itemName && (
            <div className={`w-full rounded-lg border px-3 py-2 text-left ${t.detail}`}>
              <p className="text-sm font-medium text-zinc-900 break-words">{itemName}</p>
              {itemDetail && <p className="text-xs text-zinc-500 mt-0.5">{itemDetail}</p>}
            </div>
          )}

          {warning && (
            <div className="w-full flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 mt-px flex-shrink-0 text-amber-600" />
              <span>{warning}</span>
            </div>
          )}

          {children && <div className="w-full text-left text-sm">{children}</div>}

          <div className="w-full grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={onCancel} disabled={loading} autoFocus className={POPUP_BUTTON.cancel}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={loading || confirmDisabled} className={t.button}>
              {isDanger && !loading && <Trash2 className="w-4 h-4" />}
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
