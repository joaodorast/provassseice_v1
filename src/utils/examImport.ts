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
import { projectId } from './supabase/info';

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
  /** Parágrafo é item de uma lista numerada/com marcadores do Word (numPr) — comum quando as
   * alternativas A/B/C/D/E não são digitadas como texto, e sim geradas pela lista automática */
  listItem: boolean;
  /** Caminhos (dentro do .docx) das imagens que estão neste parágrafo. Viram texto antes do parser. */
  images?: string[];
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

const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

// Texto de uma equação do Word (OMML). Lê os textos <m:t> na ordem do documento e
// marca raízes (<m:rad>) com "√". Frações e outras estruturas saem como texto corrido.
function mathToText(math: Element): string {
  let out = '';
  Array.from(math.getElementsByTagName('*')).forEach((el) => {
    const name = localName(el);
    if (name === 'rad') out += '√';
    else if (name === 't') out += el.textContent || '';
  });
  return out.replace(/\s+/g, ' ').trim();
}

async function extractLinesFromDocx(file: File): Promise<{ lines: DocLine[]; readImage: (path: string) => Promise<Blob | null> }> {
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(file);
  const readImage = async (path: string) => (await zip.file(path)?.async('blob')) ?? null;
  const xmlText = await zip.file('word/document.xml')?.async('text');
  if (!xmlText) return { lines: [], readImage };

  // Relações do documento: rId -> caminho da mídia dentro do .docx (ex: word/media/image1.png)
  const relTargets = new Map<string, string>();
  const relsXml = await zip.file('word/_rels/document.xml.rels')?.async('text');
  if (relsXml) {
    const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
    Array.from(relsDoc.getElementsByTagName('Relationship')).forEach((rel) => {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      if (id && target) relTargets.set(id, target.startsWith('/') ? target.slice(1) : `word/${target}`);
    });
  }

  const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('w:p')).length > 0
    ? Array.from(xmlDoc.getElementsByTagName('w:p'))
    : Array.from(xmlDoc.getElementsByTagName('p'));

  const lines: DocLine[] = [];

  paragraphs.forEach((p) => {
    const linesBefore = lines.length;
    // Imagens do parágrafo: <a:blip r:embed> (desenho moderno) ou <v:imagedata r:id> (VML antigo)
    const imagePaths: string[] = [];
    Array.from(p.getElementsByTagName('*')).forEach((el) => {
      const name = localName(el);
      if (name !== 'blip' && name !== 'imagedata') return;
      const rId = el.getAttributeNS(REL_NS, 'embed') || el.getAttributeNS(REL_NS, 'id') || el.getAttribute('r:embed') || el.getAttribute('r:id');
      const path = rId ? relTargets.get(rId) : undefined;
      if (path) imagePaths.push(path);
    });

    const pPr = firstChildNamed(p, 'pPr');
    const pStyleEl = pPr ? firstChildNamed(pPr, 'pStyle') : undefined;
    const styleVal = pStyleEl?.getAttribute('w:val') || pStyleEl?.getAttribute('val') || '';
    const isHeadingStyle = /^(heading|t[ií]tulo)/i.test(styleVal);
    // Parágrafo com numeração/marcador automático do Word (a lista "a) b) c)..." às vezes é só
    // essa numeração automática, sem nenhuma letra digitada no texto)
    const isListItem = !!(pPr && firstChildNamed(pPr, 'numPr'));

    // Junta runs (e runs dentro de hyperlinks) na ordem em que aparecem no parágrafo
    const runs: Element[] = [];
    Array.from(p.children).forEach(c => {
      const name = localName(c);
      if (name === 'r') runs.push(c);
      else if (name === 'oMath') runs.push(c); // equação do Word (ex: √56 m) — não é um w:r
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
          // Negrito sozinho no parágrafo NÃO conta como título aqui: o enunciado usa negrito
          // também em instruções ("Leia o texto...") e títulos de texto de apoio, então esse
          // sinal sozinho causava seções demais. Só um estilo de título do Word conta como certeza;
          // o teste de "tudo em maiúsculas" (looksLikeSectionHeading) cuida do resto mais abaixo.
          heading: isFirstLineOfParagraph && isHeadingStyle,
          redMarked: curHasRed,
          listItem: isFirstLineOfParagraph && isListItem
        });
      }
      isFirstLineOfParagraph = false;
      curText = '';
      curHasRed = false;
      curAllBold = true;
      curHasText = false;
    };

    runs.forEach((r) => {
      if (localName(r) === 'oMath') {
        const math = mathToText(r);
        if (math) {
          curHasText = true;
          curAllBold = false;
          curText += math;
        }
        return;
      }
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

    if (imagePaths.length > 0) {
      if (lines.length > linesBefore) {
        // Imagem no fim da linha de texto (ex: "1) " + figura do enunciado): acompanha essa linha
        lines[lines.length - 1].images = imagePaths;
      } else {
        // Parágrafo só com imagem (questão ou alternativa inteira colada como figura)
        lines.push({ text: '', heading: false, redMarked: false, listItem: false, images: imagePaths });
      }
    }
  });

  return { lines, readImage };
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
    redMarked: false,
    listItem: false
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

