import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { Dialog, DialogContent } from '../ui/dialog';
import { PopupHeader } from './PopupHeader';

// Seletor em modal com busca: abre por cima da tela, foca a busca, filtra enquanto digita
// (sem diferenciar acentos/maiúsculas, várias palavras em qualquer ordem) e permite rolar a
// lista inteira. Setas ↑ ↓ navegam, Enter escolhe, Esc fecha.

export type PickerItem = {
  id: string;
  title: string;
  subtitle?: string;
  // Texto curto à direita (ex: "32 alunos")
  meta?: string;
  // Etiqueta colorida ao lado do título (ex: "Aplicado")
  badge?: { label: string; tone?: 'green' | 'amber' | 'zinc' };
  // Ícone ou iniciais à esquerda
  leading?: React.ReactNode;
  // Termos extras que também contam na busca (ex: matrícula, turma)
  keywords?: string[];
};

const fold = (value: string) =>
  String(value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const normalize = (value: string) => fold(value).trim();

const BADGE_TONES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  zinc: 'bg-zinc-100 text-zinc-600 ring-zinc-200'
};

// Destaca no texto os trechos que batem com as palavras buscadas
function Highlight({ text: raw, terms }: { text: string; terms: string[] }) {
  if (!raw || terms.length === 0) return <>{raw}</>;
  const text = raw.normalize('NFC');
  const norm = fold(text);
  // Com o texto em NFC, tirar os acentos não muda o tamanho, então as posições encontradas
  // no texto sem acento valem no original (se mudar, mostra sem destaque)
  const marks = new Array(text.length).fill(false);
  terms.forEach(term => {
    let from = 0;
    while (term && (from = norm.indexOf(term, from)) !== -1) {
      for (let i = from; i < from + term.length && i < marks.length; i++) marks[i] = true;
      from += term.length;
    }
  });
  if (norm.length !== text.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    const on = marks[i];
    let j = i;
    while (j < text.length && marks[j] === on) j++;
    const chunk = text.slice(i, j);
    parts.push(on ? <mark key={i} className="rounded-[3px] bg-amber-200/80 text-zinc-900">{chunk}</mark> : chunk);
    i = j;
  }
  return <>{parts}</>;
}

