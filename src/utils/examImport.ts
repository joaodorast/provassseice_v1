// Importa um simulado pronto a partir de um arquivo Word (.docx), Excel (.xlsx/.xls/.csv)
// ou PDF, organizando automaticamente em seções e questões.
//
// Word: o .docx é lido diretamente do XML interno (não só o texto), para capturar formatação
// que o enunciado usa: título com estilo "Título"/heading do Word ou texto em negrito sozinho
// no parágrafo vira nova seção (matéria); alternativa com QUALQUER texto em vermelho vira o
// gabarito da questão (além de "Gabarito: B", "Resposta: B" ou um "*" do jeito tradicional).
// PDF: mesma lógica de seções/questões/alternativas, mas por texto simples (usa fonte maior
// que o resto do texto para tentar achar títulos de seção; não há como ler cor no PDF aqui).
// Excel/CSV: usa uma linha de cabeçalho (Seção, Pergunta, Alternativa A..E, Resposta, etc).
//
// É uma leitura heurística: sempre revise as questões importadas antes de publicar o simulado.

import * as XLSX from 'xlsx';

export interface ImportedQuestion {
  question: string;
  subject: string;
  type: 'multiple-choice' | 'essay';
  options: string[];
  correctAnswer: number;
  difficulty: string;
  points: number;
}

export interface ImportedSection {
  name: string;
  description: string;
  questions: ImportedQuestion[];
}

export interface ImportResult {
  sections: ImportedSection[];
  warnings: string[];
}

interface DocLine {
  text: string;
  heading: boolean;
  /** Linha contém trecho de texto em vermelho (indicação de gabarito usada no Word) */
  redMarked: boolean;
}

const LETTER_INDEX: Record<string, number> = { a: 0, b: 1, c: 2, d: 3, e: 4 };

