import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  Loader2,
  Printer,
  RefreshCw,
  School,
  Target,
  Users
} from 'lucide-react';
import { toast } from '../../utils/toast';
import { apiService } from '../../utils/api';

// ---------------------------------------------------------------------------------------------
// Dashboard geral de desempenho. Tudo é calculado a partir das correções (submissions):
// cada correção vira uma "linha" com unidade, série, turma e simulado. Como turmas e alunos só
// guardam texto livre, a unidade (CE, JP...), a série e a turma são extraídas desse texto.
// ---------------------------------------------------------------------------------------------

type SubjectPerformance = { subject: string; percentage: number; correctAnswers: number; totalQuestions: number };
type QuestionResult = { subject?: string; isCorrect?: boolean; correctAnswer?: string; studentAnswer?: string };

type Row = {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  registration: string;
  classRaw: string;
  unit: string;
  serie: string;
  turma: string;
  percentage: number;
  correct: number;
  total: number;
  subjects: SubjectPerformance[];
  results: QuestionResult[];
  submittedAt: string;
};

const ALL = 'all';
const NO_UNIT = 'Não identificada';
const NO_SERIE = 'Sem série';
const PASS_MARK = 60; // % mínimo considerado "acima da média" nos indicadores

// Cores por unidade: seguem a unidade (ordem alfabética fixa), nunca a posição no gráfico
const UNIT_PALETTE = ['#2a78d6', '#eb6834', '#1baf7a'];
const NO_UNIT_COLOR = '#a1a1aa';
const INK = '#3f3f46'; // gráficos de uma série só
const GRID = '#e4e4e7';
const AXIS_TEXT = '#71717a';

// Siglas que aparecem nos nomes mas não são unidade
const NOT_UNIT_TOKENS = new Set(['EM', 'EF', 'EJA', 'ANO', 'FUND']);

const stripAccents = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');
const norm = (text: unknown) =>
  stripAccents(String(text ?? '')).toLowerCase().replace(/[º°ª]/g, '').replace(/\s+/g, ' ').trim();
const round1 = (n: number) => Math.round(n * 10) / 10;
const average = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const sortPtBr = (list: string[]) => [...list].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

// Unidades cadastradas: segmentos curtos em maiúsculas nos nomes de turma/curso (ex: "9001 - CE")
function discoverUnits(texts: string[]) {
  const units = new Set<string>();
  texts.forEach(text => {
    String(text || '').split(/\s*[-–]\s*/).forEach(segment => {
      const token = segment.trim();
      if (/^[A-Z]{2,4}$/.test(token) && !NOT_UNIT_TOKENS.has(token)) units.add(token);
    });
  });
  return sortPtBr(Array.from(units));
}

function findUnit(texts: string[], units: string[]) {
  for (const unit of units) {
    const re = new RegExp(`(^|[^A-Za-z])${unit}([^A-Za-z]|$)`);
    if (texts.some(t => re.test(String(t || '')))) return unit;
  }
  return NO_UNIT;
}

// Código da turma: número de 3-4 dígitos que não seja um ano letivo (ex: "5002", "9001", "301")
function findTurmaCode(texts: string[]) {
  for (const text of texts) {
    const codes = String(text || '').match(/\b\d{3,4}\b/g) || [];
    const code = codes.find(c => !(c.length === 4 && Number(c) >= 1990 && Number(c) <= 2099));
    if (code) return code;
  }
  return '';
}

function findSerie(texts: string[], turmaCode: string) {
  for (const text of texts) {
    const n = norm(text);
    const match = n.match(/(\d{1,2})\s*o?\s*(ano|serie)\b/);
    if (match) {
      const isEM = /\b(em|ensino medio|medio)\b/.test(n);
      return `${Number(match[1])}º Ano${isEM ? ' EM' : ''}`;
    }
  }
  // Convenção comum: turma 9001 = 9º ano, 5002 = 5º ano
  if (turmaCode) return `${turmaCode[0]}º Ano`;
  return NO_SERIE;
}

function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[<>&"]/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]!));
}

