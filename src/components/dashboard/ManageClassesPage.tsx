import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { 
  GraduationCap, 
  Plus, 
  Trash2,
  Edit,
  Search,
  Users,
  BookOpen,
  Save,
  X,
  CheckCircle2,
  XCircle,
  Wand2,
  ArrowRight,
  Power
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../../utils/toast';
import { apiService } from '../../utils/api';
import { DeleteClassDialog, DeleteClassMode } from './DeleteClassDialog';

// Executa uma ação em cada item, em lotes de 10 para não sobrecarregar a API.
// Devolve quantos falharam (erro de rede ou resposta sem sucesso).
async function runInBatches(ids: string[], action: (id: string) => Promise<any>, size = 10): Promise<number> {
  let failed = 0;
  for (let i = 0; i < ids.length; i += size) {
    const results = await Promise.allSettled(ids.slice(i, i + size).map(action));
    failed += results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value?.success === false)).length;
  }
  return failed;
}
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import {
  STAGE_LABELS,
  StageKey,
  classifySeries,
  sortSeries,
  seriesOrder,
  normalizeText,
  findRegisteredSeries,
  looksLikeSeriesName,
  inferSeriesFromClassCode
} from '../../utils/series';

type ClassFix = { classItem: Class; name: string; grade: string; reason: string };

type Class = {
  id: string;
  name: string;
  grade: string;
  shift: string;
  year: string;
  studentCount: number;
  createdAt: string;
  // Turmas antigas não têm o campo: contam como ativas
  isActive?: boolean;
};

const isClassActive = (c: { isActive?: boolean }) => c.isActive !== false;

type ActionResult = {
  type: 'success' | 'error';
  title: string;
  message: string;
  details?: string[];
};

// Lê o corpo da resposta sem quebrar quando o servidor não devolve JSON
async function readJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

// Traduz a falha da requisição num motivo legível para o usuário
function describeFailure(response: Response, result: any): string {
  if (result?.error) return result.error;
  if (response.status === 401 || response.status === 403) return 'Sem permissão para realizar esta ação.';
  if (response.status === 404) return 'O serviço de turmas não foi encontrado no servidor.';
  if (response.status === 409) return 'Já existe uma turma com esses dados.';
  if (response.status >= 500) return `Erro interno no servidor (código ${response.status}). Tente novamente em instantes.`;
  return `O servidor recusou a operação (código ${response.status}).`;
}

const NETWORK_FAILURE = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.';

const RESULT_AUTO_CLOSE_MS = 4000;

const SHIFT_OPTIONS = ['Manhã', 'Tarde', 'Noite'];

// Turmas antigas foram salvas como Matutino/Vespertino/Noturno
const LEGACY_SHIFTS: Record<string, string> = {
  matutino: 'Manhã',
  vespertino: 'Tarde',
  noturno: 'Noite'
};

function normalizeShift(shift: string): string {
  return LEGACY_SHIFTS[(shift || '').trim().toLowerCase()] || shift;
}

// Barra que esvazia mostrando quanto falta para o modal fechar sozinho
function AutoCloseBar({ className }: { className: string }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div className="w-full h-1 rounded-full bg-black/5 overflow-hidden">
      <div
        className={`h-full rounded-full ${className}`}
        style={{
          width: started ? '0%' : '100%',
          transition: `width ${RESULT_AUTO_CLOSE_MS}ms linear`
        }}
      />
    </div>
  );
}

function missingFields(data: { name: string; grade: string; shift: string }): string[] {
  return [
    !data.name.trim() && 'Nome da Turma',
    !data.grade.trim() && 'Curso',
    !data.shift && 'Turno'
  ].filter(Boolean) as string[];
}

