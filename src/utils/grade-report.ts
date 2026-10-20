import { ExcelColumn, ExcelExportOptions, ExcelHighlight } from './excel-utils';

// Relatório de correções em Excel: notas em PONTOS, usando o valor de cada questão
// cadastrado no simulado (ex: 10 questões de Português valendo 0,5 → a matéria vale 5,0).
// Usado pela página de Correção e pela de Enviar Imagens, para as duas gerarem os mesmos números.

// Valor de uma questão: "points" (editor de seções), "weight" (questões antigas) ou 1
export const questionPoints = (q: any): number => {
  const n = Number(q?.points ?? q?.weight ?? 1);
  return Number.isFinite(n) && n >= 0 ? n : 1;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// "5" → "5,0"; "2.5" → "2,5"; "0.75" → "0,75"
export const formatPoints = (n: number) =>
  round2(n).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

type SubjectScore = { subject: string; correct: number; total: number; earned: number; max: number };
export type SubmissionScore = { earned: number; max: number; correct: number; total: number; subjects: SubjectScore[] };

// Calcula acertos e pontos por matéria de uma correção. Prefere o resultado salvo de cada
// questão (results[i].isCorrect, que já considera revisões); sem ele, compara resposta e gabarito.
// Sem o simulado (apagado), usa os acertos salvos por matéria valendo 1 ponto cada.
export function scoreSubmission(submission: any, exam: any): SubmissionScore {
  const questions: any[] = Array.isArray(exam?.questions) ? exam.questions : [];
  const subjects = new Map<string, SubjectScore>();
  const entry = (subject: string) => {
    if (!subjects.has(subject)) subjects.set(subject, { subject, correct: 0, total: 0, earned: 0, max: 0 });
    return subjects.get(subject)!;
  };

  if (questions.length > 0) {
    const answers: any[] = submission?.answers || [];
    const results: any[] = submission?.results || [];
    questions.forEach((q, i) => {
      const s = entry(q?.subject || 'Geral');
      const pts = questionPoints(q);
      s.total += 1;
      s.max += pts;
      const saved = results[i]?.isCorrect;
      const isCorrect = typeof saved === 'boolean'
        ? saved
        : answers[i] !== undefined && answers[i] !== null && answers[i] !== -1 && answers[i] === q?.correctAnswer;
      if (isCorrect) {
        s.correct += 1;
        s.earned += pts;
      }
    });
  } else {
    (submission?.subjectPerformances || []).forEach((p: any) => {
      const s = entry(p.subject || 'Geral');
      s.total += Number(p.totalQuestions) || 0;
      s.correct += Number(p.correctAnswers) || 0;
      s.max += Number(p.totalQuestions) || 0;
      s.earned += Number(p.correctAnswers) || 0;
    });
  }

  const list = Array.from(subjects.values()).map(s => ({ ...s, earned: round2(s.earned), max: round2(s.max) }));
  return {
    subjects: list,
    earned: round2(list.reduce((a, s) => a + s.earned, 0)),
    max: round2(list.reduce((a, s) => a + s.max, 0)),
    correct: list.reduce((a, s) => a + s.correct, 0),
    total: list.reduce((a, s) => a + s.total, 0)
  };
}

// Composição do simulado: questões e pontos de cada matéria (para explicar a nota)
function examComposition(exam: any) {
  const map = new Map<string, { subject: string; count: number; points: number; values: Set<number> }>();
  (exam?.questions || []).forEach((q: any) => {
    const subject = q?.subject || 'Geral';
    const e = map.get(subject) || { subject, count: 0, points: 0, values: new Set<number>() };
    e.count += 1;
    e.points += questionPoints(q);
    e.values.add(round2(questionPoints(q)));
    map.set(subject, e);
  });
  return Array.from(map.values());
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// Coluna de nota: o valor máximo vai na 2ª linha do título quando é igual em todas as linhas
// ("Nota Geral" / "de 40,0 pontos"); se variar (simulados diferentes), vai numa coluna própria
function pointsColumns(key: string, label: string, maxes: number[], extra: Partial<ExcelColumn> = {}): ExcelColumn[] {
  const unique = Array.from(new Set(maxes.map(round2)));
  const base: ExcelColumn = { header: label, key, type: 'number', format: '0.0#', scoreTone: true, maxKey: `${key}Max`, ...extra };
  if (unique.length === 1) return [{ ...base, header: `${label}\nde ${formatPoints(unique[0])}` }];
  return [base, { header: `${label}\nvalor`, key: `${key}Max`, type: 'number', format: '0.0#', width: 10, group: extra.group }];
}

export type GradeReportOptions = {
  // Título da aba de resumo (ex: "Relatório Geral — SIMULADO 5º ANO")
  title: string;
  submissions: any[];
  examsById: Record<string, any>;
  // Texto da coluna "Tipo de Correção"; sem ele, a coluna não aparece
  correctionTypeLabel?: (submission: any) => string;
};

const sortRows = (a: any, b: any) =>
  String(a.turma || '').localeCompare(String(b.turma || ''), 'pt-BR', { numeric: true }) ||
  String(a.aluno || '').localeCompare(String(b.aluno || ''), 'pt-BR');

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

// Abas do relatório: "Resumo Geral" (uma linha por aluno, com a nota de cada matéria)
// e uma aba por matéria
export function buildGradeReportSheets({ title, submissions, examsById, correctionTypeLabel }: GradeReportOptions): ExcelExportOptions[] {
  const scored = submissions.map(sub => ({ sub, score: scoreSubmission(sub, examsById[sub.examId]) }));
  const examIds = Array.from(new Set(submissions.map(s => s.examId)));
  const multipleExams = examIds.length > 1;
  const examTitle = (sub: any) => sub.examTitle || examsById[sub.examId]?.title || 'Simulado';
  const turmas = Array.from(new Set(submissions.map(s => s.studentClass).filter(Boolean)));

  // Matérias na ordem em que aparecem no simulado
  const subjectOrder: string[] = [];
  scored.forEach(({ score }) => score.subjects.forEach(s => { if (!subjectOrder.includes(s.subject)) subjectOrder.push(s.subject); }));
  const subjectKey = (i: number) => `materia${i}`;

  // Quadro "Como a nota é calculada" (do simulado do relatório; com vários, do primeiro)
  const composition = examComposition(examsById[examIds[0]]);
  const compositionTotal = composition.reduce((a, c) => ({ count: a.count + c.count, points: a.points + c.points }), { count: 0, points: 0 });
  const notes = composition.length > 0 ? {
    title: multipleExams ? `Como a nota é calculada (${examsById[examIds[0]]?.title || 'simulado'})` : 'Como a nota é calculada',
    lines: [
      ...composition.map(c => ({
        label: c.subject,
        value: c.values.size === 1
          ? `${plural(c.count, 'questão', 'questões')} × ${formatPoints([...c.values][0])} = ${formatPoints(c.points)} pontos`
          : `${plural(c.count, 'questão', 'questões')} = ${formatPoints(c.points)} pontos`
      })),
      { label: 'Total do simulado', value: `${plural(compositionTotal.count, 'questão', 'questões')} = ${formatPoints(compositionTotal.points)} pontos`, strong: true }
    ]
  } : undefined;

  const resumoData = scored.map(({ sub, score }) => {
    const row: any = {
      aluno: sub.studentName,
      turma: sub.studentClass,
      simulado: examTitle(sub),
      acertos: score.correct,
      questoes: score.total,
      percentual: pct(score.correct, score.total),
      notaGeral: score.earned,
      notaGeralMax: score.max,
      tipoCorrecao: correctionTypeLabel ? correctionTypeLabel(sub) : undefined
    };
    subjectOrder.forEach((name, i) => {
      const s = score.subjects.find(x => x.subject === name);
      row[subjectKey(i)] = s ? s.earned : '';
      row[`${subjectKey(i)}Max`] = s ? s.max : '';
    });
    return row;
  }).sort(sortRows);

  const resumoColumns: ExcelColumn[] = [
    { header: 'Aluno', key: 'aluno', width: 34, type: 'text', bold: true },
    { header: 'Turma', key: 'turma', width: 11, type: 'text' },
    ...(multipleExams ? [{ header: 'Simulado', key: 'simulado', width: 30, type: 'text' } as ExcelColumn] : []),
    { header: 'Acertos', key: 'acertos', width: 10, type: 'number' },
    { header: 'Questões', key: 'questoes', width: 10, type: 'number', noStats: true },
    { header: 'Aproveitamento', key: 'percentual', width: 15, type: 'percentage', scoreTone: true },
    ...pointsColumns('notaGeral', 'Nota Geral', scored.map(x => x.score.max), { width: 13 }),
    ...subjectOrder.flatMap((name, i) => pointsColumns(
      subjectKey(i),
      name,
      scored.map(x => x.score.subjects.find(s => s.subject === name)?.max).filter((m): m is number => m !== undefined),
      { group: 'NOTAS POR MATÉRIA', width: 13 }
    )),
    ...(correctionTypeLabel ? [{ header: 'Tipo de Correção', key: 'tipoCorrecao', width: 20, type: 'text' } as ExcelColumn] : [])
  ];

  const notasGerais = scored.map(x => x.score.earned);
  const maxGeral = scored[0]?.score.max || 0;
  const sameMax = scored.every(x => x.score.max === maxGeral);
  const resumoHighlights: ExcelHighlight[] = [
    { label: 'Alunos', value: String(submissions.length), hint: turmas.length === 1 ? `turma ${turmas[0]}` : turmas.length > 1 ? `${turmas.length} turmas` : undefined },
    sameMax
      ? { label: 'Valor do simulado', value: `${formatPoints(maxGeral)} pts`, hint: `${compositionTotal.count || scored[0]?.score.total || 0} questões` }
      : { label: 'Simulados', value: String(examIds.length) },
    { label: 'Média geral', value: formatPoints(avg(notasGerais)), hint: sameMax ? `de ${formatPoints(maxGeral)}` : undefined },
    { label: 'Maior / menor nota', value: `${formatPoints(Math.max(...notasGerais))} / ${formatPoints(Math.min(...notasGerais))}` }
  ];

  const resumoSheet: ExcelExportOptions = {
    title,
    subtitle: 'Notas em pontos, pelo valor de cada questão no simulado',
    sheetName: 'Resumo Geral',
    includeStats: true,
    highlights: resumoHighlights,
    columns: resumoColumns,
    data: resumoData,
    notes,
    filename: ''
  };

  const subjectSheets: ExcelExportOptions[] = subjectOrder.map(name => {
    const rows = scored
      .map(({ sub, score }) => {
        const s = score.subjects.find(x => x.subject === name);
        if (!s) return null;
        return {
          aluno: sub.studentName,
          turma: sub.studentClass,
          simulado: examTitle(sub),
          acertos: s.correct,
          questoes: s.total,
          percentual: pct(s.correct, s.total),
          nota: s.earned,
          notaMax: s.max,
          notaGeral: score.earned,
          notaGeralMax: score.max
        };
      })
      .filter(Boolean)
      .sort(sortRows) as any[];

    const comp = composition.find(c => c.subject === name);
    const notas = rows.map(r => r.nota);
    const subjectMax = rows[0]?.notaMax || 0;
    return {
      title: name,
      subtitle: comp
        ? `${plural(comp.count, 'questão', 'questões')}${comp.values.size === 1 ? ` de ${formatPoints([...comp.values][0])} ponto${[...comp.values][0] === 1 ? '' : 's'}` : ''} = ${formatPoints(comp.points)} pontos na matéria`
        : undefined,
      sheetName: name,
      includeStats: true,
      highlights: [
        { label: 'Alunos', value: String(rows.length) },
        { label: 'Valor da matéria', value: `${formatPoints(subjectMax)} pts`, hint: comp ? plural(comp.count, 'questão', 'questões') : undefined },
        { label: 'Média na matéria', value: formatPoints(avg(notas)), hint: `de ${formatPoints(subjectMax)}` },
        { label: 'Maior / menor', value: notas.length ? `${formatPoints(Math.max(...notas))} / ${formatPoints(Math.min(...notas))}` : '-' }
      ],
      columns: [
        { header: 'Aluno', key: 'aluno', width: 34, type: 'text', bold: true },
        { header: 'Turma', key: 'turma', width: 11, type: 'text' },
        ...(multipleExams ? [{ header: 'Simulado', key: 'simulado', width: 30, type: 'text' } as ExcelColumn] : []),
        { header: 'Acertos', key: 'acertos', width: 10, type: 'number' },
        { header: 'Questões', key: 'questoes', width: 10, type: 'number', noStats: true },
        { header: 'Aproveitamento', key: 'percentual', width: 15, type: 'percentage', scoreTone: true },
        ...pointsColumns('nota', 'Nota na Matéria', rows.map(r => r.notaMax), { width: 16 }),
        ...pointsColumns('notaGeral', 'Nota Geral', rows.map(r => r.notaGeralMax), { width: 13 })
      ],
      data: rows,
      filename: ''
    };
  });

  return [resumoSheet, ...subjectSheets];
}