// Considera "vermelho" qualquer tom onde o canal R domina bem sobre G e B
// (cobre o vermelho padrão do Word FF0000, "vermelho escuro" C00000, etc).
function isReddish(hex: string | null | undefined): boolean {
  if (!hex) return false;
  const m = /^([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return false;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return r > 110 && r - g > 35 && r - b > 35;
}

const localName = (el: Element) => el.tagName.includes(':') ? el.tagName.split(':').pop()! : el.tagName;
const childrenNamed = (el: Element, name: string) => Array.from(el.children).filter(c => localName(c) === name);
const firstChildNamed = (el: Element, name: string) => childrenNamed(el, name)[0];

// ---------- Extração de linhas (com detecção de título/negrito/vermelho) por tipo de arquivo ----------

async function extractLinesFromDocx(file: File): Promise<DocLine[]> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const xmlText = await zip.file('word/document.xml')?.async('text');
  if (!xmlText) return [];

  const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p')).length > 0
    ? Array.from(xmlDoc.getElementsByTagName('w:p'))
    : Array.from(xmlDoc.getElementsByTagName('p'));

  const lines: DocLine[] = [];

  paragraphs.forEach((p) => {
    const pPr = firstChildNamed(p, 'pPr');
    const pStyleEl = pPr ? firstChildNamed(pPr, 'pStyle') : undefined;
    const styleVal = pStyleEl?.getAttribute('w:val') || pStyleEl?.getAttribute('val') || '';
    const isHeadingStyle = /^(heading|t[ií]tulo)/i.test(styleVal);

    // Junta runs (e runs dentro de hyperlinks) na ordem em que aparecem no parágrafo
    const runs: Element[] = [];
    Array.from(p.children).forEach(c => {
      const name = localName(c);
      if (name === 'r') runs.push(c);
      else if (name === 'hyperlink') childrenNamed(c, 'r').forEach(r => runs.push(r));
    });

    let curText = '';
    let curHasRed = false;
    let curAllBold = true;
    let curHasText = false;
    let isFirstLineOfParagraph = true;

    const flush = () => {
      const text = curText.replace(/\s+/g, ' ').trim();
      if (text) {
        lines.push({
          text,
          heading: isFirstLineOfParagraph && (isHeadingStyle || (curAllBold && text.length <= 60)),
          redMarked: curHasRed
        });
      }
      isFirstLineOfParagraph = false;
      curText = '';
      curHasRed = false;
      curAllBold = true;
      curHasText = false;
    };

    runs.forEach((r) => {
      const rPr = firstChildNamed(r, 'rPr');
      let bold = false;
      let color: string | null = null;
      if (rPr) {
        const bEl = firstChildNamed(rPr, 'b');
        if (bEl) {
          const v = bEl.getAttribute('w:val') ?? bEl.getAttribute('val');
          bold = v === null || v === '1' || v === 'true' || v === 'on';
        }
        const colorEl = firstChildNamed(rPr, 'color');
        color = colorEl?.getAttribute('w:val') || colorEl?.getAttribute('val') || null;
      }
      const red = isReddish(color);

      Array.from(r.children).forEach((node) => {
        const name = localName(node);
        if (name === 't') {
          const t = node.textContent || '';
          if (t.trim()) {
            curHasText = true;
            if (!bold) curAllBold = false;
            if (red) curHasRed = true;
          }
          curText += t;
        } else if (name === 'tab') {
          curText += ' ';
        } else if (name === 'br' || name === 'cr') {
          flush();
        }
      });
      void curHasText;
    });
    flush();
  });

  return lines;
}

async function extractLinesFromPdf(file: File): Promise<DocLine[]> {
  const pdfjsLib: any = await import('pdfjs-dist');
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const rawLines: { text: string; size: number }[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const groups: Record<string, { parts: string[]; size: number }> = {};
    content.items.forEach((item: any) => {
      const y = Math.round(item.transform[5] / 2) * 2;
      const size = Math.abs(item.transform[3]) || Math.abs(item.transform[0]) || 0;
      if (!groups[y]) groups[y] = { parts: [], size };
      groups[y].parts.push(item.str);
      groups[y].size = Math.max(groups[y].size, size);
    });
    const orderedY = Object.keys(groups).map(Number).sort((a, b) => b - a);
    orderedY.forEach(y => {
      const text = groups[y].parts.join(' ').trim();
      if (text) rawLines.push({ text, size: groups[y].size });
    });
  }

  const sizes = rawLines.map(l => l.size).filter(s => s > 0).sort((a, b) => a - b);
  const medianSize = sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : 0;

  return rawLines.map(l => ({
    text: l.text,
    heading: medianSize > 0 && l.size > medianSize * 1.15 && l.text.length <= 60,
    redMarked: false
  }));
}

// ---------- Parser heurístico de linhas (Word/PDF) ----------

const SECTION_RE = /^(?:se(?:c|ç)(?:a|ã)o|parte|m(?:o|ó)dulo)\s*[:\-–]?\s*(.+)$/i;
const QUESTION_RE = /^(?:quest(?:a|ã)o\s*)?0*(\d{1,3})\s*[\.\)\-–]\s*(.*)$/i;
// Alternativa "de verdade": letra + pontuação (A), (A), A., A -, A:). É o formato esperado.
const OPTION_RE = /^\(?([a-eA-E])\)?\s*[\.\)\-–:]\s*(\S.*)$/;
// Fallback para quando o Word não coloca pontuação nenhuma depois da letra (ex: só "A" + tab):
// só aceita se a letra for exatamente a próxima esperada em sequência (evita confundir com
// palavras comuns como "A costa..." que também começam com uma letra maiúscula seguida de espaço).
const LOOSE_OPTION_RE = /^([A-E])\s+(\S.*)$/;
const ANSWER_RE = /^(?:gabarito|resposta(?:\s+correta)?|correta)\s*[:\-–]?\s*\(?([a-eA-E])\)?/i;

function looksLikeSectionHeading(line: string): boolean {
  if (SECTION_RE.test(line)) return true;
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 45) return false;
  if (QUESTION_RE.test(trimmed) || OPTION_RE.test(trimmed)) return false;
  const letters = trimmed.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length === 0) return false;
  // Título curto todo em maiúsculas (ex: "MATEMÁTICA", "LÍNGUA PORTUGUESA")
  return letters === letters.toUpperCase() && /[A-Za-zÀ-ÿ]/.test(letters);
}

