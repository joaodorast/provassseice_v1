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
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen && !loading) onCancel(); }}>
      <DialogContent className="sm:max-w-[420px] text-center">
        <div className="flex flex-col items-center gap-4 pt-2">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ring-8 ${isDanger ? 'bg-red-100 ring-red-50' : 'bg-amber-100 ring-amber-50'}`}>
            {isDanger
              ? <Trash2 className="w-8 h-8 text-red-600" />
              : <AlertTriangle className="w-8 h-8 text-amber-600" />}
          </div>

          <div className="space-y-1">
            <DialogTitle className="text-xl text-slate-900">{title}</DialogTitle>
            <DialogDescription className="text-slate-500">{description}</DialogDescription>
          </div>

          {itemName && (
            <div className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-left">
              <p className="font-medium text-slate-800 break-words">{itemName}</p>
              {itemDetail && <p className="text-xs text-slate-500 mt-1">{itemDetail}</p>}
            </div>
          )}

          {warning && (
            <div className="w-full flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{warning}</span>
            </div>
          )}

          {children && <div className="w-full text-left text-sm">{children}</div>}

          <div className="w-full grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" onClick={onCancel} disabled={loading} autoFocus>
              Cancelar
            </Button>
            <Button
              onClick={onConfirm}
              disabled={loading || confirmDisabled}
              className={`text-white ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
            >
              {isDanger && <Trash2 className="w-4 h-4 mr-2" />}
              {loading ? (isDanger ? 'Excluindo...' : 'Aguarde...') : confirmLabel}
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
