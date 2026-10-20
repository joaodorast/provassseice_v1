import { ExcelColumn, ExcelExportOptions } from './excel-utils';

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

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);

// Cabeçalho com o valor máximo quando ele é igual em todas as linhas ("Nota (de 5,0)");
// se variar (simulados diferentes), o máximo vai numa coluna própria
function pointsColumns(key: string, label: string, maxes: number[], minWidth = 14): ExcelColumn[] {
  // Largura suficiente para o título inteiro caber sem cortar (+4 do botão de filtro)
  const fit = (header: string) => Math.max(minWidth, Math.ceil(header.length * 1.1) + 5);
  const unique = Array.from(new Set(maxes.map(round2)));
  if (unique.length === 1) {
    const header = `${label} (de ${formatPoints(unique[0])})`;
    return [{ header, key, width: fit(header), type: 'number', format: '0.0#' }];
  }
  return [
    { header: label, key, width: fit(label), type: 'number', format: '0.0#' },
    { header: `${label} – Valor`, key: `${key}Max`, width: fit(`${label} – Valor`), type: 'number', format: '0.0#' }
  ];
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

// Abas do relatório: "Resumo Geral" (uma linha por aluno, com a nota de cada matéria)
// e uma aba por matéria
export function buildGradeReportSheets({ title, submissions, examsById, correctionTypeLabel }: GradeReportOptions): ExcelExportOptions[] {
  const scored = submissions.map(sub => ({ sub, score: scoreSubmission(sub, examsById[sub.examId]) }));
  const multipleExams = new Set(submissions.map(s => s.examId)).size > 1;
  const examTitle = (sub: any) => sub.examTitle || examsById[sub.examId]?.title || 'Simulado';

  // Matérias na ordem em que aparecem no simulado
  const subjectOrder: string[] = [];
  scored.forEach(({ score }) => score.subjects.forEach(s => { if (!subjectOrder.includes(s.subject)) subjectOrder.push(s.subject); }));
  const subjectKey = (i: number) => `materia${i}`;

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
    { header: 'Aluno', key: 'aluno', width: 34, type: 'text' },
    { header: 'Turma', key: 'turma', width: 12, type: 'text' },
    ...(multipleExams ? [{ header: 'Simulado', key: 'simulado', width: 30, type: 'text' } as ExcelColumn] : []),
    { header: 'Acertos', key: 'acertos', width: 12, type: 'number' },
    { header: 'Questões', key: 'questoes', width: 14, type: 'number' },
    { header: 'Percentual', key: 'percentual', width: 15, type: 'percentage' },
    ...pointsColumns('notaGeral', 'Nota Geral', scored.map(x => x.score.max), 16),
    ...subjectOrder.flatMap((name, i) => pointsColumns(
      subjectKey(i),
      name,
      scored.map(x => x.score.subjects.find(s => s.subject === name)?.max).filter((m): m is number => m !== undefined),
      16
    )),
    ...(correctionTypeLabel ? [{ header: 'Tipo de Correção', key: 'tipoCorrecao', width: 21, type: 'text' } as ExcelColumn] : [])
  ];

  const resumoSheet: ExcelExportOptions = {
    title,
    subtitle: `Total de alunos: ${submissions.length}   |   Notas em pontos, pelo valor de cada questão no simulado`,
    sheetName: 'Resumo Geral',
    includeStats: true,
    columns: resumoColumns,
    data: resumoData,
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

    return {
      title: `Detalhamento — ${name}`,
      subtitle: `Total de alunos: ${rows.length}`,
      sheetName: name,
      includeStats: true,
      columns: [
        { header: 'Aluno', key: 'aluno', width: 34, type: 'text' },
        { header: 'Turma', key: 'turma', width: 12, type: 'text' },
        ...(multipleExams ? [{ header: 'Simulado', key: 'simulado', width: 30, type: 'text' } as ExcelColumn] : []),
        { header: 'Acertos', key: 'acertos', width: 12, type: 'number' },
        { header: 'Questões', key: 'questoes', width: 14, type: 'number' },
        { header: 'Percentual', key: 'percentual', width: 15, type: 'percentage' },
        ...pointsColumns('nota', 'Nota na Matéria', rows.map(r => r.notaMax), 18),
        ...pointsColumns('notaGeral', 'Nota Geral', rows.map(r => r.notaGeralMax), 16)
      ],
      data: rows,
      filename: ''
    };
  });

  return [resumoSheet, ...subjectSheets];
}
