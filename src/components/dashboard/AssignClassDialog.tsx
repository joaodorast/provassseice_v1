import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { GraduationCap, Plus, Loader2, UserX } from 'lucide-react';
import { apiService } from '../../utils/api';
import { toast } from '../../utils/toast';

type Student = { id: string; name: string; class?: string; registration?: string };
type ClassItem = { id: string; name: string; grade?: string; shift?: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Chamado depois que os alunos são atribuídos, para a tela recarregar a lista
  onDone: () => void;
};

const SHIFTS = ['Manhã', 'Tarde', 'Noite'];

// Lote para não sobrecarregar a API ao atualizar muitos alunos
async function updateInBatches(ids: string[], className: string): Promise<number> {
  let failed = 0;
  for (let i = 0; i < ids.length; i += 10) {
    const responses = await Promise.all(
      ids.slice(i, i + 10).map(id => apiService.updateStudent(id, { class: className }))
    );
    failed += responses.filter((r: any) => !r?.success).length;
  }
  return failed;
}

export function AssignClassDialog({ open, onOpenChange, onDone }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // 'existing': escolher uma turma já criada; 'new': criar uma turma agora
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [chosenClass, setChosenClass] = useState('');
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newShift, setNewShift] = useState('Manhã');

  // Ao abrir, carrega os alunos sem turma e as turmas existentes
  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setMode('existing');
    setChosenClass('');
    setNewName('');
    setNewGrade('');
    setNewShift('Manhã');
    setLoading(true);
    Promise.all([apiService.getStudents(), apiService.getClasses()])
      .then(([studentsRes, classesRes]: any[]) => {
        setStudents((studentsRes?.students || []).filter((s: Student) => !s.class?.trim()));
        setClasses((classesRes?.classes || []).filter((c: any) => c?.name));
      })
      .catch(() => toast.error('Não foi possível carregar os alunos e as turmas'))
      .finally(() => setLoading(false));
  }, [open]);

  const allIds = students.map(s => s.id);
  const allSelected = allIds.length > 0 && selected.size === allIds.length;

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const trimmedNewName = newName.trim();
  const targetName = mode === 'existing' ? chosenClass : trimmedNewName;
  const nameAlreadyExists = mode === 'new' && classes.some(c => c.name.trim().toLowerCase() === trimmedNewName.toLowerCase());
  const canSave = !saving && selected.size > 0 && !!targetName && !nameAlreadyExists;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Turma nova: cria antes de atribuir os alunos
      if (mode === 'new') {
        const created = await apiService.createClass({
          name: trimmedNewName,
          grade: newGrade.trim() || trimmedNewName,
          shift: newShift,
          year: new Date().getFullYear().toString(),
        });
        if (!created?.success) throw new Error(created?.error || 'O servidor não confirmou a criação da turma');
      }

      const failed = await updateInBatches(Array.from(selected), targetName);
      if (failed > 0) {
        toast.warning(`${failed} aluno(s) não receberam a turma "${targetName}". Tente de novo.`);
      } else {
        toast.success(`${selected.size} aluno(s) atribuído(s) à turma "${targetName}"`);
      }
      onDone();
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning students to class:', error);
      toast.error('Erro ao atribuir turma: ' + ((error as Error)?.message || 'erro desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-4xl bg-zinc-100 border-zinc-300 p-0 gap-0 overflow-hidden rounded-3xl before:hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-700 px-7 py-6">
          <div className="pointer-events-none absolute -top-16 -right-12 h-44 w-44 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 via-amber-300 to-amber-500" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-zinc-900 shadow-lg">
              <UserX className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Atribuir turma a alunos sem turma</DialogTitle>
              <DialogDescription className="text-zinc-300">
                Marque os alunos e escolha uma turma existente ou crie uma nova.
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {/* Lista de alunos sem turma */}
          <div className="flex min-h-[320px] flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <span className="text-sm font-semibold text-zinc-800">
                {loading ? 'Carregando...' : `${students.length} aluno(s) sem turma`}
              </span>
              {students.length > 0 && (
                <button
                  type="button"
                  className="text-sm font-semibold text-zinc-800 underline-offset-2 hover:underline"
                  onClick={() => setSelected(allSelected ? new Set() : new Set(allIds))}
                >
                  {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              )}
            </div>
            {loading ? (
              <div className="flex flex-1 items-center justify-center gap-2 text-zinc-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando alunos...
              </div>
            ) : students.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-zinc-600">
                Todos os alunos já têm turma.
              </div>
            ) : (
              <ul className="max-h-[360px] flex-1 divide-y divide-zinc-200 overflow-y-auto">
                {students.map(s => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-zinc-50">
                      <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} />
                      <span className="flex-1 text-sm font-medium text-zinc-900">{s.name}</span>
                      {s.registration && <span className="text-xs text-zinc-500">{s.registration}</span>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Escolha da turma */}
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('existing')}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                  mode === 'existing' ? 'border-zinc-800 bg-zinc-50 shadow-md' : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <GraduationCap className="mr-1.5 inline h-4 w-4" /> Turma existente
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-all ${
                  mode === 'new' ? 'border-zinc-800 bg-zinc-50 shadow-md' : 'border-zinc-200 hover:border-zinc-400'
                }`}
              >
                <Plus className="mr-1.5 inline h-4 w-4" /> Criar nova turma
              </button>
            </div>

            {mode === 'existing' ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Turma</label>
                <Select value={chosenClass} onValueChange={setChosenClass}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={classes.length ? 'Escolha uma turma' : 'Nenhuma turma cadastrada'} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name}{c.grade ? ` - ${c.grade}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {classes.length === 0 && (
                  <p className="text-xs text-zinc-500">Use "Criar nova turma" ao lado para cadastrar a primeira.</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Nome da turma *</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: 9001-CE" />
                  {nameAlreadyExists && (
                    <p className="text-xs text-red-600">Já existe uma turma com esse nome. Escolha a opção "Turma existente".</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Curso / série</label>
                  <Input value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="Ex: 9º Ano" />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Turno</label>
                  <Select value={newShift} onValueChange={setNewShift}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SHIFTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="mt-auto space-y-3 pt-2">
              <p className="text-sm text-zinc-600">
                {selected.size} aluno(s) selecionado(s)
                {targetName ? <> · turma <strong className="text-zinc-900">{targetName}</strong></> : null}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="h-12 border-2 border-zinc-300 font-semibold">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  className="h-12 bg-gradient-to-r from-amber-500 to-zinc-800 font-semibold text-white shadow-lg hover:from-amber-600 hover:to-zinc-900 hover:shadow-xl"
                >
                  {saving ? 'Salvando...' : mode === 'new' ? 'Criar turma e atribuir' : 'Atribuir turma'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
