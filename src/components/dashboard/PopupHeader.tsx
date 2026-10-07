import React from 'react';
import { DialogDescription, DialogTitle } from '../ui/dialog';

export type PopupTone = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

// Cores de cada tom: filete do topo e ícone em círculo claro (mesmo visual do ActionResultDialog)
export const POPUP_TONES: Record<PopupTone, { rule: string; iconWrap: string }> = {
  danger: { rule: 'bg-red-500', iconWrap: 'bg-red-50 text-red-600 ring-red-100' },
  warning: { rule: 'bg-amber-400', iconWrap: 'bg-amber-50 text-amber-600 ring-amber-100' },
  success: { rule: 'bg-emerald-500', iconWrap: 'bg-emerald-50 text-emerald-600 ring-emerald-100' },
  info: { rule: 'bg-sky-500', iconWrap: 'bg-sky-50 text-sky-600 ring-sky-100' },
  neutral: { rule: 'bg-zinc-800', iconWrap: 'bg-zinc-100 text-zinc-700 ring-zinc-200/70' }
};

// Botões padrão dos pop-ups
export const POPUP_BUTTON = {
  cancel: 'h-10 text-sm font-medium',
  primary: 'h-10 text-sm font-medium bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm',
  danger: 'h-10 text-sm font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm'
};

// Cabeçalho branco dos pop-ups largos (formulários e listas): ícone à esquerda, título e descrição
export function PopupHeader({
  icon,
  tone = 'neutral',
  title,
  description
}: {
  icon?: React.ReactNode;
  tone?: PopupTone;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  const t = POPUP_TONES[tone];
  return (
    <div className="relative border-b border-zinc-200 bg-white px-6 pt-6 pb-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${t.rule}`} />
      <div className="flex items-center gap-3 pr-8">
        {icon && (
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-4 [&_svg]:h-5 [&_svg]:w-5 seice-pop-icon ${t.iconWrap}`}>
            {icon}
          </span>
        )}
        <div className="min-w-0 text-left">
          <DialogTitle className="text-base font-semibold leading-snug text-zinc-900">{title}</DialogTitle>
          {description && (
            <DialogDescription className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">
              {description}
            </DialogDescription>
          )}
        </div>
      </div>
    </div>
  );
}
