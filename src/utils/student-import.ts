// Leitura de planilhas/CSV de alunos (usada em Gerenciar Alunos e em Configurações)
import { apiService } from './api';

export type ImportedStudent = {
  name: string;
  email: string;
  class: string;
  grade: string;
  registration: string;
};

export const stripAccents = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalizeHeaderCell = (h: unknown) => stripAccents(String(h ?? '')).toLowerCase().trim();

// Quando a planilha não tem cabeçalho reconhecível, tenta adivinhar qual coluna é o nome, o
// email e a matrícula só olhando pro CONTEÚDO das linhas: email é o que tem "@"; matrícula é
// a coluna que é só número; nome é a coluna de texto (não numérica, não email) com mais
// palavras em média, já que nome completo costuma ter nome + sobrenome(s).
function guessColumnsFromData(dataRows: any[][], colCount: number) {
  const stats = Array.from({ length: colCount }, () => ({ total: 0, emailish: 0, numeric: 0, wordsSum: 0 }));

  dataRows.slice(0, 30).forEach(row => {
    for (let c = 0; c < colCount; c++) {
      const v = String(row?.[c] ?? '').trim();
      if (!v) continue;
      const s = stats[c];
      s.total++;
      if (v.includes('@')) s.emailish++;
      if (/^\d+$/.test(v)) s.numeric++;
      s.wordsSum += v.split(/\s+/).filter(Boolean).length;
    }
  });

  let cEmail = -1;
  stats.forEach((s, i) => {
    if (cEmail === -1 && s.total > 0 && s.emailish / s.total > 0.5) cEmail = i;
  });

  let cName = -1;
  let bestAvgWords = -1;
  stats.forEach((s, i) => {
    if (i === cEmail || s.total === 0) return;
    if (s.numeric / s.total > 0.5) return; // coluna majoritariamente numérica não é nome
    const avgWords = s.wordsSum / s.total;
    if (avgWords > bestAvgWords) { bestAvgWords = avgWords; cName = i; }
  });

  let cRegistration = -1;
  stats.forEach((s, i) => {
    if (cRegistration === -1 && i !== cEmail && i !== cName && s.total > 0 && s.numeric / s.total > 0.5) {
      cRegistration = i;
    }
  });

  return { cName, cEmail, cRegistration };
}

// Lê o CSV respeitando a codificação: UTF-8 (com ou sem BOM) ou, se não for UTF-8 válido,
// Windows-1252 — que é como o Excel em português salva "CSV" por padrão. Sem isso, "João" vira "Jo�o".
function decodeCsvBytes(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes).replace(/^﻿/, '');
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

// Separa o CSV em linhas/células. Detecta o separador (";" do Excel pt-BR, "," ou tabulação)
// e respeita campos entre aspas, que podem conter o próprio separador ou aspas duplicadas.
function parseCsv(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const count = (ch: string) => firstLine.split(ch).length - 1;
  const sep = ['\t', ';', ','].reduce((best, ch) => (count(ch) > count(best) ? ch : best), ',');

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') inQuotes = false;
      else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === sep) {
      row.push(field); field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);
  return rows.filter(r => r.some(c => c.trim()));
}

// Nomes que o Excel/LibreOffice dá às abas por padrão, em português, inglês e espanhol
export const isDefaultSheetName = (name: string) =>
  !name || /^(plan(ilha)?|sheet|folha|hoja|tabela|pasta|book)\s*\d*$/i.test(stripAccents(name));

// Nome curto começando por número (ex: "9001", "9001 - CE", "1º Ano A"); evita pegar
// nomes de arquivo como "alunos (1)" ou "Pasta1"
const looksLikeClassName = (name: string) => name.length <= 20 && /^\d/.test(name);