function parseLinesIntoSections(docLines: DocLine[]): ImportResult {
  const lines = docLines.filter(l => l.text.trim().length > 0);

  const sections: ImportedSection[] = [];
  const warnings: string[] = [];

  let currentSection: ImportedSection | null = null;
  let currentQuestion: ImportedQuestion | null = null;
  let lastOptionIndex = -1;
  let lastQuestionNumber = 0;
  let anyExplicitHeading = false;

  const ensureDefaultSection = () => {
    if (!currentSection) {
      currentSection = { name: 'Questões', description: '', questions: [] };
      sections.push(currentSection);
    }
  };

  const pushQuestion = () => {
    if (currentQuestion) {
      currentQuestion.question = currentQuestion.question.trim();
      currentQuestion.options = currentQuestion.options.map(o => (o || '').trim());
      if (currentQuestion.question) {
        ensureDefaultSection();
        currentSection!.questions.push(currentQuestion);
      }
    }
    currentQuestion = null;
    lastOptionIndex = -1;
  };

  const startSection = (name: string) => {
    pushQuestion();
    currentSection = { name: name.trim() || `Seção ${sections.length + 1}`, description: '', questions: [] };
    sections.push(currentSection);
    lastQuestionNumber = 0;
  };

  let anyRedMarked = false;

  for (const { text: line, heading, redMarked } of lines) {
    const explicitHeading = heading || SECTION_RE.test(line) || (!currentQuestion && looksLikeSectionHeading(line));

    if (explicitHeading && !QUESTION_RE.test(line) && !OPTION_RE.test(line) && !ANSWER_RE.test(line)) {
      anyExplicitHeading = true;
      const name = SECTION_RE.exec(line)?.[1] || line;
      startSection(name);
      continue;
    }

    const answerMatch = ANSWER_RE.exec(line);
    if (answerMatch && currentQuestion) {
      currentQuestion.correctAnswer = LETTER_INDEX[answerMatch[1].toLowerCase()] ?? 0;
      continue;
    }

    const questionMatch = QUESTION_RE.exec(line);
    let optionMatch = !questionMatch ? OPTION_RE.exec(line) : null;
    if (!optionMatch && !questionMatch && currentQuestion) {
      const loose = LOOSE_OPTION_RE.exec(line);
      if (loose && LETTER_INDEX[loose[1].toLowerCase()] === lastOptionIndex + 1) {
        optionMatch = loose;
      }
    }

    if (questionMatch) {
      const number = parseInt(questionMatch[1], 10);
      // Sem nenhum título explícito encontrado até agora: a numeração voltar pra trás
      // (ex: da questão 10 pra "1)" de novo) é o único sinal de que começou outra seção.
      if (!anyExplicitHeading && currentSection && number <= lastQuestionNumber && currentSection.questions.length > 0) {
        pushQuestion();
        currentSection = { name: `Seção ${sections.length + 1}`, description: '', questions: [] };
        sections.push(currentSection);
      } else {
        pushQuestion();
      }
      lastQuestionNumber = number;
      currentQuestion = {
        question: questionMatch[2] || '',
        subject: currentSection?.name || '',
        type: 'multiple-choice',
        options: [],
        correctAnswer: 0,
        difficulty: 'Médio',
        points: 1
      };
      continue;
    }

    if (optionMatch && currentQuestion) {
      const letter = optionMatch[1].toLowerCase();
      const idx = LETTER_INDEX[letter];
      let text = optionMatch[2] || '';
      const starMarksCorrect = /\*\s*$/.test(text) || /^\*/.test(text);
      if (starMarksCorrect) {
        text = text.replace(/^\*|\*\s*$/g, '').trim();
      }
      if (starMarksCorrect || redMarked) {
        currentQuestion.correctAnswer = idx;
        if (redMarked) anyRedMarked = true;
      }
      currentQuestion.options[idx] = text;
      lastOptionIndex = idx;
      continue;
    }

    // Linha de continuação: acrescenta ao enunciado ou à última alternativa
    if (currentQuestion) {
      if (lastOptionIndex >= 0 && currentQuestion.options[lastOptionIndex] !== undefined) {
        currentQuestion.options[lastOptionIndex] += ' ' + line;
        if (redMarked) { currentQuestion.correctAnswer = lastOptionIndex; anyRedMarked = true; }
      } else {
        currentQuestion.question += (currentQuestion.question ? ' ' : '') + line;
      }
    }
  }
  pushQuestion();

  // Preenche a matéria de cada questão com o nome da seção e valida as alternativas
  sections.forEach(section => {
    section.questions.forEach(q => {
      q.subject = q.subject || section.name;
      for (let i = 0; i < 5; i++) if (!q.options[i]) q.options[i] = q.options[i] || '';
      const filled = q.options.filter(o => o.trim()).length;
      if (filled < 2) {
        q.type = 'essay';
        q.options = ['', '', '', '', ''];
      }
    });
  });

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const essayCount = sections.reduce((sum, s) => sum + s.questions.filter(q => q.type === 'essay').length, 0);

  const nonEmptySections = sections.filter(s => s.questions.length > 0);
  if (nonEmptySections.length === 0) {
    warnings.push('Não foi possível identificar questões no arquivo. Verifique se elas estão numeradas (ex: "1)", "Questão 1") e com alternativas "A)" a "E)".');
  } else {
    if (nonEmptySections.length === 1 && !anyExplicitHeading) {
      warnings.push('Não encontrei títulos de seção (matéria) destacados no arquivo, então todas as questões caíram em uma seção só. Para separar automaticamente, deixe o nome da matéria em negrito ou como título antes de cada bloco de questões.');
    }
    if (!anyRedMarked && totalQuestions > 0) {
      warnings.push('Não encontrei alternativas marcadas em vermelho, então o gabarito não foi identificado automaticamente (ficou "A" por padrão) — confira e corrija manualmente.');
    }
    if (essayCount > 0) {
      warnings.push(`${essayCount} questão(ões) ficaram como dissertativa porque não achei ao menos 2 alternativas nela(s) — confira a formatação das alternativas dessas questões.`);
    }
  }

  return { sections: nonEmptySections, warnings };
}

