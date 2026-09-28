import type React from 'react';

// Substitui o window.confirm do navegador pelo modal padrão de confirmação
// (ConfirmActionHost): `if (!(await confirmAction({ title: 'Excluir aluno?' }))) return;`

export type ConfirmOptions = {
  title: string;
  // Nome do item afetado, mostrado em destaque
  itemName?: string;
  itemDetail?: string;
  warning?: React.ReactNode;
  description?: string;
  confirmLabel?: string;
  // 'danger' para exclusões (vermelho, lixeira); 'warning' para as demais confirmações
  tone?: 'danger' | 'warning';
};

type ConfirmEntry = {
  options: ConfirmOptions;
  resolve: (confirmed: boolean) => void;
};

let current: ConfirmEntry | null = null;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function subscribeConfirm(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentConfirm() {
  return current;
}

export function answerConfirm(confirmed: boolean) {
  const entry = current;
  current = null;
  emit();
  entry?.resolve(confirmed);
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  // Uma confirmação ainda aberta é tratada como cancelada
  if (current) answerConfirm(false);
  return new Promise((resolve) => {
    current = { options, resolve };
    emit();
  });
}