// Converte linhas de uma planilha/CSV em alunos. Tenta, nessa ordem: (1) reconhecer as
// colunas pelo nome do cabeçalho (Nome, Email, Turma, Série, Matrícula, em qualquer ordem —
// cobre exportações de outros sistemas, como "MATRÍCULA, ALUNO"); (2) se não achar cabeçalho
// nenhum, adivinhar pelo conteúdo das células (guessColumnsFromData); (3) por último, assume o
// modelo fixo antigo (Nome, Email, Turma, Série, Matrícula, nessa ordem). Assim, mesmo uma
// planilha "de qualquer jeito" — sem os campos certos — tem uma chance boa de ser importada.
export function rowsToStudents(rows: any[][], sheetNameAsClassFallback = ''): ImportedStudent[] {
  if (rows.length === 0) return [];

  const colCount = Math.max(...rows.map(r => r?.length || 0), 1);
  const header = rows[0].map(normalizeHeaderCell);
  const findCol = (...names: string[]) => header.findIndex(h => names.some(n => h.includes(n)));

  let cName = findCol('nome', 'aluno', 'estudante');
  let cEmail = findCol('email', 'e-mail');
  let cClass = findCol('turma', 'classe');
  let cGrade = findCol('turno', 'curso', 'serie', 'ano');
  let cRegistration = findCol('matricula', 'registro', 'ra');

  const dataRows = rows.slice(1);

  if (cName < 0) {
    // Nenhum cabeçalho reconhecido: tenta adivinhar pelo conteúdo dos dados
    const guessed = guessColumnsFromData(dataRows, colCount);
    if (guessed.cName >= 0) {
      cName = guessed.cName;
      cEmail = guessed.cEmail;
      cRegistration = guessed.cRegistration;
      cClass = -1;
      cGrade = -1;
    } else {
      // Último recurso: modelo fixo antigo (Nome, Email, Turma, Série, Matrícula)
      cName = 0; cEmail = 1; cClass = 2; cGrade = 3; cRegistration = 4;
    }
  }

  const cell = (row: any[], idx: number) => (idx >= 0 ? String(row?.[idx] ?? '').trim() : '');
  const students: ImportedStudent[] = [];

  for (const row of dataRows) {
    if (!row || row.length === 0) continue;

    const name = cell(row, cName);
    if (!name) continue;

    students.push({
      name,
      email: cell(row, cEmail),
      class: cell(row, cClass) || sheetNameAsClassFallback,
      grade: cell(row, cGrade),
      registration: cell(row, cRegistration)
    });
  }

  return students;
}

export const isStudentSpreadsheet = (file: File) =>
  /\.(csv|xlsx|xls)$/i.test(file.name) ||
  ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(file.type);

// Lê um arquivo CSV/Excel e devolve os alunos encontrados
export async function readStudentsFromFile(file: File): Promise<ImportedStudent[]> {
  if (/\.csv$/i.test(file.name) || file.type === 'text/csv') {
    // Aceita ";", "," ou tabulação, em UTF-8 ou na codificação do Excel
    return rowsToStudents(parseCsv(decodeCsvBytes(await file.arrayBuffer())));
  }

  const XLSX = await import('xlsx');
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, defval: '' }) as any[][];
  // Se a planilha não tem coluna de turma, o nome da aba às vezes já é o código da turma
  // (ex: aba "9001"). Nome padrão de aba ("Planilha2", "Sheet1"...) não é turma; aí tenta o
  // nome do arquivo (ex: "9001 - CE.xlsx"), desde que pareça um código de turma
  const sheetName = firstSheetName.trim();
  const fileBaseName = file.name.replace(/\.[^.]+$/, '').trim();
  let sheetNameHint = '';
  if (!isDefaultSheetName(sheetName)) sheetNameHint = sheetName;
  else if (looksLikeClassName(fileBaseName)) sheetNameHint = fileBaseName;
  return rowsToStudents(jsonData, sheetNameHint);
}

// Cadastra em "Gerenciar Turmas" as turmas dos alunos que ainda não existem lá.
// Retorna quantas turmas foram criadas
export async function ensureClassesExist(studentsList: { class?: string; grade?: string }[]): Promise<number> {
  try {
    const names = new Map<string, string>();
    studentsList.forEach(s => {
      const name = (s.class || '').trim();
      if (name && !names.has(name.toLowerCase())) names.set(name.toLowerCase(), s.grade?.trim() || '');
    });
    if (names.size === 0) return 0;

    const existing = (await apiService.getClasses())?.classes || [];
    const existingNames = new Set(existing.map((c: any) => String(c.name).trim().toLowerCase()));
    const missing = Array.from(names.entries()).filter(([key]) => !existingNames.has(key));

    for (const [key, grade] of missing) {
      const original = studentsList.find(s => (s.class || '').trim().toLowerCase() === key)!.class!.trim();
      await apiService.createClass({
        name: original,
        grade: grade || original,
        shift: 'Manhã',
        year: new Date().getFullYear().toString()
      });
    }
    return missing.length;
  } catch (error) {
    console.error('Error auto-registering classes:', error);
    return 0;
  }
}