// ---------- Parser estruturado de planilha (Excel/CSV) ----------

function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalizeHeader(h: string): string {
  return stripAccents(String(h || '')).toLowerCase().trim();
}

function parseSpreadsheet(buffer: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const warnings: string[] = [];
  if (rows.length === 0) return { sections: [], warnings: ['Planilha vazia.'] };

  const header = rows[0].map(normalizeHeader);
  const col = (...names: string[]) => header.findIndex(h => names.some(n => h.includes(n)));

  const cSection = col('secao', 'secção', 'materia', 'matéria', 'disciplina');
  const cQuestion = col('pergunta', 'questao', 'enunciado');
  const cOptions = ['a', 'b', 'c', 'd', 'e'].map(letter =>
    header.findIndex(h => h === letter || h.includes(`alternativa ${letter}`) || h.includes(`opcao ${letter}`))
  );
  const cAnswer = col('resposta correta', 'gabarito', 'resposta certa', 'correta');
  const cDifficulty = col('dificuldade');
  const cPoints = col('pontos', 'peso', 'valor');

  if (cQuestion < 0) {
    warnings.push('Não encontrei uma coluna de "Pergunta/Questão" na planilha; nenhuma questão foi importada.');
    return { sections: [], warnings };
  }

  const sectionsMap = new Map<string, ImportedSection>();
  const getSection = (name: string) => {
    const key = name || 'Questões';
    if (!sectionsMap.has(key)) sectionsMap.set(key, { name: key, description: '', questions: [] });
    return sectionsMap.get(key)!;
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const questionText = String(row[cQuestion] || '').trim();
    if (!questionText) continue;

    const options = cOptions.map(ci => (ci >= 0 ? String(row[ci] || '').trim() : ''));
    const filledOptions = options.filter(Boolean).length;
    const answerRaw = cAnswer >= 0 ? String(row[cAnswer] || '').trim().toLowerCase() : '';
    let correctAnswer = LETTER_INDEX[answerRaw.replace(/[^a-e]/g, '').slice(0, 1)] ?? 0;
    if (answerRaw && /^[1-5]$/.test(answerRaw)) correctAnswer = Number(answerRaw) - 1;

    const section = getSection(String(row[cSection] ?? '').trim());
    section.questions.push({
      question: questionText,
      subject: section.name,
      type: filledOptions >= 2 ? 'multiple-choice' : 'essay',
      options: filledOptions >= 2 ? options : ['', '', '', '', ''],
      correctAnswer,
      difficulty: cDifficulty >= 0 && row[cDifficulty] ? String(row[cDifficulty]).trim() : 'Médio',
      points: cPoints >= 0 && Number(row[cPoints]) > 0 ? Number(row[cPoints]) : 1
    });
  }

  const sections = Array.from(sectionsMap.values()).filter(s => s.questions.length > 0);
  if (sections.length === 0) warnings.push('Nenhuma linha válida encontrada na planilha.');
  return { sections, warnings };
}

// ---------- Ponto de entrada ----------

export async function importExamFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.docx')) {
      const lines = await extractLinesFromDocx(file);
      return parseLinesIntoSections(lines);
    }
    if (name.endsWith('.pdf')) {
      const lines = await extractLinesFromPdf(file);
      return parseLinesIntoSections(lines);
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      const buffer = await file.arrayBuffer();
      return parseSpreadsheet(buffer);
    }
    return { sections: [], warnings: ['Formato não suportado. Envie um arquivo .docx, .xlsx, .xls, .csv ou .pdf.'] };
  } catch (error) {
    console.error('Error importing exam file:', error);
    return { sections: [], warnings: ['Não foi possível ler o arquivo. Verifique se ele não está corrompido ou protegido por senha.'] };
  }
}
