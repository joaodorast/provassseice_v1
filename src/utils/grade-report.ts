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
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

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
  return Array.from(map.values()).map(e => ({ ...e, points: round2(e.points) }));
}

// Coluna de nota com o máximo na 2ª linha do título ("Nota Geral" / "de 40,0"): as colunas
// ficam estreitas e a planilha cabe na tela. Se o máximo variar (simulados diferentes),
// ele vai numa coluna própria.
function pointsColumns(key: string, label: string, maxes: number[], width = 12): ExcelColumn[] {
  const unique = Array.from(new Set(maxes.map(round2)));
  if (unique.length === 1) {
    return [{ header: `${label}\nde ${formatPoints(unique[0])}`, key, width, type: 'number', format: '0.0#' }];
  }
  return [
    { header: label, key, width, type: 'number', format: '0.0#' },
    { header: `${label}\nvalor`, key: `${key}Max`, width: 10, type: 'number', format: '0.0#' }
  ];
}

export type GradeReportOptions = {
  // Título da aba de resumo (ex: "Relatório Geral — SIMULADO 5º ANO")
  title: string;
  submissions: any[];
  examsById: Record<string, any>;
  // Mantido por compatibilidade: a coluna "Tipo de Correção" saiu do resumo para a planilha
  // caber na tela sem rolar para o lado
  correctionTypeLabel?: (submission: any) => string;
};

const sortRows = (a: any, b: any) =>
  String(a.turma || '').localeCompare(String(b.turma || ''), 'pt-BR', { numeric: true }) ||
  String(a.aluno || '').localeCompare(String(b.aluno || ''), 'pt-BR');

