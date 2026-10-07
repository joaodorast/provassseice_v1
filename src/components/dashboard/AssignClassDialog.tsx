import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { GraduationCap, Plus, Loader2, UserX } from 'lucide-react';
import { apiService } from '../../utils/api';
import { toast } from '../../utils/toast';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { inferSeriesFromClassCode, sortSeries } from '../../utils/series';
import { PopupHeader, POPUP_BUTTON } from './PopupHeader';

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
  // Cursos de "Gerenciar Cursos": a turma nova precisa estar em um deles para aparecer em "Criar Simulado"
  const [courses, setCourses] = useState<string[]>([]);

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
    Promise.all([
      apiService.getStudents(),
      apiService.getClasses(),
      fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      }).then(r => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([studentsRes, classesRes, seriesRes]: any[]) => {
        setStudents((studentsRes?.students || []).filter((s: Student) => !s.class?.trim()));
        setClasses((classesRes?.classes || []).filter((c: any) => c?.name));
        setCourses(sortSeries((seriesRes?.series || []).filter(Boolean).map((c: string) => String(c).trim())));
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
  const canSave = !saving && selected.size > 0 && !!targetName && !nameAlreadyExists && (mode === 'existing' || !!newGrade);

  // Ao digitar o código da turma, já sugere o curso (9001 -> 9º Ano) se o professor ainda não escolheu
  const handleNewNameChange = (value: string) => {
    setNewName(value);
    const inferred = inferSeriesFromClassCode(value, courses);
    if (inferred && (!newGrade || newGrade === inferSeriesFromClassCode(newName, courses))) setNewGrade(inferred);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      // Turma nova: cria antes de atribuir os alunos
      if (mode === 'new') {
        const created = await apiService.createClass({
          name: trimmedNewName,
          grade: newGrade,
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
      <DialogContent className="sm:max-w-4xl bg-zinc-50 border-zinc-200/80 p-0 gap-0 overflow-hidden rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)] before:hidden">
        <PopupHeader
          tone="warning"
          icon={<UserX />}
          title="Atribuir turma a alunos sem turma"
          description="Marque os alunos e escolha uma turma existente ou crie uma nova."
        />

        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          {/* Lista de alunos sem turma */}
          <div className="flex min-h-[320px] flex-col rounded-xl border border-zinc-200 bg-white">
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
                  <Input value={newName} onChange={(e) => handleNewNameChange(e.target.value)} placeholder="Ex: 9001-CE" />
                  {nameAlreadyExists && (
                    <p className="text-xs text-red-600">Já existe uma turma com esse nome. Escolha a opção "Turma existente".</p>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Curso *</label>
                  <Select value={newGrade} onValueChange={setNewGrade}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={courses.length ? 'Escolha o curso' : 'Nenhum curso cadastrado'} />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {courses.length === 0 && !loading && (
                    <p className="text-xs text-zinc-500">Cadastre os cursos em "Gerenciar Cursos" primeiro.</p>
                  )}
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
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className={POPUP_BUTTON.cancel}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={POPUP_BUTTON.primary}
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