export type StudentImportSummary = {
  total: number;
  saved: number;
  duplicates: number;
  failed: number;
  withoutClass: number;
  createdClasses: number;
  error?: string;
};

// Chave para reconhecer um aluno que já está cadastrado: a matrícula, quando existe; senão, nome + turma
const studentKey = (s: { name?: string; class?: string; registration?: string }) => {
  const registration = String(s.registration || '').trim();
  if (registration) return `r:${registration}`;
  const norm = (t?: string) => stripAccents(String(t || '')).toLowerCase().replace(/\s+/g, ' ').trim();
  return `n:${norm(s.name)}|${norm(s.class)}`;
};

// Salva os alunos importados no servidor: pula quem já está cadastrado, envia em lotes (um lote
// grande estourava o tempo limite da requisição) e confere a resposta de cada lote, para que uma
// falha apareça como erro em vez de "importado com sucesso".
export async function saveImportedStudents(students: ImportedStudent[]): Promise<StudentImportSummary> {
  const summary: StudentImportSummary = {
    total: students.length, saved: 0, duplicates: 0, failed: 0, withoutClass: 0, createdClasses: 0
  };

  const existingResponse = await apiService.getStudents();
  if (existingResponse?.success === false) {
    summary.failed = students.length;
    summary.error = existingResponse.error || 'Não foi possível consultar os alunos já cadastrados';
    return summary;
  }
  const seen = new Set<string>((existingResponse?.students || []).map(studentKey));

  const toSave: ImportedStudent[] = [];
  for (const student of students) {
    const key = studentKey(student);
    if (seen.has(key)) { summary.duplicates++; continue; }
    seen.add(key);
    toSave.push(student);
  }

  const BATCH_SIZE = 20;
  for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
    const batch = toSave.slice(i, i + BATCH_SIZE);
    const response = await apiService.createStudents(batch);
    const savedCount = Array.isArray(response?.students) ? response.students.length : 0;
    if (response?.success && savedCount > 0) {
      summary.saved += savedCount;
      summary.failed += batch.length - savedCount;
    } else {
      summary.failed += batch.length;
      summary.error = summary.error || response?.error || 'O servidor não confirmou o cadastro';
    }
  }

  const savedStudents = toSave.slice(0, summary.saved);
  summary.withoutClass = savedStudents.filter(s => !s.class?.trim()).length;
  summary.createdClasses = await ensureClassesExist(savedStudents);
  return summary;
}

// Monta o conteúdo do modal de resultado a partir do resumo da importação
export function describeStudentImport(summary: StudentImportSummary) {
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const details: string[] = [];
  if (summary.saved > 0 && summary.failed > 0) details.push(plural(summary.saved, 'aluno foi salvo', 'alunos foram salvos'));
  if (summary.failed > 0) details.push(`${plural(summary.failed, 'aluno não foi salvo', 'alunos não foram salvos')}${summary.error ? ` (${summary.error})` : ''}`);
  if (summary.duplicates > 0) details.push(`${plural(summary.duplicates, 'aluno já estava cadastrado e foi ignorado', 'alunos já estavam cadastrados e foram ignorados')}`);
  if (summary.withoutClass > 0) details.push(`${plural(summary.withoutClass, 'aluno ficou sem turma', 'alunos ficaram sem turma')}: a planilha não tem coluna de turma. Defina a turma em Gerenciar Alunos.`);
  if (summary.createdClasses > 0) details.push(`${summary.createdClasses} turma(s) cadastrada(s) automaticamente em Gerenciar Turmas`);

  if (summary.failed > 0) {
    return {
      type: 'error' as const,
      title: summary.saved > 0 ? 'Importação incompleta' : 'Falha na importação',
      message: summary.saved > 0
        ? 'Parte dos alunos não subiu. Importe o arquivo de novo: quem já foi salvo não será duplicado.'
        : 'Nenhum aluno foi salvo. Tente importar novamente.',
      details
    };
  }
  if (summary.saved === 0) {
    return {
      type: 'error' as const,
      title: 'Nenhum aluno novo',
      message: 'Todos os alunos do arquivo já estavam cadastrados.',
      details
    };
  }
  return {
    type: 'success' as const,
    title: 'Importação concluída',
    message: summary.saved === 1 ? '1 aluno importado com sucesso!' : `${summary.saved} alunos importados com sucesso!`,
    details: details.length > 0 ? details : undefined
  };
}
