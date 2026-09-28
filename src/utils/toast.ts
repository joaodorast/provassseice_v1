import type { ActionResult } from '../components/dashboard/ActionResultDialog';

// Mesma API do sonner (toast.success(titulo, { description, duration })),
// mas exibida no modal central padrão (ActionResultHost) em vez do aviso lateral.

type ToastOptions = {
  description?: string;
  duration?: number;
};

type ToastEntry = {
  result: ActionResult;
  durationMs?: number;
};

let current: ToastEntry | null = null;
let queue: ToastEntry[] = [];
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCurrentToast() {
  return current;
}

export function closeCurrentToast() {
  current = queue.shift() ?? null;
  emit();
}

function show(type: ActionResult['type'], text: string, options?: ToastOptions) {
  // Mensagens com quebra de linha: primeira linha vira o título, o resto o texto
  const [firstLine, ...rest] = String(text).split('\n');
  const body = rest.join('\n').trim();
  const message = [body, options?.description].filter(Boolean).join('\n\n');

  const entry: ToastEntry = {
    result: { type, title: firstLine.trim(), message: message || undefined },
    durationMs: options?.duration
  };

  // Um erro na tela não é substituído por avisos seguintes: eles esperam na fila
  if (current?.result.type === 'error' && type !== 'error') {
    queue.push(entry);
  } else {
    current = entry;
  }
  emit();
}

export const toast = {
  success: (text: string, options?: ToastOptions) => show('success', text, options),
  error: (text: string, options?: ToastOptions) => show('error', text, options),
  info: (text: string, options?: ToastOptions) => show('info', text, options),
  warning: (text: string, options?: ToastOptions) => show('warning', text, options)
};