// Tooltip compartilhado pelos gráficos
function ChartTooltip({ active, payload, label, unitLabel = '%' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-zinc-900 mb-1">{label}</p>
      {payload.map((item: any) => (
        <div key={item.dataKey} className="flex items-center gap-2 text-zinc-700">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: item.color || item.payload?.fill }} />
          <span>{item.name}:</span>
          <span className="font-medium text-zinc-900">
            {item.value}{unitLabel}
          </span>
          {item.payload?.[`${item.dataKey}__n`] !== undefined && (
            <span className="text-zinc-500">({item.payload[`${item.dataKey}__n`]} alunos)</span>
          )}
        </div>
      ))}
    </div>
  );
}

function StatTile({ label, value, hint, icon: Icon }: { label: string; value: string; hint?: string; icon: any }) {
  return (
    <Card className="seice-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
        <p className="text-2xl font-semibold text-zinc-900 mt-1">{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ text }: { text: string }) {
  return <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">{text}</div>;
}

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  const [filterUnit, setFilterUnit] = useState(ALL);
  const [filterSerie, setFilterSerie] = useState(ALL);
  const [filterTurma, setFilterTurma] = useState(ALL);
  const [filterExam, setFilterExam] = useState(ALL);

  // Relatório aberto: uma turma num simulado
  const [openReport, setOpenReport] = useState<{ unit: string; serie: string; turma: string; examId: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subs, exs, sts, cls] = await Promise.all([
        apiService.getSubmissions().catch(() => null),
        apiService.getExams().catch(() => null),
        apiService.getStudents().catch(() => null),
        apiService.getClasses().catch(() => null)
      ]);
      setSubmissions(subs?.submissions || []);
      setExams(exs?.exams || []);
      setStudents(sts?.students || []);
      setClasses(cls?.classes || []);
    } catch (error) {
      console.error('Error loading report data:', error);
      toast.error('Erro ao carregar os dados dos relatórios');
    } finally {
      setLoading(false);
    }
  };

  const units = useMemo(
    () => discoverUnits(classes.flatMap((c: any) => [c?.name, c?.grade])),
    [classes]
  );
  const unitColor = (unit: string) =>
    unit === NO_UNIT ? NO_UNIT_COLOR : UNIT_PALETTE[Math.max(0, units.indexOf(unit)) % UNIT_PALETTE.length];

  // Uma linha por aluno por simulado (vale a correção mais recente)
  const rows = useMemo<Row[]>(() => {
    const examById = new Map(exams.map((e: any) => [e.id, e]));
    const studentById = new Map(students.map((s: any) => [s.id, s]));

    const latest = new Map<string, any>();
    submissions.forEach((s: any) => {
      if (!s?.examId) return;
      if (s.gradingStatus && s.gradingStatus !== 'graded') return;
      if (typeof s.percentage !== 'number' && typeof s.score !== 'number') return;
      const key = `${s.examId}::${s.studentId || norm(s.studentName)}`;
      const current = latest.get(key);
      if (!current || String(s.submittedAt || '') > String(current.submittedAt || '')) latest.set(key, s);
    });

    return Array.from(latest.values()).map((s: any) => {
      const student = studentById.get(s.studentId);
      const exam = examById.get(s.examId);
      const classRaw = String(s.studentClass || student?.class || exam?.selectedClass || '').trim();

      // Turma cadastrada com o mesmo nome: só ajuda se for uma só (nomes repetidos são ambíguos)
      const matchingClasses = classes.filter((c: any) => norm(c?.name) === norm(classRaw));
      const registered = matchingClasses.length === 1 ? matchingClasses[0] : null;

      const classTexts = [classRaw, registered?.name, registered?.grade].filter(Boolean) as string[];
      const turmaCode = findTurmaCode(classTexts);
      const results: QuestionResult[] = Array.isArray(s.results) ? s.results : [];
      const total = Number(s.totalQuestions) || results.length;
      const correct = results.length ? results.filter(r => r?.isCorrect).length : Number(s.score) || 0;

      return {
        id: s.id,
        examId: s.examId,
        examTitle: s.examTitle || exam?.title || s.examId,
        studentId: s.studentId || '',
        studentName: s.studentName || student?.name || 'Aluno sem nome',
        registration: student?.registration || '',
        classRaw: classRaw || 'Sem turma',
        unit: findUnit(classTexts, units),
        serie: findSerie([...classTexts, exam?.grade].filter(Boolean) as string[], turmaCode),
        turma: turmaCode || classRaw || 'Sem turma',
        percentage: typeof s.percentage === 'number' ? s.percentage : total ? Math.round((correct / total) * 100) : 0,
        correct,
        total,
        subjects: (Array.isArray(s.subjectPerformances) ? s.subjectPerformances : [])
          .filter((p: any) => p?.subject && Number(p.totalQuestions) > 0),
        results,
        submittedAt: s.submittedAt || ''
      };
    });
  }, [submissions, exams, students, classes, units]);

  // Filtros em cascata: cada um só oferece o que existe dentro dos anteriores
  const inUnit = rows.filter(r => filterUnit === ALL || r.unit === filterUnit);
  const inSerie = inUnit.filter(r => filterSerie === ALL || r.serie === filterSerie);
  const inTurma = inSerie.filter(r => filterTurma === ALL || r.turma === filterTurma);
  const filtered = inTurma.filter(r => filterExam === ALL || r.examId === filterExam);

  const unitOptions = sortPtBr(Array.from(new Set(rows.map(r => r.unit))));
  const serieOptions = sortPtBr(Array.from(new Set(inUnit.map(r => r.serie))));
  const turmaOptions = sortPtBr(Array.from(new Set(inSerie.map(r => r.turma))));
  const examOptions = Array.from(new Map(inTurma.map(r => [r.examId, r.examTitle])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR', { numeric: true }));

  const hasFilter = [filterUnit, filterSerie, filterTurma, filterExam].some(f => f !== ALL);
  const clearFilters = () => {
    setFilterUnit(ALL);
    setFilterSerie(ALL);
    setFilterTurma(ALL);
    setFilterExam(ALL);
  };

  // ---- Indicadores ----
  const overallAvg = round1(average(filtered.map(r => r.percentage)));
  const studentCount = new Set(filtered.map(r => r.studentId || r.studentName)).size;
  const examCount = new Set(filtered.map(r => r.examId)).size;
  const turmaCount = new Set(filtered.map(r => `${r.unit}|${r.turma}`)).size;
  const aboveMark = filtered.length ? Math.round((filtered.filter(r => r.percentage >= PASS_MARK).length / filtered.length) * 100) : 0;

  // ---- Gráficos ----
  const presentUnits = sortPtBr(Array.from(new Set(filtered.map(r => r.unit))))
    .sort((a, b) => (a === NO_UNIT ? 1 : b === NO_UNIT ? -1 : 0));

  const byUnit = presentUnits.map(unit => {
    const list = filtered.filter(r => r.unit === unit);
    return { unit, fill: unitColor(unit), media: round1(average(list.map(r => r.percentage))), media__n: list.length };
  });

  const bySerie = sortPtBr(Array.from(new Set(filtered.map(r => r.serie)))).map(serie => {
    const entry: Record<string, any> = { serie };
    presentUnits.forEach(unit => {
      const list = filtered.filter(r => r.serie === serie && r.unit === unit);
      if (list.length) {
        entry[unit] = round1(average(list.map(r => r.percentage)));
        entry[`${unit}__n`] = list.length;
      }
    });
    return entry;
  });

  const subjectTotals = new Map<string, { correct: number; total: number }>();
  filtered.forEach(r => r.subjects.forEach(p => {
    const t = subjectTotals.get(p.subject) || { correct: 0, total: 0 };
    t.correct += Number(p.correctAnswers) || 0;
    t.total += Number(p.totalQuestions) || 0;
    subjectTotals.set(p.subject, t);
  }));
  const bySubject = Array.from(subjectTotals.entries())
    .map(([subject, t]) => ({ subject, media: t.total ? round1((t.correct / t.total) * 100) : 0 }))
    .sort((a, b) => b.media - a.media);

  const BINS = [
    { label: '0–19%', min: 0, max: 20 },
    { label: '20–39%', min: 20, max: 40 },
    { label: '40–59%', min: 40, max: 60 },
    { label: '60–79%', min: 60, max: 80 },
    { label: '80–100%', min: 80, max: 101 }
  ];
  const distribution = BINS.map(bin => ({
    faixa: bin.label,
    alunos: filtered.filter(r => r.percentage >= bin.min && r.percentage < bin.max).length
  }));

  // ---- Séries > turmas > simulados ----
  type Group = { key: string; unit: string; serie: string; turma: string; examId: string; examTitle: string; rows: Row[] };
  const groups = new Map<string, Group>();
  filtered.forEach(r => {
    const key = `${r.unit}|${r.serie}|${r.turma}|${r.examId}`;
    if (!groups.has(key)) groups.set(key, { key, unit: r.unit, serie: r.serie, turma: r.turma, examId: r.examId, examTitle: r.examTitle, rows: [] });
    groups.get(key)!.rows.push(r);
  });
  const groupsBySerie = new Map<string, Group[]>();
  Array.from(groups.values()).forEach(g => {
    if (!groupsBySerie.has(g.serie)) groupsBySerie.set(g.serie, []);
    groupsBySerie.get(g.serie)!.push(g);
  });
  const serieSections = sortPtBr(Array.from(groupsBySerie.keys())).map(serie => ({
    serie,
    groups: groupsBySerie.get(serie)!.sort((a, b) =>
      `${a.unit} ${a.turma} ${a.examTitle}`.localeCompare(`${b.unit} ${b.turma} ${b.examTitle}`, 'pt-BR', { numeric: true })
    )
  }));

  // Exporta os dados filtrados (uma linha por aluno por simulado)
  const exportFiltered = async () => {
    if (filtered.length === 0) {
      toast.error('Não há dados para exportar com esses filtros');
      return;
    }
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.json_to_sheet(filtered.map(r => ({
      Unidade: r.unit,
      Série: r.serie,
      Turma: r.turma,
      Simulado: r.examTitle,
      Aluno: r.studentName,
      Matrícula: r.registration,
      Acertos: r.correct,
      Questões: r.total,
      'Nota (%)': r.percentage,
      'Corrigido em': r.submittedAt ? new Date(r.submittedAt).toLocaleString('pt-BR') : ''
    })));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Desempenho');
    XLSX.writeFile(book, `desempenho-geral-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (openReport) {
    const reportRows = rows.filter(r =>
      r.unit === openReport.unit && r.serie === openReport.serie && r.turma === openReport.turma && r.examId === openReport.examId
    );
    return <ClassExamReport rows={reportRows} info={openReport} onBack={() => setOpenReport(null)} />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-semibold text-zinc-900">Relatórios Gerais</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Desempenho dos simulados por unidade, série e turma
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportFiltered} disabled={loading || filtered.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar Excel
          </Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros: sempre numa linha acima dos gráficos */}
      <Card className="seice-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-sm">Unidade</Label>
              <Select value={filterUnit} onValueChange={v => { setFilterUnit(v); setFilterSerie(ALL); setFilterTurma(ALL); setFilterExam(ALL); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as unidades</SelectItem>
                  {unitOptions.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Série</Label>
              <Select value={filterSerie} onValueChange={v => { setFilterSerie(v); setFilterTurma(ALL); setFilterExam(ALL); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as séries</SelectItem>
                  {serieOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Turma</Label>
              <Select value={filterTurma} onValueChange={v => { setFilterTurma(v); setFilterExam(ALL); }}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todas as turmas</SelectItem>
                  {turmaOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Simulado</Label>
              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Todos os simulados</SelectItem>
                  {examOptions.map(([id, title]) => <SelectItem key={id} value={id}>{title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilter && (
            <div className="flex justify-end mt-3">
              <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar filtros</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <Card className="seice-card">
          <CardContent className="py-16 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Carregando dados...
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="seice-card">
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-zinc-900">Nenhum simulado corrigido ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Os gráficos aparecem assim que houver cartões-resposta corrigidos em "Correção".
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Indicadores */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatTile label="Média geral" value={`${overallAvg}%`} icon={Target} />
            <StatTile label={`Alunos com ${PASS_MARK}% ou mais`} value={`${aboveMark}%`} hint={`${filtered.filter(r => r.percentage >= PASS_MARK).length} de ${filtered.length} provas`} icon={BarChart3} />
            <StatTile label="Alunos avaliados" value={String(studentCount)} icon={Users} />
            <StatTile label="Turmas" value={String(turmaCount)} icon={School} />
            <StatTile label="Simulados" value={String(examCount)} icon={ClipboardList} />
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card className="seice-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Desempenho por unidade</CardTitle>
                <CardDescription>Média de acertos (%) em cada unidade</CardDescription>
              </CardHeader>
              <CardContent>
                {byUnit.length === 0 ? <EmptyChart text="Sem dados com esses filtros" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={byUnit} margin={{ top: 24, right: 8, left: -12, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="unit" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                      <Tooltip cursor={{ fill: '#f4f4f5' }} content={<ChartTooltip />} />
                      <Bar dataKey="media" name="Média" radius={[4, 4, 0, 0]} maxBarSize={72}>
                        {byUnit.map(d => <Cell key={d.unit} fill={unitColor(d.unit)} />)}
                        <LabelList dataKey="media" position="top" formatter={(v: number) => `${v}%`} style={{ fill: INK, fontSize: 12, fontWeight: 500 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="seice-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Desempenho por série</CardTitle>
                <CardDescription>Média de acertos (%) por série, separada por unidade</CardDescription>
              </CardHeader>
              <CardContent>
                {bySerie.length === 0 ? <EmptyChart text="Sem dados com esses filtros" /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bySerie} margin={{ top: 24, right: 8, left: -12, bottom: 0 }} barGap={2} barCategoryGap="25%">
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis dataKey="serie" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                      <Tooltip cursor={{ fill: '#f4f4f5' }} content={<ChartTooltip />} />
                      {presentUnits.length > 1 && <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: INK }} />}
                      {presentUnits.map(unit => (
                        <Bar key={unit} dataKey={unit} name={unit} fill={unitColor(unit)} radius={[4, 4, 0, 0]} maxBarSize={48}>
                          {presentUnits.length <= 4 && (
                            <LabelList dataKey={unit} position="top" formatter={(v: number) => (v === undefined ? '' : `${v}%`)} style={{ fill: INK, fontSize: 11 }} />
                          )}
                        </Bar>
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="seice-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Desempenho por disciplina</CardTitle>
                <CardDescription>Percentual de acertos em cada disciplina</CardDescription>
              </CardHeader>
              <CardContent>
                {bySubject.length === 0 ? <EmptyChart text="As correções não têm dados por disciplina" /> : (
                  <ResponsiveContainer width="100%" height={Math.max(220, bySubject.length * 36 + 40)}>
                    <BarChart data={bySubject} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }} barCategoryGap="25%">
                      <CartesianGrid horizontal={false} stroke={GRID} />
                      <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                      <YAxis type="category" dataKey="subject" width={120} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK, fontSize: 12 }} />
                      <Tooltip cursor={{ fill: '#f4f4f5' }} content={<ChartTooltip />} />
                      <Bar dataKey="media" name="Acertos" fill={INK} radius={[0, 4, 4, 0]} maxBarSize={24}>
                        <LabelList dataKey="media" position="right" formatter={(v: number) => `${v}%`} style={{ fill: INK, fontSize: 12 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="seice-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Distribuição das notas</CardTitle>
                <CardDescription>Quantos alunos ficaram em cada faixa de acerto</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={distribution} margin={{ top: 24, right: 8, left: -20, bottom: 0 }} barCategoryGap="15%">
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis dataKey="faixa" tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} />
                    <Tooltip cursor={{ fill: '#f4f4f5' }} content={<ChartTooltip unitLabel="" />} />
                    <Bar dataKey="alunos" name="Alunos" fill={INK} radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="alunos" position="top" style={{ fill: INK, fontSize: 12 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Séries > turmas > simulados, com o relatório de cada turma */}
          <Card className="seice-card">
            <CardHeader>
              <CardTitle className="text-base">Séries e turmas</CardTitle>
              <CardDescription>Escolha uma turma e um simulado para abrir o relatório completo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {serieSections.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Nenhuma turma com esses filtros</p>
              )}
              {serieSections.map(section => (
                <div key={section.serie}>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-zinc-900">{section.serie}</h3>
                    <Badge variant="outline">{section.groups.length} relatório(s)</Badge>
                  </div>
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Unidade</TableHead>
                          <TableHead>Turma</TableHead>
                          <TableHead>Simulado</TableHead>
                          <TableHead className="text-right">Alunos</TableHead>
                          <TableHead className="text-right">Média</TableHead>
                          <TableHead className="text-right">Menor / Maior</TableHead>
                          <TableHead className="text-right">Relatório</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {section.groups.map(g => {
                          const values = g.rows.map(r => r.percentage);
                          return (
                            <TableRow key={g.key}>
                              <TableCell>
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: unitColor(g.unit) }} />
                                  {g.unit}
                                </span>
                              </TableCell>
                              <TableCell className="font-medium">{g.turma}</TableCell>
                              <TableCell>{g.examTitle}</TableCell>
                              <TableCell className="text-right">{g.rows.length}</TableCell>
                              <TableCell className="text-right font-medium">{round1(average(values))}%</TableCell>
                              <TableCell className="text-right text-muted-foreground">
                                {Math.min(...values)}% / {Math.max(...values)}%
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" onClick={() => setOpenReport({ unit: g.unit, serie: g.serie, turma: g.turma, examId: g.examId })}>
                                  Gerar relatório
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))}
              {rows.some(r => r.unit === NO_UNIT) && units.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  "{NO_UNIT}": turmas cujo nome não indica a unidade ({units.join(', ')}). Para separar, use nomes de turma
                  como "9001 - CE" nos alunos.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Relatório de uma turma num simulado: ranking dos alunos, desempenho por disciplina e análise
// de cada questão (percentual de acerto e alternativa errada mais marcada).
// ---------------------------------------------------------------------------------------------

function ClassExamReport({
  rows,
  info,
  onBack
}: {
  rows: Row[];
  info: { unit: string; serie: string; turma: string; examId: string };
  onBack: () => void;
}) {
  const examTitle = rows[0]?.examTitle || info.examId;
  const ranked = [...rows].sort((a, b) => b.percentage - a.percentage || a.studentName.localeCompare(b.studentName, 'pt-BR'));
  const values = rows.map(r => r.percentage);
  const avg = round1(average(values));
  const aboveMark = rows.filter(r => r.percentage >= PASS_MARK).length;

  const subjects = Array.from(new Set(rows.flatMap(r => r.subjects.map(p => p.subject))));
  const subjectPct = (row: Row, subject: string) => {
    const p = row.subjects.find(s => s.subject === subject);
    return p ? Math.round((Number(p.correctAnswers) / Number(p.totalQuestions)) * 100) : null;
  };
  const subjectAvg = subjects.map(subject => {
    let correct = 0;
    let total = 0;
    rows.forEach(r => r.subjects.filter(p => p.subject === subject).forEach(p => {
      correct += Number(p.correctAnswers) || 0;
      total += Number(p.totalQuestions) || 0;
    }));
    return { subject, media: total ? round1((correct / total) * 100) : 0 };
  });

  const questionCount = Math.max(0, ...rows.map(r => r.results.length));
  const questions = Array.from({ length: questionCount }, (_, i) => {
    const answers = rows.map(r => r.results[i]).filter(Boolean) as QuestionResult[];
    const correct = answers.filter(a => a.isCorrect).length;
    const wrongCounts = new Map<string, number>();
    answers.filter(a => !a.isCorrect).forEach(a => {
      const letter = String(a.studentAnswer || '').trim() || 'Em branco';
      wrongCounts.set(letter, (wrongCounts.get(letter) || 0) + 1);
    });
    const topWrong = Array.from(wrongCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      number: i + 1,
      subject: answers.find(a => a.subject)?.subject || '',
      correctAnswer: answers.find(a => a.correctAnswer)?.correctAnswer || '',
      pct: answers.length ? Math.round((correct / answers.length) * 100) : 0,
      topWrong: topWrong ? `${topWrong[0]} (${topWrong[1]})` : '—'
    };
  });

  const title = `${info.turma} · ${info.serie} · ${info.unit}`;

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(ranked.map((r, i) => {
      const line: Record<string, any> = {
        Posição: i + 1,
        Aluno: r.studentName,
        Matrícula: r.registration,
        Acertos: r.correct,
        Questões: r.total,
        'Nota (%)': r.percentage
      };
      subjects.forEach(s => { line[`${s} (%)`] = subjectPct(r, s) ?? ''; });
      return line;
    })), 'Alunos');
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(questions.map(q => ({
      Questão: q.number,
      Disciplina: q.subject,
      Gabarito: q.correctAnswer,
      'Acertos (%)': q.pct,
      'Erro mais marcado': q.topWrong
    }))), 'Questões');
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(subjectAvg.map(s => ({
      Disciplina: s.subject,
      'Acertos (%)': s.media
    }))), 'Disciplinas');
    XLSX.writeFile(book, `relatorio-${info.turma}-${examTitle}`.replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) + '.xlsx');
  };

  // Abre uma página limpa só com o relatório, pronta para imprimir ou salvar em PDF
  const printReport = () => {
    const win = window.open('', '_blank');
    if (!win) {
      toast.error('Permita pop-ups para imprimir o relatório');
      return;
    }
    const e = escapeHtml;
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${e(title)} - ${e(examTitle)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#18181b;margin:24px;font-size:12px}
  h1{font-size:18px;margin:0 0 4px} h2{font-size:14px;margin:20px 0 8px}
  .muted{color:#71717a} .kpis{display:flex;gap:12px;margin:12px 0}
  .kpi{border:1px solid #d4d4d8;border-radius:8px;padding:8px 12px;min-width:110px}
  .kpi b{display:block;font-size:18px}
  table{width:100%;border-collapse:collapse} th,td{border:1px solid #d4d4d8;padding:4px 6px;text-align:left}
  th{background:#f4f4f5} td.n,th.n{text-align:right}
  @media print{body{margin:0}}
</style></head><body>
<h1>${e(examTitle)}</h1>
<div class="muted">Turma ${e(info.turma)} · ${e(info.serie)} · Unidade ${e(info.unit)} · gerado em ${new Date().toLocaleString('pt-BR')}</div>
<div class="kpis">
  <div class="kpi"><span class="muted">Média</span><b>${avg}%</b></div>
  <div class="kpi"><span class="muted">Alunos</span><b>${rows.length}</b></div>
  <div class="kpi"><span class="muted">Com ${PASS_MARK}% ou mais</span><b>${aboveMark}</b></div>
  <div class="kpi"><span class="muted">Menor / Maior</span><b>${Math.min(...values)}% / ${Math.max(...values)}%</b></div>
</div>
${subjectAvg.length ? `<h2>Desempenho por disciplina</h2><table><tr><th>Disciplina</th><th class="n">Acertos</th></tr>
${subjectAvg.map(s => `<tr><td>${e(s.subject)}</td><td class="n">${s.media}%</td></tr>`).join('')}</table>` : ''}
<h2>Alunos</h2><table><tr><th class="n">#</th><th>Aluno</th><th>Matrícula</th><th class="n">Acertos</th><th class="n">Nota</th>
${subjects.map(s => `<th class="n">${e(s)}</th>`).join('')}</tr>
${ranked.map((r, i) => `<tr><td class="n">${i + 1}</td><td>${e(r.studentName)}</td><td>${e(r.registration)}</td>
<td class="n">${r.correct}/${r.total}</td><td class="n">${r.percentage}%</td>
${subjects.map(s => { const v = subjectPct(r, s); return `<td class="n">${v === null ? '—' : `${v}%`}</td>`; }).join('')}</tr>`).join('')}
</table>
${questions.length ? `<h2>Análise por questão</h2><table><tr><th class="n">Questão</th><th>Disciplina</th><th>Gabarito</th><th class="n">Acertos</th><th>Erro mais marcado</th></tr>
${questions.map(q => `<tr><td class="n">${q.number}</td><td>${e(q.subject)}</td><td>${e(q.correctAnswer)}</td><td class="n">${q.pct}%</td><td>${e(q.topWrong)}</td></tr>`).join('')}</table>` : ''}
<script>window.onload=function(){window.print()}</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Voltar ao dashboard
          </Button>
          <h1 className="text-xl md:text-2xl font-semibold text-zinc-900">{examTitle}</h1>
          <p className="text-sm text-muted-foreground">Turma {info.turma} · {info.serie} · Unidade {info.unit}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button onClick={printReport}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Média da turma" value={`${avg}%`} icon={Target} />
        <StatTile label="Alunos avaliados" value={String(rows.length)} icon={Users} />
        <StatTile label={`Com ${PASS_MARK}% ou mais`} value={String(aboveMark)} hint={rows.length ? `${Math.round((aboveMark / rows.length) * 100)}% da turma` : undefined} icon={BarChart3} />
        <StatTile label="Menor / Maior nota" value={values.length ? `${Math.min(...values)}% / ${Math.max(...values)}%` : '—'} icon={ClipboardList} />
      </div>

      {subjectAvg.length > 0 && (
        <Card className="seice-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Desempenho por disciplina</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(180, subjectAvg.length * 36 + 40)}>
              <BarChart data={subjectAvg} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid horizontal={false} stroke={GRID} />
                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: AXIS_TEXT, fontSize: 12 }} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="subject" width={120} tickLine={false} axisLine={{ stroke: GRID }} tick={{ fill: INK, fontSize: 12 }} />
                <Tooltip cursor={{ fill: '#f4f4f5' }} content={<ChartTooltip />} />
                <Bar dataKey="media" name="Acertos" fill={INK} radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList dataKey="media" position="right" formatter={(v: number) => `${v}%`} style={{ fill: INK, fontSize: 12 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card className="seice-card">
        <CardHeader>
          <CardTitle className="text-base">Alunos</CardTitle>
          <CardDescription>Ordenados pela nota</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-right">#</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead className="text-right">Acertos</TableHead>
                  <TableHead className="text-right">Nota</TableHead>
                  {subjects.map(s => <TableHead key={s} className="text-right">{s}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-right text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.studentName}</TableCell>
                    <TableCell>{r.registration || '—'}</TableCell>
                    <TableCell className="text-right">{r.correct}/{r.total}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.percentage >= PASS_MARK ? 'default' : 'secondary'}>{r.percentage}%</Badge>
                    </TableCell>
                    {subjects.map(s => {
                      const v = subjectPct(r, s);
                      return <TableCell key={s} className="text-right">{v === null ? '—' : `${v}%`}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {questions.length > 0 && (
        <Card className="seice-card">
          <CardHeader>
            <CardTitle className="text-base">Análise por questão</CardTitle>
            <CardDescription>Questões com menos de 40% de acerto estão destacadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20 text-right">Questão</TableHead>
                    <TableHead>Disciplina</TableHead>
                    <TableHead>Gabarito</TableHead>
                    <TableHead className="w-64">Acertos</TableHead>
                    <TableHead>Erro mais marcado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map(q => (
                    <TableRow key={q.number} className={q.pct < 40 ? 'bg-red-50/60' : undefined}>
                      <TableCell className="text-right font-medium">{q.number}</TableCell>
                      <TableCell>{q.subject || '—'}</TableCell>
                      <TableCell>{q.correctAnswer || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${q.pct}%`, background: INK }} />
                          </div>
                          <span className="w-10 text-right text-sm">{q.pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{q.topWrong}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