// Abas do relatório: "Resumo Geral" (uma linha por aluno, com a nota de cada matéria)
// e uma aba por matéria
export function buildGradeReportSheets({ title, submissions, examsById }: GradeReportOptions): ExcelExportOptions[] {
  const scored = submissions.map(sub => ({ sub, score: scoreSubmission(sub, examsById[sub.examId]) }));
  const examIds = Array.from(new Set(submissions.map(s => s.examId)));
  const multipleExams = examIds.length > 1;
  const examTitle = (sub: any) => sub.examTitle || examsById[sub.examId]?.title || 'Simulado';
  const turmas = Array.from(new Set(submissions.map(s => s.studentClass).filter(Boolean)));
  const turmaHint = turmas.length === 1 ? `turma ${turmas[0]}` : turmas.length > 1 ? `${turmas.length} turmas` : undefined;

  // Matérias na ordem em que aparecem no simulado
  const subjectOrder: string[] = [];
  scored.forEach(({ score }) => score.subjects.forEach(s => { if (!subjectOrder.includes(s.subject)) subjectOrder.push(s.subject); }));
  const subjectKey = (i: number) => `materia${i}`;

  // "Como a nota é calculada" (do simulado do relatório; com vários, do primeiro)
  const composition = examComposition(examsById[examIds[0]]);
  const totalQuestions = composition.reduce((a, c) => a + c.count, 0);
  const totalPoints = round2(composition.reduce((a, c) => a + c.points, 0));
  const notes = composition.length > 0 ? {
    title: 'Como a nota é calculada',
    lines: [
      ...composition.map(c => ({
        label: c.subject,
        value: c.values.size === 1
          ? `${plural(c.count, 'questão', 'questões')} × ${formatPoints([...c.values][0])} = ${formatPoints(c.points)} pontos`
          : `${plural(c.count, 'questão', 'questões')} = ${formatPoints(c.points)} pontos`
      })),
      { label: 'Total do simulado', value: `${plural(totalQuestions, 'questão', 'questões')} = ${formatPoints(totalPoints)} pontos`, strong: true }
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
      notaGeralMax: score.max
    };
    subjectOrder.forEach((name, i) => {
      const s = score.subjects.find(x => x.subject === name);
      row[subjectKey(i)] = s ? s.earned : '';
      row[`${subjectKey(i)}Max`] = s ? s.max : '';
    });
    return row;
  }).sort(sortRows);

  // Colunas estreitas (títulos longos quebram em 2 linhas) para caber na tela sem rolar para o lado
  const resumoColumns: ExcelColumn[] = [
    { header: 'Aluno', key: 'aluno', width: 32, type: 'text' },
    { header: 'Turma', key: 'turma', width: 10, type: 'text' },
    ...(multipleExams ? [{ header: 'Simulado', key: 'simulado', width: 26, type: 'text' } as ExcelColumn] : []),
    { header: 'Acertos', key: 'acertos', width: 11, type: 'number' },
    { header: 'Questões', key: 'questoes', width: 12, type: 'number' },
    { header: 'Percentual', key: 'percentual', width: 13, type: 'percentage' },
    ...pointsColumns('notaGeral', 'Nota Geral', scored.map(x => x.score.max), 13),
    ...subjectOrder.flatMap((name, i) => pointsColumns(
      subjectKey(i),
      name,
      scored.map(x => x.score.subjects.find(s => s.subject === name)?.max).filter((m): m is number => m !== undefined),
      13
    ))
  ];

  const notasGerais = scored.map(x => x.score.earned);
  const sameMax = scored.every(x => x.score.max === scored[0]?.score.max);
  const maxGeral = scored[0]?.score.max || totalPoints;

  const resumoSheet: ExcelExportOptions = {
    title,
    subtitle: 'Notas em pontos, pelo valor de cada questão no simulado',
    sheetName: 'Resumo Geral',
    includeStats: true,
    summary: [
      { label: 'Alunos', value: String(submissions.length), hint: turmaHint },
      {
        label: 'Valor do simulado',
        value: `${formatPoints(sameMax ? maxGeral : totalPoints)} pontos`,
        hint: plural(totalQuestions || scored[0]?.score.total || 0, 'questão', 'questões')
      },
      { label: 'Média geral', value: formatPoints(avg(notasGerais)), hint: sameMax ? `de ${formatPoints(maxGeral)}` : undefined }
    ],
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
    const subjectMax = rows[0]?.notaMax || comp?.points || 0;
    return {
      title: `Detalhamento — ${name}`,
      subtitle: comp
        ? `${plural(comp.count, 'questão', 'questões')}${comp.values.size === 1 ? ` × ${formatPoints([...comp.values][0])}` : ''} = ${formatPoints(comp.points)} pontos na matéria`
        : undefined,
      sheetName: name,
      includeStats: true,
      summary: [
        { label: 'Alunos', value: String(rows.length), hint: turmaHint },
        { label: 'Valor da matéria', value: `${formatPoints(subjectMax)} pontos`, hint: comp ? plural(comp.count, 'questão', 'questões') : undefined },
        { label: 'Média na matéria', value: formatPoints(avg(rows.map(r => r.nota))), hint: `de ${formatPoints(subjectMax)}` }
      ],
      columns: [
        { header: 'Aluno', key: 'aluno', width: 32, type: 'text' },
        { header: 'Turma', key: 'turma', width: 10, type: 'text' },
        ...(multipleExams ? [{ header: 'Simulado', key: 'simulado', width: 26, type: 'text' } as ExcelColumn] : []),
        { header: 'Acertos', key: 'acertos', width: 11, type: 'number' },
        { header: 'Questões', key: 'questoes', width: 12, type: 'number' },
        { header: 'Percentual', key: 'percentual', width: 13, type: 'percentage' },
        ...pointsColumns('nota', 'Nota na Matéria', rows.map(r => r.notaMax), 17),
        ...pointsColumns('notaGeral', 'Nota Geral', rows.map(r => r.notaGeralMax), 13)
      ],
      data: rows,
      filename: ''
    };
  });

  return [resumoSheet, ...subjectSheets];
}
