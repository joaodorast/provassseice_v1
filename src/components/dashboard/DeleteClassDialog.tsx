import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Trash2, UserMinus, Users, ListChecks, Loader2, AlertCircle } from 'lucide-react';
import { apiService } from '../../utils/api';
import { PopupHeader, POPUP_BUTTON } from './PopupHeader';

export type DeleteClassMode = 'class-only' | 'with-students' | 'selected';

type ClassInfo = { id: string; name: string; grade?: string; shift?: string; year?: string };
type Student = { id: string; name: string; class?: string; registration?: string };

type Props = {
  classItem: ClassInfo | null;
  loading: boolean;
  onCancel: () => void;
  // studentIds: alunos a excluir (modos com exclusão) ou a desvincular da turma (modo 'class-only')
  onConfirm: (mode: DeleteClassMode, studentIds: string[]) => void;
};

// Alunos são vinculados à turma pelo nome (campo "class"), sem diferenciar maiúsculas
const sameClass = (a?: string, b?: string) => (a || '').trim().toLowerCase() === (b || '').trim().toLowerCase();

export function DeleteClassDialog({ classItem, loading, onCancel, onConfirm }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState(false);
  const [mode, setMode] = useState<DeleteClassMode>('class-only');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Ao abrir para uma turma, busca os alunos vinculados a ela
  useEffect(() => {
    if (!classItem) return;
    setMode('class-only');
    setSelected(new Set());
    setStudentsError(false);
    setLoadingStudents(true);
    apiService.getStudents()
      .then((res: any) => {
        setStudents((res?.students || []).filter((s: Student) => sameClass(s.class, classItem.name)));
      })
      .catch(() => {
        setStudents([]);
        setStudentsError(true);
      })
      .finally(() => setLoadingStudents(false));
  }, [classItem?.id]);

  if (!classItem) return null;

  const count = students.length;
  const allIds = students.map(s => s.id);
  const chosenIds = mode === 'with-students' ? allIds : mode === 'selected' ? Array.from(selected) : allIds;
  // Sem a lista de alunos, só é seguro apagar a turma sem mexer neles
  const canChooseStudents = !studentsError && count > 0;
  const confirmDisabled = loading || loadingStudents
    || (mode !== 'class-only' && !canChooseStudents)
    || (mode === 'selected' && selected.size === 0);

  const toggleStudent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allSelected = count > 0 && selected.size === count;

  const confirmLabel = mode === 'class-only'
    ? 'Excluir só a turma'
    : mode === 'with-students'
      ? `Excluir turma e ${count} aluno${count !== 1 ? 's' : ''}`
      : `Excluir turma e ${selected.size} aluno${selected.size !== 1 ? 's' : ''}`;

  const option = (value: DeleteClassMode, title: string, text: string, Icon: React.ElementType, disabled = false) => (
    <button
      type="button"
      onClick={() => !disabled && setMode(value)}
      disabled={disabled}
      className={`w-full text-left flex items-start gap-3 rounded-xl border-2 p-4 transition-all duration-200 ${
        mode === value
          ? 'border-zinc-800 bg-zinc-50 shadow-md'
          : 'border-zinc-200 bg-white hover:border-zinc-400'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
        mode === value ? 'bg-zinc-800 text-amber-400' : 'bg-zinc-100 text-zinc-600'
      }`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="space-y-0.5">
        <span className="block font-semibold text-zinc-900">{title}</span>
        <span className="block text-sm text-zinc-600">{text}</span>
      </span>
    </button>
  );

  return (
    <Dialog open={!!classItem} onOpenChange={(open) => { if (!open && !loading) onCancel(); }}>
      <DialogContent className="sm:max-w-3xl bg-zinc-50 border-zinc-200/80 p-0 gap-0 overflow-hidden rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] before:hidden">
        <PopupHeader
          tone="danger"
          icon={<Trash2 />}
          title="Excluir turma"
          description={
            <>
              {classItem.name}
              {[classItem.grade, classItem.shift, classItem.year].filter(Boolean).length > 0 && (
                <> · {[classItem.grade, classItem.shift, classItem.year].filter(Boolean).join(' · ')}</>
              )}
            </>
          }
        />

        <div className="mx-5 my-5 space-y-4 rounded-xl border border-zinc-200 bg-white p-5">
          {loadingStudents ? (
            <div className="flex items-center gap-2 py-6 text-zinc-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando os alunos desta turma...
            </div>
          ) : studentsError ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-zinc-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              Não foi possível carregar os alunos. Você ainda pode excluir só a turma, sem mexer nos alunos.
            </div>
          ) : count === 0 ? (
            <p className="text-zinc-700">Esta turma não tem alunos vinculados. Só a turma será excluída.</p>
          ) : (
            <>
              <p className="text-zinc-700">
                Esta turma tem <strong>{count}</strong> aluno{count !== 1 ? 's' : ''} vinculado{count !== 1 ? 's' : ''}. O que fazer com eles?
              </p>

              <div className="space-y-2">
                {option('class-only', 'Manter os alunos', 'Apaga só a turma. Os alunos continuam cadastrados, sem turma.', UserMinus)}
                {option('with-students', 'Excluir a turma e todos os alunos', `Apaga a turma e os ${count} alunos vinculados a ela.`, Users, !canChooseStudents)}
                {option('selected', 'Escolher quais alunos excluir', 'Marque na lista abaixo os alunos que devem ser excluídos.', ListChecks, !canChooseStudents)}
              </div>

              {mode === 'selected' && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50">
                  <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5">
                    <span className="text-sm font-medium text-zinc-700">
                      {selected.size} de {count} selecionado{selected.size !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      className="text-sm font-semibold text-zinc-800 underline-offset-2 hover:underline"
                      onClick={() => setSelected(allSelected ? new Set() : new Set(allIds))}
                    >
                      {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>
                  <ul className="max-h-60 divide-y divide-zinc-200 overflow-y-auto">
                    {students.map(s => (
                      <li key={s.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-white">
                          <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleStudent(s.id)} />
                          <span className="flex-1 text-sm font-medium text-zinc-900">{s.name}</span>
                          {s.registration && <span className="text-xs text-zinc-500">{s.registration}</span>}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button variant="outline" onClick={onCancel} disabled={loading} className={POPUP_BUTTON.cancel}>
              Cancelar
            </Button>
            <Button
              onClick={() => onConfirm(mode, chosenIds)}
              disabled={confirmDisabled}
              className={POPUP_BUTTON.danger}
            >
              {loading ? 'Excluindo...' : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