// Tira travessões/pontos decorativos que costumam cercar o título da seção
// (ex: "––––––– LÍNGUA PORTUGUESA –––––" vira "LÍNGUA PORTUGUESA").
function cleanHeadingText(line: string): string {
  return line.replace(/^[\s\-–—_.:·•]+|[\s\-–—_.:·•]+$/g, '').trim();
}

function looksLikeSectionHeading(line: string): boolean {
  if (SECTION_RE.test(line)) return true;
  const trimmed = cleanHeadingText(line);
  if (trimmed.length < 3 || trimmed.length > 45) return false;
  if (QUESTION_RE.test(trimmed) || OPTION_RE.test(trimmed)) return false;
  const letters = trimmed.replace(/[^A-Za-zÀ-ÿ]/g, '');
  // Exige pelo menos 3 letras (evita falso positivo em siglas/numerações curtas tipo "I.", "OK")
  if (letters.length < 3) return false;
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

  for (const { text: line, heading, redMarked, listItem } of lines) {
    const explicitHeading = heading || SECTION_RE.test(line) || looksLikeSectionHeading(line);

    if (explicitHeading && !QUESTION_RE.test(line) && !OPTION_RE.test(line) && !ANSWER_RE.test(line)) {
      anyExplicitHeading = true;
      const name = SECTION_RE.exec(line)?.[1] || cleanHeadingText(line);
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
    // Alternativa sem NENHUMA letra digitada (a numeração "a) b) c)..." é gerada automaticamente
    // pela lista do Word, então só existe no texto o conteúdo da alternativa em si).
    const isImplicitListOption = !optionMatch && !questionMatch && listItem && !!currentQuestion && lastOptionIndex < 4;

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

    if ((optionMatch || isImplicitListOption) && currentQuestion) {
      const idx = optionMatch ? LETTER_INDEX[optionMatch[1].toLowerCase()] : lastOptionIndex + 1;
      let text = optionMatch ? (optionMatch[2] || '') : line;
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

// ---------- Imagens do Word -> texto (Claude Vision, via servidor) ----------

const MAX_IMAGE_SIDE = 1600;
const TRANSCRIBE_BATCH = 8;
const TRANSCRIBE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-83358821/ai/transcribe-images`;

// Reduz a imagem (lado maior até MAX_IMAGE_SIDE) e converte para JPEG com fundo branco.
// Imagens que o navegador não consegue decodificar (EMF/WMF, por exemplo) devolvem null.
async function blobToScaledDataUrl(blob: Blob): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return null;
  }
}

// Troca cada imagem das linhas pelo texto transcrito e refaz as linhas (uma por quebra de linha).
// Retorna as linhas prontas para o parser, mais avisos caso alguma imagem não pôde ser lida.
async function resolveImageLines(
  lines: DocLine[],
  readImage: (path: string) => Promise<Blob | null>
): Promise<{ lines: DocLine[]; warnings: string[] }> {
  const warnings: string[] = [];
  if (!lines.some(l => l.images?.length)) return { lines, warnings };

  // Carrega e reduz cada imagem uma vez, mesmo que apareça em vários lugares
  const scaled = new Map<string, string | null>();
  for (const line of lines) {
    for (const path of line.images ?? []) {
      if (scaled.has(path)) continue;
      const blob = await readImage(path);
      scaled.set(path, blob ? await blobToScaledDataUrl(blob) : null);
    }
  }

  // Ocorrências legíveis, na ordem do documento
  const jobs: { lineIndex: number; imageIndex: number; dataUrl: string }[] = [];
  let unreadable = 0;
  lines.forEach((line, lineIndex) => {
    (line.images ?? []).forEach((path, imageIndex) => {
      const dataUrl = scaled.get(path);
      if (dataUrl) jobs.push({ lineIndex, imageIndex, dataUrl });
      else unreadable++;
    });
  });
  if (unreadable > 0) {
    warnings.push(`${unreadable} imagem(ns) do arquivo não puderam ser lidas (formato não suportado pelo navegador). Essas partes ficaram de fora.`);
  }

  const token = localStorage.getItem('access_token');
  const transcribed = new Map<string, { text: string; red: boolean }>();
  if (jobs.length > 0 && !token) {
    warnings.push('Não consegui ler as imagens do arquivo porque a sessão expirou. Entre de novo e importe.');
  } else {
    for (let start = 0; start < jobs.length && token; start += TRANSCRIBE_BATCH) {
      const batch = jobs.slice(start, start + TRANSCRIBE_BATCH);
      try {
        const response = await fetch(TRANSCRIBE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ images: batch.map(j => j.dataUrl) }),
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data?.results)) {
          throw new Error(data?.error || `HTTP ${response.status}`);
        }
        batch.forEach((job, i) => transcribed.set(`${job.lineIndex}:${job.imageIndex}`, {
          text: String(data.results[i]?.text ?? ''),
          red: data.results[i]?.red === true,
        }));
      } catch (error) {
        console.error('Error transcribing Word images:', error);
        warnings.push('Não consegui transcrever algumas imagens do arquivo (erro na leitura por IA). Revise as questões que dependem delas.');
        break;
      }
    }
  }

  // Letra de alternativa que ficou como texto ("A)") seguida do conteúdo que está na imagem:
  // as duas partes precisam ficar na mesma linha para o parser reconhecer a alternativa.
  const LABEL_ONLY = /^\(?[a-eA-E]\)?\s*[.\-–:]?$/;

  const rebuilt: DocLine[] = [];
  lines.forEach((line, lineIndex) => {
    const pieces: { text: string; red: boolean }[] = [];
    const parts = [{ text: line.text, red: false }];
    (line.images ?? []).forEach((_, imageIndex) => {
      const t = transcribed.get(`${lineIndex}:${imageIndex}`);
      parts.push({ text: t?.text ?? '', red: t?.red ?? false });
    });
    parts.forEach((part) => {
      part.text.split('\n').map(s => s.trim()).filter(Boolean).forEach((seg) => {
        const prev = pieces[pieces.length - 1];
        if (prev && LABEL_ONLY.test(prev.text)) {
          prev.text = `${prev.text} ${seg}`;
          prev.red = prev.red || part.red;
        } else {
          pieces.push({ text: seg, red: part.red });
        }
      });
    });
    // Parágrafo só com imagem logo depois de uma linha só com a letra ("A)"): junta as duas
    const last = rebuilt[rebuilt.length - 1];
    if (!line.text && last && LABEL_ONLY.test(last.text) && pieces.length > 0) {
      const first = pieces.shift()!;
      last.text = `${last.text} ${first.text}`;
      last.redMarked = last.redMarked || first.red;
    }
    pieces.forEach((piece, i) => {
      rebuilt.push({
        text: piece.text,
        heading: i === 0 && line.heading,
        redMarked: line.redMarked || piece.red,
        listItem: i === 0 && line.listItem,
      });
    });
  });

  return { lines: rebuilt, warnings };
}

// ---------- Ponto de entrada ----------

export async function importExamFile(file: File): Promise<ImportResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.docx')) {
      const { lines, readImage } = await extractLinesFromDocx(file);
      const resolved = await resolveImageLines(lines, readImage);
      const parsed = parseLinesIntoSections(resolved.lines);
      return { sections: parsed.sections, warnings: [...resolved.warnings, ...parsed.warnings] };
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
