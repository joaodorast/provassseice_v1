import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  Users, 
  Download, 
  Plus, 
  Trash2,
  Edit,
  Search,
  Filter,
  AlertCircle,
  Eye,
  Image as ImageIcon,
  UserCheck,
  School,
  UserX
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { toast } from '../../utils/toast';
import { ActionResultDialog, ActionResult } from './ActionResultDialog';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { readStudentsFromFile, isStudentSpreadsheet, stripAccents, ensureClassesExist, ImportedStudent, saveImportedStudents, describeStudentImport } from '../../utils/student-import';
import { apiService } from '../../utils/api';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

type Student = {
  id: string;
  name: string;
  email: string;
  class: string;
  grade: string;
  registration: string;
  status: 'active' | 'inactive';
  createdAt: string;
};


// Gera e baixa um CSV que abre certo no Excel em português: separador ";", BOM UTF-8
// (para os acentos) e campos entre aspas quando necessário.
function downloadCsv(filename: string, rows: (string | number | undefined | null)[][]) {
  const escape = (v: string | number | undefined | null) => {
    const str = String(v ?? '');
    return /[";\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const content = '﻿' + rows.map(r => r.map(escape).join(';')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}


export function ManageStudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [importResult, setImportResult] = useState<ActionResult | null>(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    class: '',
    grade: '',
    registration: ''
  });
  // Filtros da lista: a lista só aparece depois que pelo menos um deles é preenchido
  const [filterName, setFilterName] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterRegistration, setFilterRegistration] = useState('');
  // Cursos vêm de "Gerenciar Cursos"; turmas de "Gerenciar Turmas" (cada turma pertence a um curso)
  const [registeredCourses, setRegisteredCourses] = useState<string[]>([]);
  const [registeredClasses, setRegisteredClasses] = useState<{ id: string; name: string; grade: string }[]>([]);
  // Exclusão: alunos marcados na tabela e a confirmação pendente (alunos ou turma inteira)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<
    { kind: 'students'; ids: string[] } | { kind: 'class'; name: string } | null
  >(null);
  const [deleteClassStudentsToo, setDeleteClassStudentsToo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // Cartões-resposta enviados na página "Enviar Imagens", agrupados por aluno
  const [studentImages, setStudentImages] = useState<Record<string, any[]>>({});
  const [viewingCardsOf, setViewingCardsOf] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
    loadStudentImages();
    loadCoursesAndClasses();
  }, []);

  const loadCoursesAndClasses = async () => {
    try {
      const [coursesResponse, classesResponse] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/subjects-series`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).then(r => (r.ok ? r.json() : null)).catch(() => null),
        apiService.getClasses().catch(() => null),
      ]);
      setRegisteredCourses((coursesResponse?.series || []).filter(Boolean).map((c: string) => String(c).trim()));
      setRegisteredClasses(
        (classesResponse?.classes || [])
          .filter((c: any) => c?.name)
          .map((c: any) => ({ id: String(c.id), name: String(c.name).trim(), grade: String(c.grade || '').trim() }))
      );
    } catch (error) {
      console.error('Error loading courses/classes:', error);
    }
  };

  // Carrega em segundo plano os cartões enviados (a lista de alunos aparece sem esperar as fotos)
  const loadStudentImages = async () => {
    try {
      const response = await apiService.getImages();
      const grouped: Record<string, any[]> = {};
      (response?.images || []).forEach((image: any) => {
        if (!image?.studentId || image.studentId === 'batch') return;
        (grouped[image.studentId] = grouped[image.studentId] || []).push(image);
      });
      setStudentImages(grouped);
    } catch (error) {
      console.error('Error loading student images:', error);
    }
  };

  const cardsOf = (student: Student): any[] => studentImages[student.id] || [];

  const openImageFullSize = async (dataUrl: string) => {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (error) {
      toast.error('Não foi possível abrir a imagem em tamanho real');
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getStudents();
      setStudents(response.students || []);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Erro ao carregar lista de alunos');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Limpa o input já, para o mesmo arquivo poder ser escolhido de novo
    event.target.value = '';
    if (file) await importFile(file);
  };

  const handleFileDrop = async (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDraggingFile(false);
    if (loading) return;
    const file = event.dataTransfer.files?.[0];
    if (file) await importFile(file);
  };

  const importFile = async (file: File) => {
    if (!isStudentSpreadsheet(file)) {
      setImportResult({
        type: 'error',
        title: 'Arquivo não suportado',
        message: 'Selecione um arquivo CSV ou Excel (.xlsx, .xls).'
      });
      return;
    }

    try {
      setLoading(true);
      const newStudents: ImportedStudent[] = await readStudentsFromFile(file);

      if (newStudents.length === 0) {
        setImportResult({
          type: 'error',
          title: 'Nenhum aluno importado',
          message: 'Nenhum aluno válido encontrado no arquivo. Confira se há uma coluna com o nome do aluno.'
        });
        return;
      }

      console.log(`Importing ${newStudents.length} students:`, newStudents.slice(0, 3));

      const summary = await saveImportedStudents(newStudents);
      await Promise.all([loadStudents(), loadCoursesAndClasses()]);
      setImportResult(describeStudentImport(summary));
    } catch (error) {
      console.error('Error processing file:', error);
      setImportResult({
        type: 'error',
        title: 'Falha na importação',
        message: 'Erro ao processar arquivo: ' + (error.message || 'Erro desconhecido')
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.createStudents([newStudent]);
      if (!response?.success) throw new Error(response?.error || 'O servidor não confirmou o cadastro');
      const createdClasses = await ensureClassesExist([newStudent]);
      if (createdClasses > 0) toast.success('Turma cadastrada automaticamente em Gerenciar Turmas');
      await loadStudents();
      setNewStudent({ name: '', email: '', class: '', grade: '', registration: '' });
      setShowAddForm(false);
      toast.success('Aluno adicionado com sucesso!');
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Erro ao adicionar aluno');
    } finally {
      setLoading(false);
    }
  };

  // Apaga os alunos em lotes paralelos (cada aluno é uma chave separada no servidor).
  // A API não lança erro quando o servidor recusa; por isso confere cada resposta e
  // lança erro se algum aluno não foi apagado, em vez de mostrar sucesso.
  const deleteStudentsByIds = async (ids: string[]) => {
    let failed = 0;
    let lastError = '';
    for (let i = 0; i < ids.length; i += 10) {
      const responses = await Promise.all(ids.slice(i, i + 10).map(id => apiService.deleteStudent(id)));
      responses.forEach(r => {
        if (!r?.success) { failed++; lastError = r?.error || lastError; }
      });
    }
    if (failed > 0) {
      throw new Error(`${failed} de ${ids.length} aluno(s) não foram apagados${lastError ? ` (${lastError})` : ''}`);
    }
  };

  const handleDeleteStudents = async (ids: string[]) => {
    try {
      setLoading(true);
      await deleteStudentsByIds(ids);
      setSelectedIds(new Set());
      await loadStudents();
      toast.success(ids.length === 1 ? 'Aluno removido com sucesso!' : `${ids.length} alunos removidos com sucesso!`);
    } catch (error) {
      console.error('Error deleting students:', error);
      await loadStudents();
      toast.error('Erro ao remover alunos: ' + ((error as Error)?.message || 'erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClass = async (className: string) => {
    const classesToDelete = registeredClassesMatching(className);
    const studentIds = deleteClassStudentsToo ? studentsOfClass(className).map(s => s.id) : [];
    try {
      setLoading(true);
      // Uma por vez: o servidor reescreve a lista inteira de turmas a cada exclusão
      for (const cls of classesToDelete) {
        await apiService.deleteClass(cls.id);
      }
      await deleteStudentsByIds(studentIds);
      setFilterClass('all');
      setSelectedIds(new Set());
      await Promise.all([loadStudents(), loadCoursesAndClasses()]);
      toast.success(
        `Turma "${className}" removida` + (studentIds.length ? ` com ${studentIds.length} aluno(s)` : '')
      );
    } catch (error) {
      console.error('Error deleting class:', error);
      await Promise.all([loadStudents(), loadCoursesAndClasses()]);
      toast.error('Erro ao remover turma: ' + ((error as Error)?.message || 'erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const confirmPendingDelete = async () => {
    const pending = pendingDelete;
    setPendingDelete(null);
    if (!pending) return;
    if (pending.kind === 'students') await handleDeleteStudents(pending.ids);
    else await handleDeleteClass(pending.name);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setNewStudent({
      name: student.name,
      email: student.email,
      class: student.class,
      grade: student.grade,
      registration: student.registration
    });
    setShowAddForm(true);
  };

  const handleUpdateStudent = async () => {
    if (!editingStudent) return;
    
    if (!newStudent.name || !newStudent.email) {
      toast.error('Nome e email são obrigatórios');
      return;
    }

    try {
      setLoading(true);
      await apiService.updateStudent(editingStudent.id, newStudent);
      await loadStudents();
      setNewStudent({ name: '', email: '', class: '', grade: '', registration: '' });
      setEditingStudent(null);
      setShowAddForm(false);
      toast.success('Aluno atualizado com sucesso!');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Erro ao atualizar aluno');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setNewStudent({ name: '', email: '', class: '', grade: '', registration: '' });
    setShowAddForm(false);
  };

  const exportToCSV = () => {
    downloadCsv('alunos.csv', [
      ['Nome', 'Email', 'Turma', 'Turno', 'Matrícula', 'Status'],
      ...students.map(s => [s.name, s.email, s.class, s.grade, s.registration, s.status])
    ]);
  };

  const downloadTemplate = () => {
    downloadCsv('modelo_alunos.csv', [
      ['NOME', 'EMAIL', 'TURMA', 'TURNO', 'MATRICULA'],
      ['João Silva', 'joao@email.com', 'Turma A', 'Manhã', '001'],
      ['Maria Santos', 'maria@email.com', 'Turma B', 'Tarde', '002']
    ]);
    toast.success('Modelo baixado com sucesso!');
  };

  const uniqueClasses = Array.from(new Set(students.map(s => s.class))).filter(Boolean);

  // Números do card de estatísticas
  const activeCount = students.filter(s => s.status === 'active').length;
  const withoutClassCount = students.filter(s => !s.class?.trim()).length;
  const activePercent = students.length ? Math.round((activeCount / students.length) * 100) : 0;
  const studentsPerClass = uniqueClasses
    .map(name => ({ name, count: students.filter(s => s.class === name).length }))
    .sort((a, b) => b.count - a.count);
  const topClasses = studentsPerClass.slice(0, 5);
  const maxClassCount = topClasses[0]?.count || 1;

  // Ignora acento, maiúsculas, "º"/"°"/"ª" e espaços repetidos ("5º Ano" == "5 ano")
  const normalize = (text: string) =>
    stripAccents(String(text || '')).toLowerCase().replace(/[º°ª]/g, '').replace(/\s+/g, ' ').trim();
  const sortPtBr = (list: string[]) => list.sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

  // Uma turma pertence a um curso se estiver cadastrada nele em "Gerenciar Turmas" ou, para
  // turmas importadas com nome longo (ex: "- (2025) - 5º ano (5002) Ensino Fundamental - Tarde"),
  // se o nome do curso aparecer dentro do nome da turma.
  const classBelongsToCourse = (className: string, course: string) => {
    const nClass = normalize(className);
    const nCourse = normalize(course);
    if (!nClass || !nCourse) return false;
    return registeredClasses.some(c => normalize(c.name) === nClass && normalize(c.grade) === nCourse) ||
      nClass.includes(nCourse);
  };

  const studentsOfClass = (className: string) =>
    students.filter(s => normalize(s.class) === normalize(className));
  const studentsInClass = (className: string) => studentsOfClass(className).length;
  // Turmas cadastradas com esse nome; com um curso escolhido, só a desse curso
  const registeredClassesMatching = (className: string) =>
    registeredClasses.filter(c =>
      normalize(c.name) === normalize(className) &&
      (filterCourse === 'all' || normalize(c.grade) === normalize(filterCourse))
    );
  const studentsInCourse = (course: string) =>
    students.filter(s => classBelongsToCourse(s.class, course)).length;

  const courseOptions = sortPtBr(Array.from(new Set(
    [...registeredCourses, ...registeredClasses.map(c => c.grade)].filter(Boolean)
  )));
  const classOptions = sortPtBr(Array.from(new Set(
    [...registeredClasses.map(c => c.name), ...uniqueClasses].filter(name =>
      filterCourse === 'all' || classBelongsToCourse(name, filterCourse)
    )
  )));

  const hasActiveFilter = !!filterName.trim() || !!filterRegistration.trim() ||
    filterCourse !== 'all' || filterClass !== 'all';

  const filteredStudents = !hasActiveFilter ? [] : students.filter(student => {
    const matchesName = !filterName.trim() || normalize(student.name).includes(normalize(filterName));
    const matchesRegistration = !filterRegistration.trim() ||
      normalize(student.registration).includes(normalize(filterRegistration));
    const matchesCourse = filterCourse === 'all' || classBelongsToCourse(student.class, filterCourse);
    const matchesClass = filterClass === 'all' || normalize(student.class) === normalize(filterClass);
    return matchesName && matchesRegistration && matchesCourse && matchesClass;
  });

  // Só conta como selecionado o que está visível com os filtros atuais
  const selectedFiltered = filteredStudents.filter(s => selectedIds.has(s.id));
  const allFilteredSelected = filteredStudents.length > 0 && selectedFiltered.length === filteredStudents.length;

  const clearFilters = () => {
    setFilterName('');
    setFilterCourse('all');
    setFilterClass('all');
    setFilterRegistration('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Gerenciar Alunos</h1>
          <p className="text-slate-600">
            Importe, cadastre e gerencie a lista de alunos do sistema
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Aluno
          </Button>
        </div>
      </div>

      {/* Import Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="seice-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="w-5 h-5 mr-2" />
              Importar Arquivo
            </CardTitle>
            <CardDescription>
              Importe uma lista de alunos usando arquivo CSV ou Excel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Área de anexo: clique para escolher ou arraste o arquivo para cá */}
              <label
                htmlFor="file"
                onDragOver={(e) => { e.preventDefault(); if (!loading) setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleFileDrop}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  loading
                    ? 'cursor-wait border-zinc-300 bg-zinc-50 opacity-70'
                    : isDraggingFile
                      ? 'cursor-copy border-amber-500 bg-amber-50'
                      : 'cursor-pointer border-amber-300 bg-amber-50/60 hover:border-amber-500 hover:bg-amber-50'
                }`}
              >
                <div className={`rounded-full p-3 ${isDraggingFile ? 'bg-amber-200' : 'bg-amber-100'}`}>
                  <Upload className={`w-6 h-6 ${isDraggingFile ? 'text-amber-700' : 'text-amber-600'}`} />
                </div>
                <p className="text-sm font-medium text-zinc-800">
                  {loading
                    ? 'Importando alunos...'
                    : isDraggingFile
                      ? 'Solte o arquivo aqui'
                      : 'Arraste a planilha aqui ou clique para anexar'}
                </p>
                <p className="text-xs text-muted-foreground">CSV (.csv) ou Excel (.xlsx, .xls)</p>
                {!loading && (
                  <span className="mt-1 inline-flex items-center rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white">
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Anexar arquivo
                  </span>
                )}
                <input
                  id="file"
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="sr-only"
                />
              </label>
              
              <Card className="border-zinc-200 bg-zinc-50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-zinc-800 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-zinc-900">
                      <p className="font-medium mb-1">Formato do arquivo:</p>
                      <p>O arquivo deve conter as colunas na seguinte ordem:</p>
                      <p className="font-mono text-xs mt-1 bg-zinc-100 p-2 rounded">
                        NOME | EMAIL | TURMA | TURNO | MATRICULA
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Button variant="outline" className="w-full" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Baixar Modelo CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="seice-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Estatísticas
            </CardTitle>
            <CardDescription>Resumo dos alunos cadastrados no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total de alunos', value: students.length, icon: Users, tone: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: 'Alunos ativos', value: activeCount, hint: `${activePercent}% do total`, icon: UserCheck, tone: 'bg-green-50 border-green-200 text-green-700' },
                { label: 'Turmas', value: uniqueClasses.length, icon: School, tone: 'bg-sky-50 border-sky-200 text-sky-700' },
                {
                  label: 'Sem turma',
                  value: withoutClassCount,
                  hint: withoutClassCount > 0 ? 'Defina a turma desses alunos' : 'Todos com turma',
                  icon: UserX,
                  tone: withoutClassCount > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-zinc-50 border-zinc-200 text-zinc-600'
                }
              ].map(({ label, value, hint, icon: Icon, tone }) => (
                <div key={label} className={`rounded-xl border p-3 ${tone}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{label}</span>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="mt-1 text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
                  {hint && <p className="text-xs opacity-80">{hint}</p>}
                </div>
              ))}
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-800 mb-2">
                Alunos por turma
                {studentsPerClass.length > topClasses.length && (
                  <span className="font-normal text-muted-foreground"> (5 maiores de {studentsPerClass.length})</span>
                )}
              </p>
              {topClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma turma com alunos ainda.</p>
              ) : (
                <div className="space-y-2">
                  {topClasses.map(({ name, count }) => (
                    <div key={name} className="flex items-center gap-3 text-sm">
                      <span className="w-24 truncate text-zinc-700" title={name}>{name}</span>
                      <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${(count / maxClassCount) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right tabular-nums text-zinc-900 font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Student Form */}
      {showAddForm && (
        <Card className="seice-card">
          <CardHeader>
            <CardTitle>
              {editingStudent ? 'Editar Aluno' : 'Adicionar Novo Aluno'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo</Label>
                <Input
                  id="name"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do aluno"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="class">Turma</Label>
                <Input
                  id="class"
                  value={newStudent.class}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, class: e.target.value }))}
                  placeholder="Turma A"
                />
              </div>
              <div>
                <Label htmlFor="grade">Turno</Label>
                <Select value={newStudent.grade} onValueChange={(value) => setNewStudent(prev => ({ ...prev, grade: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o turno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manhã">Manhã</SelectItem>
                    <SelectItem value="Tarde">Tarde</SelectItem>
                    <SelectItem value="Noite">Noite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="registration">Matrícula</Label>
                <Input
                  id="registration"
                  value={newStudent.registration}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, registration: e.target.value }))}
                  placeholder="Número da matrícula"
                />
              </div>
            </div>
            <div className="flex space-x-2 mt-6">
              <Button 
                onClick={editingStudent ? handleUpdateStudent : handleAddStudent} 
                disabled={loading}
              >
                {loading 
                  ? (editingStudent ? 'Atualizando...' : 'Adicionando...') 
                  : (editingStudent ? 'Atualizar Aluno' : 'Adicionar Aluno')
                }
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="seice-card">
        <CardHeader>
          <CardTitle>Lista de Alunos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="filter-name">Nome</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="filter-name"
                  placeholder="Nome do aluno"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Curso</Label>
              <Select
                value={filterCourse}
                onValueChange={(value) => { setFilterCourse(value); setFilterClass('all'); }}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Todos os cursos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cursos</SelectItem>
                  {courseOptions.map(course => (
                    <SelectItem key={course} value={course}>
                      {course} <span className="text-muted-foreground">({studentsInCourse(course)} alunos)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Turma</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classOptions.map(className => (
                    <SelectItem key={className} value={className}>
                      {className} <span className="text-muted-foreground">({studentsInClass(className)} alunos)</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="filter-registration">Matrícula</Label>
              <Input
                id="filter-registration"
                placeholder="Número da matrícula"
                value={filterRegistration}
                onChange={(e) => setFilterRegistration(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {hasActiveFilter && (
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-sm text-slate-600">
              <span>
                {filteredStudents.length} aluno(s) encontrado(s)
                {selectedFiltered.length > 0 && ` · ${selectedFiltered.length} selecionado(s)`}
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedFiltered.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={loading}
                    onClick={() => setPendingDelete({ kind: 'students', ids: selectedFiltered.map(s => s.id) })}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Apagar selecionados ({selectedFiltered.length})
                  </Button>
                )}
                {filterClass !== 'all' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={loading}
                    className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                    onClick={() => {
                      setDeleteClassStudentsToo(true);
                      setPendingDelete({ kind: 'class', name: filterClass });
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Apagar turma
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
              </div>
            </div>
          )}

          {filteredStudents.length > 0 && (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Selecionar todos"
                      checked={allFilteredSelected ? true : selectedFiltered.length > 0 ? 'indeterminate' : false}
                      onCheckedChange={(checked) => {
                        const next = new Set(selectedIds);
                        filteredStudents.forEach(s => (checked === true ? next.add(s.id) : next.delete(s.id)));
                        setSelectedIds(next);
                      }}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Turma</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cartão resposta</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.id} data-state={selectedIds.has(student.id) ? 'selected' : undefined}>
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar ${student.name}`}
                        checked={selectedIds.has(student.id)}
                        onCheckedChange={(checked) => {
                          const next = new Set(selectedIds);
                          if (checked === true) next.add(student.id); else next.delete(student.id);
                          setSelectedIds(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.grade}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.registration}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={student.status === 'active' ? 'default' : 'secondary'}>
                        {student.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {cardsOf(student).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewingCardsOf(student)}
                          title="Ver o cartão resposta enviado"
                          className="flex items-center gap-2 rounded-md hover:bg-slate-100 p-1 transition"
                        >
                          {cardsOf(student)[0].mimeType?.startsWith('image/') ? (
                            <img
                              src={cardsOf(student)[0].data}
                              alt="Cartão resposta"
                              className="w-8 h-10 rounded border object-cover object-top"
                            />
                          ) : (
                            <ImageIcon className="w-5 h-5 text-slate-400" />
                          )}
                          <span className="text-xs text-slate-600">{cardsOf(student).length} cartão(ões)</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditStudent(student)}
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setPendingDelete({ kind: 'students', ids: [student.id] })}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          )}

          {filteredStudents.length === 0 && (
            <div className="text-center py-8">
              {hasActiveFilter || students.length === 0 ? (
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              ) : (
                <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              )}
              <p className="text-muted-foreground">
                {hasActiveFilter
                  ? (filterClass !== 'all' && studentsInClass(filterClass) === 0
                      ? `A turma "${filterClass}" ainda não tem nenhum aluno vinculado. Importe ou cadastre alunos com essa turma.`
                      : 'Nenhum aluno encontrado com os filtros aplicados')
                  : students.length > 0
                    ? 'Preencha nome, curso, turma ou matrícula para buscar os alunos'
                    : 'Nenhum aluno cadastrado ainda'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmação de exclusão de alunos ou de uma turma */}
      <ConfirmDeleteDialog
        open={!!pendingDelete}
        title={
          pendingDelete?.kind === 'class'
            ? 'Apagar turma?'
            : pendingDelete?.ids.length === 1
              ? 'Apagar aluno?'
              : `Apagar ${pendingDelete?.ids.length ?? 0} alunos?`
        }
        itemName={
          pendingDelete?.kind === 'class'
            ? pendingDelete.name
            : pendingDelete?.ids.length === 1
              ? students.find(s => s.id === pendingDelete.ids[0])?.name
              : undefined
        }
        description={(() => {
          if (pendingDelete?.kind !== 'class') {
            return pendingDelete && pendingDelete.ids.length > 1
              ? 'Os alunos selecionados serão removidos do sistema. Essa ação não pode ser desfeita.'
              : 'O aluno será removido do sistema. Essa ação não pode ser desfeita.';
          }
          const matching = registeredClassesMatching(pendingDelete.name);
          return (matching.length === 0
            ? 'Essa turma não está cadastrada em Gerenciar Turmas; só existe nos alunos importados.'
            : matching.length === 1
              ? `A turma será removida de Gerenciar Turmas${matching[0].grade ? ` (curso ${matching[0].grade})` : ''}.`
              : `${matching.length} turmas com esse nome serão removidas de Gerenciar Turmas (cursos: ${matching.map(c => c.grade).join(', ')}).`
          ) + ' Essa ação não pode ser desfeita.';
        })()}
        confirmLabel="Sim, apagar"
        confirmDisabled={
          pendingDelete?.kind === 'class' &&
          registeredClassesMatching(pendingDelete.name).length === 0 &&
          !deleteClassStudentsToo
        }
        onConfirm={confirmPendingDelete}
        onCancel={() => setPendingDelete(null)}
      >
        {pendingDelete?.kind === 'class' && studentsInClass(pendingDelete.name) > 0 && (
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-slate-800 cursor-pointer">
            <Checkbox
              checked={deleteClassStudentsToo}
              onCheckedChange={(checked) => setDeleteClassStudentsToo(checked === true)}
            />
            Apagar também os {studentsInClass(pendingDelete.name)} aluno(s) dessa turma
          </label>
        )}
      </ConfirmDeleteDialog>

      {/* Cartões resposta enviados de um aluno */}
      <Dialog open={!!viewingCardsOf} onOpenChange={(open) => { if (!open) setViewingCardsOf(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Cartão resposta - {viewingCardsOf?.name}</DialogTitle>
            <DialogDescription>
              Cartões enviados para este aluno na página Enviar Imagens.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 pr-1">
            {(viewingCardsOf ? cardsOf(viewingCardsOf) : []).map((image: any) => (
              <div key={image.id} className="rounded-lg border p-3 space-y-2 bg-white">
                <div className="rounded-md border bg-slate-50 overflow-hidden max-h-[46vh] overflow-y-auto">
                  {image.mimeType?.startsWith('image/') ? (
                    <img src={image.data} alt={image.filename} className="w-full h-auto block" />
                  ) : (
                    <p className="p-6 text-sm text-slate-500 text-center">Pré-visualização indisponível (PDF)</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{image.filename}</p>
                    <p className="text-xs text-slate-500 truncate">{image.examTitle}</p>
                  </div>
                  <Badge variant={image.status === 'Processada' ? 'default' : 'secondary'}>
                    {image.status === 'Processada' ? 'Corrigido' : 'Aguardando'}
                  </Badge>
                </div>
                {image.data && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => openImageFullSize(image.data)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Abrir em tamanho real
                  </Button>
                )}
              </div>
            ))}
          </div>
          <div className="flex-shrink-0 flex justify-end pt-3 border-t">
            <Button onClick={() => setViewingCardsOf(null)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
      <ActionResultDialog result={importResult} onClose={() => setImportResult(null)} />
    </div>
  );
}