export function ManageClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingClass, setDeletingClass] = useState<Class | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);
  const [newClass, setNewClass] = useState({
    name: '',
    grade: '',
    shift: '',
    year: new Date().getFullYear().toString()
  });

  // Cursos cadastrados em "Gerenciar Cursos" (cada turma pertence a um deles)
  const [registeredSeries, setRegisteredSeries] = useState<string[]>([]);
  const [fixingClasses, setFixingClasses] = useState(false);

  useEffect(() => {
    loadClasses();
    loadSeries();
  }, []);

  const loadSeries = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      if (response.ok) {
        const result = await response.json();
        if (result.success) setRegisteredSeries(result.series || []);
      }
    } catch (error) {
      console.error('Error loading series:', error);
    }
  };

  // Curso "oficial" da turma: o nome cadastrado equivalente, se houver
  const courseOf = (c: { grade: string }) => findRegisteredSeries(c.grade || '', registeredSeries) || c.grade || '';
  const isRegisteredCourse = (c: { grade: string }) => !!findRegisteredSeries(c.grade || '', registeredSeries);

  // Turmas com dados trocados: nome = curso ("9º Ano") e curso = código ("9001 - CE"),
  // ou curso preenchido com o código da turma
  const classFixes: ClassFix[] = registeredSeries.length === 0 ? [] : classes.flatMap((c): ClassFix[] => {
    if (isRegisteredCourse(c)) return [];
    if (looksLikeSeriesName(c.name, registeredSeries) && c.grade && !looksLikeSeriesName(c.grade, registeredSeries)) {
      return [{
        classItem: c,
        name: c.grade,
        grade: findRegisteredSeries(c.name, registeredSeries) || c.name.replace(/[°ª]/g, 'º'),
        reason: 'Nome e curso trocados'
      }];
    }
    const inferred = inferSeriesFromClassCode(c.name, registeredSeries) || inferSeriesFromClassCode(c.grade, registeredSeries);
    if (inferred) {
      return [{ classItem: c, name: c.name, grade: inferred, reason: 'Curso deduzido pelo código da turma' }];
    }
    return [];
  });

  const handleFixClasses = async () => {
    try {
      setFixingClasses(true);

      // Cursos que ainda não existem em "Gerenciar Cursos" (ex: 9º Ano) são cadastrados antes
      const missingSeries = Array.from(new Set(
        classFixes.map(f => f.grade).filter(g => !findRegisteredSeries(g, registeredSeries))
      ));
      if (missingSeries.length > 0) {
        const updatedSeries = [...registeredSeries, ...missingSeries];
        const seriesResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({ series: updatedSeries })
        });
        if (seriesResponse.ok) setRegisteredSeries(updatedSeries);
      }

      let fixed = 0;
      for (const fix of classFixes) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes/${fix.classItem.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          },
          body: JSON.stringify({
            name: fix.name,
            grade: fix.grade,
            shift: fix.classItem.shift,
            year: fix.classItem.year
          })
        });
        if (response.ok) fixed++;
      }
      await loadClasses();
      setActionResult(fixed === classFixes.length
        ? { type: 'success', title: 'Turmas corrigidas!', message: `${fixed} turma(s) agora estão no curso certo.` }
        : { type: 'error', title: 'Correção incompleta', message: `${fixed} de ${classFixes.length} turmas foram corrigidas. Tente novamente.` });
    } catch (error) {
      console.error('Error fixing classes:', error);
      setActionResult({ type: 'error', title: 'Correção não concluída', message: NETWORK_FAILURE });
    } finally {
      setFixingClasses(false);
    }
  };

  // Cursos agrupados por etapa para o seletor
  const seriesByStage = (['fund1', 'fund2', 'emVestibular', 'emTecnico', 'outros'] as StageKey[])
    .map(stage => ({
      stage,
      items: sortSeries(registeredSeries.filter(s => classifySeries(s).stage === stage))
    }))
    .filter(g => g.items.length > 0);

  useEffect(() => {
    if (!actionResult) return;
    const timer = setTimeout(() => setActionResult(null), RESULT_AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [actionResult]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const [response, studentsResponse] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }),
        apiService.getStudents()
      ]);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Conta os alunos de cada turma pelo nome (o studentCount salvo no servidor não é atualizado)
          const counts = new Map<string, number>();
          (studentsResponse?.students || []).forEach((s: any) => {
            const key = String(s.class || '').trim().toLowerCase();
            if (key) counts.set(key, (counts.get(key) || 0) + 1);
          });
          setClasses((result.classes || []).map((cls: Class) => ({
            ...cls,
            studentCount: counts.get(String(cls.name || '').trim().toLowerCase()) || 0
          })));
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Erro ao carregar turmas');
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async () => {
    const missing = missingFields(newClass);
    if (missing.length > 0) {
      setActionResult({
        type: 'error',
        title: 'Turma não criada',
        message: 'Preencha os campos obrigatórios que estão faltando:',
        details: missing
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(newClass)
      });
      
      const result = await readJson(response);

      if (!response.ok || result.success === false) {
        setActionResult({
          type: 'error',
          title: 'Turma não criada',
          message: describeFailure(response, result)
        });
        return;
      }

      setActionResult({
        type: 'success',
        title: 'Turma criada com sucesso!',
        message: `A turma "${newClass.name}" foi cadastrada e já está disponível na lista.`,
        details: [`Curso: ${newClass.grade}`, `Turno: ${newClass.shift}`, `Ano letivo: ${newClass.year}`]
      });
      setNewClass({ name: '', grade: '', shift: '', year: new Date().getFullYear().toString() });
      setShowAddForm(false);
      await loadClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      setActionResult({ type: 'error', title: 'Turma não criada', message: NETWORK_FAILURE });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    const missing = missingFields(editingClass);
    if (missing.length > 0) {
      setActionResult({
        type: 'error',
        title: 'Alterações não salvas',
        message: 'Preencha os campos obrigatórios que estão faltando:',
        details: missing
      });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          name: editingClass.name,
          grade: editingClass.grade,
          shift: editingClass.shift,
          year: editingClass.year,
          isActive: isClassActive(editingClass)
        })
      });
      
      const result = await readJson(response);

      if (!response.ok || result.success === false) {
        setActionResult({
          type: 'error',
          title: 'Alterações não salvas',
          message: describeFailure(response, result)
        });
        return;
      }

      setActionResult({
        type: 'success',
        title: 'Turma atualizada com sucesso!',
        message: `As alterações da turma "${editingClass.name}" foram salvas.`
      });
      setEditingClass(null);
      await loadClasses();
    } catch (error) {
      console.error('Error updating class:', error);
      setActionResult({ type: 'error', title: 'Alterações não salvas', message: NETWORK_FAILURE });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (mode: DeleteClassMode, studentIds: string[]) => {
    if (!deletingClass) return;
    const id = deletingClass.id;

    try {
      setDeleteLoading(true);
      // Alunos primeiro: excluídos (ou só desvinculados, se a turma for mantida) antes da turma
      let studentsFailed = 0;
      if (mode === 'class-only') {
        studentsFailed = await runInBatches(studentIds, (sid) => apiService.updateStudent(sid, { class: '', grade: '' }));
      } else if (studentIds.length > 0) {
        studentsFailed = await runInBatches(studentIds, (sid) => apiService.deleteStudent(sid));
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        toast.error(result.error || 'Erro ao excluir turma');
        return;
      }
      
      setDeletingClass(null);
      if (mode === 'class-only') {
        toast.success(studentIds.length > 0 ? `Turma excluída. ${studentIds.length} aluno(s) ficaram sem turma.` : 'Turma excluída com sucesso!');
      } else {
        toast.success(`Turma e ${studentIds.length} aluno(s) excluídos com sucesso!`);
      }
      if (studentsFailed > 0) {
        toast.warning(`${studentsFailed} aluno(s) não puderam ser ${mode === 'class-only' ? 'desvinculados' : 'excluídos'}. Confira a lista de alunos.`);
      }
      await loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Erro ao excluir turma');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleToggleActive = async (classItem: Class) => {
    const nextActive = !isClassActive(classItem);
    try {
      setLoading(true);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/classes/${classItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          name: classItem.name,
          grade: classItem.grade,
          shift: classItem.shift,
          year: classItem.year,
          isActive: nextActive
        })
      });
      const result = await readJson(response);
      if (!response.ok || result.success === false) {
        toast.error(nextActive ? 'Erro ao ativar turma' : 'Erro ao inativar turma');
        return;
      }
      setClasses(prev => prev.map(c => c.id === classItem.id ? { ...c, isActive: nextActive } : c));
      toast.success(nextActive ? 'Turma ativada!' : 'Turma inativada!', { description: classItem.name });
    } catch (error) {
      console.error('Error toggling class:', error);
      toast.error(NETWORK_FAILURE);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = classes
    .filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.shift.toLowerCase().includes(searchTerm.toLowerCase())
    )
    // Agrupa por curso (na ordem natural) e ordena as turmas pelo nome
    .sort((a, b) =>
      seriesOrder(courseOf(a)) - seriesOrder(courseOf(b)) ||
      courseOf(a).localeCompare(courseOf(b), 'pt-BR') ||
      a.name.localeCompare(b.name, 'pt-BR', { numeric: true })
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Turmas</h1>
          <p className="text-slate-600">
            Cadastre e organize as turmas da instituição
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Turma
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Turmas</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">{classes.length}</h3>
                {classes.some(c => !isClassActive(c)) && (
                  <p className="text-xs text-slate-500 mt-1">
                    {classes.filter(c => !isClassActive(c)).length} inativa(s)
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-zinc-800" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total de Alunos</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {classes.reduce((sum, c) => sum + (c.studentCount || 0), 0)}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Cursos Diferentes</p>
                <h3 className="text-2xl font-bold text-slate-800 mt-1">
                  {new Set(classes.map(c => normalizeText(courseOf(c)))).size}
                </h3>
              </div>
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Turmas com curso errado */}
      {classFixes.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Wand2 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900">
                    {classFixes.length} turma{classFixes.length !== 1 ? 's estão' : ' está'} com o curso errado
                  </p>
                  <p className="text-sm text-amber-800">
                    O código da turma (ex: 9001 - CE) foi salvo no lugar do curso. Todas as turmas do 9º ano devem ficar no curso "9º Ano".
                  </p>
                </div>
              </div>
              <Button
                onClick={handleFixClasses}
                disabled={fixingClasses}
                className="bg-amber-500 hover:bg-amber-600 text-zinc-900 flex-shrink-0"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                {fixingClasses ? 'Corrigindo...' : 'Corrigir automaticamente'}
              </Button>
            </div>
            <div className="rounded-lg border border-amber-200 bg-white divide-y divide-amber-100 text-sm">
              {classFixes.map(fix => (
                <div key={fix.classItem.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="text-slate-500 line-through">
                    {fix.classItem.name} · {fix.classItem.grade}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-600" />
                  <span className="font-medium text-slate-800">Turma {fix.name}</span>
                  <Badge variant="outline" className="bg-yellow-400 border-yellow-500 text-zinc-900">{fix.grade}</Badge>
                  <span className="text-xs text-slate-400 ml-auto">{fix.reason}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de criar/editar turma */}
      <Dialog
        open={showAddForm || !!editingClass}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddForm(false);
            setEditingClass(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-yellow-400 flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-6 h-6 text-zinc-900" />
              </div>
              <div>
                <DialogTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
                <DialogDescription>
                  {editingClass ? 'Altere os dados da turma' : 'Preencha os dados para cadastrar a turma'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (editingClass) handleUpdateClass(); else handleAddClass();
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="grade">Curso *</Label>
                {(() => {
                  const currentGrade = editingClass ? editingClass.grade : newClass.grade;
                  const selectedValue = findRegisteredSeries(currentGrade, registeredSeries) || '';
                  const setGrade = (value: string) => editingClass
                    ? setEditingClass({ ...editingClass, grade: value })
                    : setNewClass(prev => ({ ...prev, grade: value }));
                  return registeredSeries.length > 0 ? (
                    <>
                      <Select value={selectedValue} onValueChange={setGrade}>
                        <SelectTrigger id="grade" className="mt-1">
                          <SelectValue placeholder="Selecione o curso (ex: 9º Ano)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {seriesByStage.map(group => (
                            <SelectGroup key={group.stage}>
                              <SelectLabel className="text-xs uppercase tracking-wide text-slate-500">
                                {STAGE_LABELS[group.stage]}
                              </SelectLabel>
                              {group.items.map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentGrade && !selectedValue && (
                        <p className="text-xs text-amber-700 mt-1">
                          Curso atual "{currentGrade}" não está cadastrado. Escolha um da lista.
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <Input
                        id="grade"
                        value={currentGrade}
                        onChange={(e) => setGrade(e.target.value)}
                        placeholder="Ex: 9º Ano"
                        className="mt-1"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Cadastre os cursos em "Gerenciar Cursos" para escolher da lista.
                      </p>
                    </>
                  );
                })()}
              </div>
              <div>
                <Label htmlFor="name">Nome / código da turma *</Label>
                <Input
                  id="name"
                  autoFocus
                  value={editingClass ? editingClass.name : newClass.name}
                  onChange={(e) => editingClass
                    ? setEditingClass({ ...editingClass, name: e.target.value })
                    : setNewClass(prev => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex: 9001 - CE, Turma A"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Várias turmas podem ter o mesmo curso.
                </p>
              </div>
              <div>
                <Label htmlFor="year">Ano Letivo</Label>
                <Input
                  id="year"
                  value={editingClass ? editingClass.year : newClass.year}
                  onChange={(e) => editingClass
                    ? setEditingClass({ ...editingClass, year: e.target.value })
                    : setNewClass(prev => ({ ...prev, year: e.target.value }))
                  }
                  placeholder="Ex: 2026"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Turno *</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {SHIFT_OPTIONS.map((option) => {
                    const current = editingClass ? editingClass.shift : newClass.shift;
                    const selected = current === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => editingClass
                          ? setEditingClass({ ...editingClass, shift: option })
                          : setNewClass(prev => ({ ...prev, shift: option }))
                        }
                        className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                          selected
                            ? 'bg-zinc-900 text-yellow-400 border-zinc-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
              {editingClass && (
                <div className="sm:col-span-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                  <div>
                    <Label htmlFor="classActive">Turma ativa</Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Turmas inativas continuam com seus alunos e resultados, mas ficam marcadas como inativas na lista.
                    </p>
                  </div>
                  <Switch
                    id="classActive"
                    checked={isClassActive(editingClass)}
                    onCheckedChange={(checked) => setEditingClass({ ...editingClass, isActive: checked })}
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                className="border-red-300 bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800"
                onClick={() => { setShowAddForm(false); setEditingClass(null); }}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {editingClass ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {loading ? 'Salvando...' : editingClass ? 'Salvar Alterações' : 'Criar Turma'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de resultado (sucesso / falha) */}
      <Dialog open={!!actionResult} onOpenChange={(open) => { if (!open) setActionResult(null); }}>
        <DialogContent
          className={`max-w-md text-center ${
            actionResult?.type === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-red-100 border-red-300'
          }`}
        >
          {actionResult && (
            <div className="flex flex-col items-center gap-4 py-2">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  actionResult.type === 'success' ? 'bg-green-100' : 'bg-red-200'
                }`}
              >
                {actionResult.type === 'success'
                  ? <CheckCircle2 className="w-9 h-9 text-green-600" />
                  : <XCircle className="w-9 h-9 text-red-600" />}
              </div>
              <div className="space-y-1">
                <DialogTitle className={actionResult.type === 'success' ? 'text-green-800' : 'text-red-800'}>
                  {actionResult.title}
                </DialogTitle>
                <DialogDescription className={actionResult.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                  {actionResult.message}
                </DialogDescription>
              </div>
              {actionResult.details && actionResult.details.length > 0 && (
                <ul
                  className={`w-full rounded-lg border bg-white/70 px-4 py-3 text-sm text-left space-y-1 ${
                    actionResult.type === 'success'
                      ? 'border-green-200 text-green-800'
                      : 'border-red-300 text-red-800'
                  }`}
                >
                  {actionResult.details.map((d) => (
                    <li key={d}>• {d}</li>
                  ))}
                </ul>
              )}
              <Button
                autoFocus
                onClick={() => setActionResult(null)}
                className={`w-full text-white ${
                  actionResult.type === 'success'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {actionResult.type === 'success' ? 'OK, entendi' : 'Voltar e corrigir'}
              </Button>
              <AutoCloseBar
                key={`${actionResult.type}-${actionResult.title}-${actionResult.message}`}
                className={actionResult.type === 'success' ? 'bg-green-400' : 'bg-red-500'}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Classes List */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle>Lista de Turmas</CardTitle>
          <CardDescription>
            <div className="flex items-center space-x-2 mt-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar turma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Ano Letivo</TableHead>
                  <TableHead>Alunos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <GraduationCap className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-600">
                        {searchTerm ? 'Nenhuma turma encontrada' : 'Nenhuma turma cadastrada ainda'}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {!searchTerm && 'Clique em "Nova Turma" para começar'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((classItem, idx) => {
                    const course = courseOf(classItem);
                    const prevCourse = idx > 0 ? courseOf(filteredClasses[idx - 1]) : null;
                    const groupCount = filteredClasses.filter(c => courseOf(c) === course).length;
                    return (
                    <React.Fragment key={classItem.id}>
                    {course !== prevCourse && (
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableCell colSpan={6} className="py-2">
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-slate-500" />
                            <span className="font-semibold text-slate-800">{course || 'Sem curso'}</span>
                            <span className="text-xs text-slate-500">
                              {groupCount} turma{groupCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className={isClassActive(classItem) ? '' : 'opacity-60'}>
                      <TableCell className="font-medium pl-8">
                        {classItem.name}
                        {!isClassActive(classItem) && (
                          <Badge variant="outline" className="ml-2 bg-slate-100 border-slate-300 text-slate-600">Inativa</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isRegisteredCourse(classItem) ? (
                          <Badge variant="outline" className="bg-yellow-400 border-yellow-500 text-zinc-900">{course}</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-slate-100 border-dashed border-slate-300 text-slate-600" title="Curso não cadastrado em Gerenciar Cursos">
                            {classItem.grade || 'Sem curso'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{normalizeShift(classItem.shift)}</TableCell>
                      <TableCell>{classItem.year}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {classItem.studentCount || 0} alunos
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setEditingClass({ ...classItem, shift: normalizeShift(classItem.shift) })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loading}
                            onClick={() => handleToggleActive(classItem)}
                            title={isClassActive(classItem) ? 'Inativar turma' : 'Ativar turma'}
                            aria-label={isClassActive(classItem) ? 'Inativar turma' : 'Ativar turma'}
                          >
                            <Power className={`w-4 h-4 ${isClassActive(classItem) ? '' : 'text-green-600'}`} />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setDeletingClass(classItem)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DeleteClassDialog
        classItem={deletingClass}
        loading={deleteLoading}
        onConfirm={handleDeleteClass}
        onCancel={() => setDeletingClass(null)}
      />
    </div>
  );
}