export function SearchPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  items,
  selectedId,
  onSelect,
  searchPlaceholder = 'Digite para pesquisar...',
  emptyText = 'Nada encontrado',
  itemLabel = { one: 'item', many: 'itens' },
  onCreate,
  createLabel,
  canCreate,
  footerHint
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  items: PickerItem[];
  selectedId?: string;
  onSelect: (item: PickerItem) => void;
  searchPlaceholder?: string;
  emptyText?: string;
  itemLabel?: { one: string; many: string };
  // Quando informado, mostra a opção de criar um item novo com o texto buscado
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  // Permite esconder a opção de criar para um texto (ex: quando ele já é um item existente)
  canCreate?: (query: string) => boolean;
  // Dica fixa no rodapé da lista
  footerHint?: React.ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const terms = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);

  const filtered = useMemo(() => {
    if (terms.length === 0) return items;
    return items.filter(item => {
      const haystack = normalize([item.title, item.subtitle, item.meta, ...(item.keywords || [])].join(' '));
      return terms.every(t => haystack.includes(t));
    });
  }, [items, terms]);

  const trimmedQuery = query.trim();
  const showCreate = !!onCreate && !!trimmedQuery &&
    !items.some(item => normalize(item.title) === normalize(trimmedQuery)) &&
    (!canCreate || canCreate(trimmedQuery));
  // A opção "criar" entra como última linha navegável pelo teclado
  const rowCount = filtered.length + (showCreate ? 1 : 0);

  // Ao abrir: limpa a busca e já posiciona no item escolhido
  useEffect(() => {
    if (!open) return;
    setQuery('');
    const idx = items.findIndex(i => i.id === selectedId);
    setActive(idx >= 0 ? idx : 0);
    const t = setTimeout(() => {
      inputRef.current?.focus();
      listRef.current?.querySelector<HTMLElement>(`[data-row="${idx >= 0 ? idx : 0}"]`)?.scrollIntoView({ block: 'center' });
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const choose = (index: number) => {
    if (index < filtered.length) {
      onSelect(filtered[index]);
      onOpenChange(false);
    } else if (showCreate && onCreate) {
      onCreate(trimmedQuery);
      onOpenChange(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(a => (rowCount === 0 ? 0 : (a + 1) % rowCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(a => (rowCount === 0 ? 0 : (a - 1 + rowCount) % rowCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rowCount > 0) choose(active);
    }
  };

  const countText = terms.length === 0
    ? `${items.length} ${items.length === 1 ? itemLabel.one : itemLabel.many}`
    : `${filtered.length} de ${items.length} ${items.length === 1 ? itemLabel.one : itemLabel.many}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl bg-zinc-50 border-zinc-200/80 p-0 gap-0 overflow-hidden rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] before:hidden flex flex-col h-[min(85dvh,680px)]"
        onKeyDown={onKeyDown}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <PopupHeader icon={icon} title={title} description={description} />

        {/* Busca */}
        <div className="border-b border-zinc-200 bg-white px-5 py-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-12 w-full rounded-xl border border-zinc-300 bg-white pl-11 pr-11 text-[15px] text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
            <span className="tabular-nums">{countText}</span>
            <span className="hidden sm:flex items-center gap-1.5">
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[10px]">↑</kbd>
              <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[10px]">↓</kbd>
              navegar
              <kbd className="ml-2 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[10px]">Enter</kbd>
              escolher
              <kbd className="ml-2 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-sans text-[10px]">Esc</kbd>
              fechar
            </span>
          </div>
        </div>

        {/* Lista rolável */}
        <div ref={listRef} role="listbox" className="flex-1 overflow-y-auto overscroll-contain p-2 min-h-[200px]">
          {filtered.length === 0 && !showCreate && (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                <Search className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-800">{emptyText}</p>
              {trimmedQuery && (
                <>
                  <p className="text-xs text-zinc-500">Nenhum resultado para “{trimmedQuery}”.</p>
                  <button
                    type="button"
                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                    className="mt-1 text-xs font-medium text-amber-700 hover:underline"
                  >
                    Limpar busca
                  </button>
                </>
              )}
            </div>
          )}

          {filtered.map((item, index) => {
            const isSelected = item.id === selectedId;
            const isActive = index === active;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-row={index}
                onClick={() => choose(index)}
                onMouseMove={() => { if (active !== index) setActive(index); }}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                  isActive ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-white'
                } ${isSelected ? 'bg-white ring-1 ring-zinc-300' : ''}`}
              >
                {item.leading && (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-semibold text-zinc-700 [&_svg]:h-4 [&_svg]:w-4">
                    {item.leading}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900">
                      <Highlight text={item.title} terms={terms} />
                    </span>
                    {item.badge && (
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${BADGE_TONES[item.badge.tone || 'zinc']}`}>
                        {item.badge.label}
                      </span>
                    )}
                  </span>
                  {item.subtitle && (
                    <span className="mt-0.5 block truncate text-xs text-zinc-500">
                      <Highlight text={item.subtitle} terms={terms} />
                    </span>
                  )}
                </span>
                {item.meta && <span className="shrink-0 text-xs tabular-nums text-zinc-500">{item.meta}</span>}
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                </span>
              </button>
            );
          })}

          {showCreate && (
            <button
              type="button"
              data-row={filtered.length}
              onClick={() => choose(filtered.length)}
              onMouseMove={() => { if (active !== filtered.length) setActive(filtered.length); }}
              className={`mt-1 flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5 text-left transition-colors ${
                active === filtered.length ? 'border-amber-400 bg-amber-50' : 'border-zinc-300 hover:bg-white'
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Plus className="h-4 w-4" />
              </span>
              <span className="text-sm text-zinc-800">
                {createLabel ? createLabel(trimmedQuery) : `Usar “${trimmedQuery}”`}
              </span>
            </button>
          )}
        </div>
        {footerHint && (
          <div className="border-t border-zinc-200 bg-white px-5 py-3 text-xs text-zinc-500">{footerHint}</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Campo que parece um select: mostra o item escolhido e abre o SearchPickerDialog ao clicar
export function PickerField({
  value,
  placeholder,
  onClick,
  disabled,
  disabledHint,
  invalid
}: {
  value?: PickerItem | null;
  placeholder: string;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
  invalid?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-10 w-full items-center gap-3 rounded-md border bg-white px-3 py-2 text-left text-sm shadow-xs outline-none transition hover:border-zinc-400 focus-visible:border-amber-500 focus-visible:ring-4 focus-visible:ring-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-zinc-300 ${
        invalid ? 'border-red-500' : 'border-zinc-300'
      }`}
    >
      <Search className="h-4 w-4 shrink-0 text-zinc-400" />
      <span className="min-w-0 flex-1">
        {value ? (
          <>
            <span className="block truncate font-medium text-zinc-900">{value.title}</span>
            {value.subtitle && <span className="block truncate text-xs text-zinc-500">{value.subtitle}</span>}
          </>
        ) : (
          <span className="block truncate text-zinc-500">{disabled && disabledHint ? disabledHint : placeholder}</span>
        )}
      </span>
      {value?.meta && <span className="shrink-0 text-xs text-zinc-500">{value.meta}</span>}
      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
    </button>
  );
}
