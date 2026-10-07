// Importa um simulado pronto a partir de um arquivo Word (.docx), Excel (.xlsx/.xls/.csv),
// PDF ou fotos da prova, organizando automaticamente em seções e questões.
//
// PDF, fotos e Word são lidos com IA (rota /ai/extract-exam): as páginas viram imagens (o Word vira
// texto com marcadores de título/vermelho/imagem) e são enviadas em trechos de poucas páginas,
// em paralelo. Se a IA falhar, PDF e Word caem na leitura heurística abaixo.
//
// Word: o .docx é lido diretamente do XML interno (não só o texto), para capturar formatação
// que o enunciado usa: título com estilo "Título"/heading do Word ou texto em negrito sozinho
// no parágrafo vira nova seção (matéria); alternativa com QUALQUER texto em vermelho vira o
// gabarito da questão (além de "Gabarito: B", "Resposta: B" ou um "*" do jeito tradicional).
// PDF: lê a posição e a cor de cada trecho do content stream (sem IA). Vermelho = gabarito,
// como no Word. Provas em duas colunas são lidas na ordem certa (coluna da esquerda, depois a da direita).
// Alternativas que são imagem no PDF não têm texto: a letra é mantida e a questão é sinalizada para preencher.
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
  /** Parágrafo é item de uma lista numerada/com marcadores do Word (numPr) — comum quando as
   * alternativas A/B/C/D/E não são digitadas como texto, e sim geradas pela lista automática */
  listItem: boolean;
  /** Parágrafo tem imagem (Word): a IA recebe um marcador [IMAGEM] nesse ponto */
  hasImage?: boolean;
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
    let curHasImage = false;
    let isFirstLineOfParagraph = true;

    const flush = () => {
      const text = curText.replace(/\s+/g, ' ').trim();
      if (text || curHasImage) {
        lines.push({
          text,
          // Negrito sozinho no parágrafo NÃO conta como título aqui: o enunciado usa negrito
          // também em instruções ("Leia o texto...") e títulos de texto de apoio, então esse
          // sinal sozinho causava seções demais. Só um estilo de título do Word conta como certeza;
          // o teste de "tudo em maiúsculas" (looksLikeSectionHeading) cuida do resto mais abaixo.
          heading: isFirstLineOfParagraph && isHeadingStyle,
          redMarked: curHasRed,
          listItem: isFirstLineOfParagraph && isListItem,
          hasImage: curHasImage
        });
      }
      isFirstLineOfParagraph = false;
      curText = '';
      curHasRed = false;
      curAllBold = true;
      curHasText = false;
      curHasImage = false;
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
        } else if (name === 'drawing' || name === 'pict' || name === 'object') {
          curHasImage = true;
        }
      });
      void curHasText;
    });
    flush();
  });

  return lines;
}

// Operadores do content stream do PDF (números internos do pdf.js) usados para ler texto e cor
const PDF_OP_SET_TEXT_MATRIX = 42; // posição do texto na página
const PDF_OP_SHOW_TEXT = 44; // trecho de texto (glifos)
const PDF_OP_SET_FILL_RGB = 59; // cor de preenchimento do texto (ex: "#ff0000")
const PDF_OP_SET_FONT = 37; // fonte e tamanho do texto que vem depois

// Vermelho de gabarito: canal R forte e G/B baixos
function isRedHex(hex: string): boolean {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return false;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return r > 150 && r - g > 90 && r - b > 90;
}

// Cabeçalho/rodapé repetido em todas as páginas (título do simulado, série, número da página)
const PDF_NOISE_RE = /^(SIMULADO\b|\d{1,2}º\s*ANO\b|\d{1,3}$|\.$|.*BIMESTRE|.*ANO\s*[–-]\s*A\s*$|[–\-\s]*2026\b.{0,4}$)/i;

// Lê o PDF com a posição e a cor de cada trecho de texto, separando as colunas da página
// (provas costumam ter duas colunas: primeiro a esquerda de cima para baixo, depois a direita).
async function extractLinesFromPdf(file: File): Promise<DocLine[]> {
  const pdfjsLib: any = await import('pdfjs-dist');
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const lines: DocLine[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const ops = await page.getOperatorList();
    const pageWidth = page.view[2] - page.view[0];

    // size: tamanho da fonte; adv: largura estimada do trecho (para saber se há espaço entre trechos)
    type Span = { x: number; y: number; text: string; red: boolean; size: number; adv: number };
    const spans: Span[] = [];
    let fill = '#000000';
    let size = 10;
    let x = 0;
    let y = 0;
    ops.fnArray.forEach((fn: number, idx: number) => {
      const args = ops.argsArray[idx];
      if (fn === PDF_OP_SET_FILL_RGB) {
        fill = String(args?.[0] ?? '#000000').toLowerCase();
      } else if (fn === PDF_OP_SET_FONT) {
        size = Number(args?.[1]) || size;
      } else if (fn === PDF_OP_SET_TEXT_MATRIX) {
        const m = args?.[0];
        x = m?.[4] ?? 0;
        y = m?.[5] ?? 0;
      } else if (fn === PDF_OP_SHOW_TEXT) {
        let text = '';
        let adv = 0;
        for (const g of args?.[0] ?? []) {
          if (g && typeof g === 'object') {
            text += g.isSpace ? ' ' : (g.unicode ?? '');
            adv += (g.width ?? 0) / 1000 * size;
          }
        }
        if (text.trim()) spans.push({ x, y, text, red: isRedHex(fill), size, adv });
      }
    });

    // Duas colunas: a da esquerda vem antes da da direita
    const mid = pageWidth / 2;
    const columns = [spans.filter(s => s.x < mid), spans.filter(s => s.x >= mid)];
    columns.forEach((column) => {
      const byY = new Map<number, Span[]>();
      column.forEach((s) => {
        const key = Math.round(s.y);
        if (!byY.has(key)) byY.set(key, []);
        byY.get(key)!.push(s);
      });
      [...byY.keys()].sort((a, b) => b - a).forEach((key) => {
        const row = byY.get(key)!.sort((a, b) => a.x - b.x);
        // Junta os trechos; insere espaço quando há uma folga entre o fim de um e o início do próximo
        let text = '';
        row.forEach((s, i) => {
          const prev = row[i - 1];
          if (prev && !/\s$/.test(text) && !/^\s/.test(s.text) && s.x - (prev.x + prev.adv) > s.size * 0.15) {
            text += ' ';
          }
          text += s.text;
        });
        text = text.replace(/\s+/g, ' ').trim();
        if (!text || PDF_NOISE_RE.test(text)) return;

        // Gabarito: a alternativa é vermelha se a letra dela ("C)") estiver em vermelho,
        // ou se quase todo o texto da linha estiver em vermelho
        const chars = row.flatMap(s => [...s.text].filter(c => !/\s/.test(c)).map(c => ({ c, red: s.red })));
        const label = chars.slice(0, 2);
        const labelRed = label.length === 2 && /^[a-eA-E]\)$/.test(label.map(l => l.c).join('')) && label.every(l => l.red);
        const visible = chars.length;
        const redChars = chars.filter(c => c.red).length;
        lines.push({
          text,
          heading: false,
          redMarked: labelRed || (visible > 0 && redChars >= visible * 0.6),
          listItem: false
        });
      });
    });
  }
  return lines;
}

// ---------- Parser heurístico de linhas (Word/PDF) ----------

// Exige ":" ou "–" depois da palavra (ex: "Seção: Matemática"), para não pegar "parte do governo." no meio de um texto
const SECTION_RE = /^(?:se(?:c|ç)(?:a|ã)o|parte|m(?:o|ó)dulo)\s*[:\-–]\s*(.+)$/i;
const QUESTION_RE = /^(?:quest(?:a|ã)o\s*)?0*(\d{1,3})\s*[\.\)\-–]\s*(.*)$/i;
// Alternativa "de verdade": letra + pontuação (A), (A), A., A -, A:). É o formato esperado.
const OPTION_RE = /^\(?([a-eA-E])\)?\s*[\.\)\-–:]\s*(\S.*)$/;
// Fallback para quando o Word não coloca pontuação nenhuma depois da letra (ex: só "A" + tab):
// só aceita se a letra for exatamente a próxima esperada em sequência (evita confundir com
// palavras comuns como "A costa..." que também começam com uma letra maiúscula seguida de espaço).
const LOOSE_OPTION_RE = /^([A-E])\s+(\S.*)$/;
// Letra de alternativa sem nenhum texto na mesma linha (o conteúdo está em imagem no arquivo)
const BARE_OPTION_RE = /^\(?([a-eA-E])\)?\s*[.\-–:]?$/;
const ANSWER_RE = /^(?:gabarito|resposta(?:\s+correta)?|correta)\s*[:\-–]?\s*\(?([a-eA-E])\)?/i;

// Tira travessões/pontos decorativos que costumam cercar o título da seção
// (ex: "––––––– LÍNGUA PORTUGUESA –––––" vira "LÍNGUA PORTUGUESA").
function cleanHeadingText(line: string): string {
  return line.replace(/^[\s\-–—_.:·•]+|[\s\-–—_.:·•]+$/g, '').trim();
}

function looksLikeSectionHeading(line: string): boolean {
  if (SECTION_RE.test(line)) return true;
  const trimmed = cleanHeadingText(line);
  // Mínimo de 5 caracteres: evita que uma sigla solta em caixa alta (ex: "LCD.") vire seção
  if (trimmed.length < 5 || trimmed.length > 45) return false;
  // Título de seção não tem parênteses: "(CNBB)." no meio de uma alternativa não é cabeçalho
  if (/[()]/.test(trimmed)) return false;
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
  // Questões com letras de alternativa mas sem texto nelas (conteúdo em imagem): ficam objetivas
  const bareOptionQuestions = new Set<ImportedQuestion>();
  const questionNumbers = new Map<ImportedQuestion, number>();

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

    let questionMatch = QUESTION_RE.exec(line);
    // Dentro de uma seção já numerada, um número igual ou menor que o último é quebra de linha
    // do enunciado (ex: "...pontos P(2," + "4) e Q(10, 12)?"), não uma nova questão
    if (questionMatch && currentQuestion && anyExplicitHeading && parseInt(questionMatch[1], 10) <= lastQuestionNumber) {
      questionMatch = null;
    }
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
    const bareMatch = !optionMatch && !questionMatch ? BARE_OPTION_RE.exec(line) : null;

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
      questionNumbers.set(currentQuestion, number);
      continue;
    }

    if (bareMatch && currentQuestion) {
      const idx = LETTER_INDEX[bareMatch[1].toLowerCase()];
      currentQuestion.options[idx] = currentQuestion.options[idx] ?? '';
      if (redMarked) {
        currentQuestion.correctAnswer = idx;
        anyRedMarked = true;
      }
      bareOptionQuestions.add(currentQuestion);
      lastOptionIndex = idx;
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
      // Alternativas em imagem continuam objetivas (para preencher); só vira dissertativa sem letras
      if (filled < 2 && !bareOptionQuestions.has(q)) {
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
    const bareNumbers = sections
      .flatMap(s => s.questions)
      .filter(q => bareOptionQuestions.has(q) && q.options.every(o => !o.trim()))
      .map(q => questionNumbers.get(q))
      .filter((n): n is number => n !== undefined);
    if (bareNumbers.length > 0) {
      warnings.push(`Questão(ões) ${bareNumbers.join(', ')}: as alternativas estão como imagem no arquivo e não têm texto para ler. Preencha o texto delas manualmente.`);
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

// ---------- Leitura com IA (PDF, fotos e Word) ----------

interface AIQuestion {
  section: string;
  number: number;
  continuesPrevious: boolean;
  statement: string;
  type: 'multiple-choice' | 'essay';
  options: string[];
  correctLetter: '' | 'A' | 'B' | 'C' | 'D' | 'E';
  hasFigure: boolean;
}

interface AIPart {
  questions: AIQuestion[];
  answerKey: { section: string; number: number; letter: string }[];
}

type ProgressFn = (done: number, total: number) => void;
type AIPartInput = { images: string[] } | { text: string };

const PAGES_PER_REQUEST = 2;
const PARALLEL_REQUESTS = 3;
const MAX_IMAGE_SIDE = 2000;
const IMAGE_EXT_RE = /\.(jpe?g|png|webp|gif|bmp)$/i;

const isImageFile = (f: File) => IMAGE_EXT_RE.test(f.name) || f.type.startsWith('image/');

// Foto do celular: respeita a rotação (EXIF) e reduz para no máximo MAX_IMAGE_SIDE px
async function imageFileToJpeg(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

// Cada página do PDF vira uma imagem (funciona também com PDF escaneado, que não tem texto)
async function pdfToJpegPages(file: File): Promise<string[]> {
  const pdfjsLib: any = await import('pdfjs-dist');
  const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(3, MAX_IMAGE_SIDE / Math.max(base.width, base.height)) });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvas, canvasContext: ctx, viewport, background: '#ffffff' }).promise;
    pages.push(canvas.toDataURL('image/jpeg', 0.85));
    page.cleanup();
  }
  return pages;
}

// Word vira texto com marcadores que a IA entende (título, vermelho = gabarito, lista, imagem)
function docLinesToText(lines: DocLine[]): string {
  return lines.map(l => [
    l.heading ? '[TITULO] ' : '',
    l.listItem ? '[LISTA] ' : '',
    l.redMarked ? '[VERMELHO] ' : '',
    l.text,
    l.hasImage ? ' [IMAGEM]' : ''
  ].join('').trim()).filter(Boolean).join('\n');
}

// Divide o texto do Word em trechos de ~8000 caracteres, cortando sempre antes de uma questão
function splitTextIntoParts(text: string, maxChars = 8000): string[] {
  const parts: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of text.split('\n')) {
    const plain = line.replace(/^(\[[A-Z]+\]\s*)+/, '');
    if (size > maxChars && QUESTION_RE.test(plain)) {
      parts.push(current.join('\n'));
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.length) parts.push(current.join('\n'));
  return parts;
}

// Roda as tarefas com no máximo `limit` ao mesmo tempo, mantendo a ordem dos resultados
async function runLimited<T>(tasks: (() => Promise<T>)[], limit: number, onDone: () => void): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
      onDone();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function extractPartsWithAI(parts: AIPartInput[], onProgress?: ProgressFn): Promise<AIPart[]> {
  const { apiService } = await import('./api');
  let done = 0;
  onProgress?.(0, parts.length);
  return runLimited(parts.map((part, i) => async () => {
    const res: any = await apiService.extractExamAI({ ...part, partIndex: i + 1, partTotal: parts.length });
    if (!res?.success) throw new Error(res?.error || 'Falha ao ler a prova com IA');
    return { questions: res.questions || [], answerKey: res.answerKey || [] } as AIPart;
  }), PARALLEL_REQUESTS, () => onProgress?.(++done, parts.length));
}

// Junta os trechos lidos pela IA em seções, na ordem da prova
function mergeAIParts(parts: AIPart[]): ImportResult {
  type Meta = { q: ImportedQuestion; section: string; number: number; answered: boolean; figure: boolean };
  const sections: ImportedSection[] = [];
  const warnings: string[] = [];
  const metas: Meta[] = [];
  let current: ImportedSection | null = null;
  const sameName = (a: string, b: string) => stripAccents(a).toLowerCase().trim() === stripAccents(b).toLowerCase().trim();
  const letterIndex = (l: string): number | undefined => LETTER_INDEX[(l || '').toLowerCase()];

  for (const part of parts) {
    part.questions.forEach((aq, i) => {
      const options = (aq.options || []).slice(0, 5).map(o => String(o || '').trim());
      const answer = letterIndex(aq.correctLetter);
      const last = metas[metas.length - 1];

      // Questão que começou no trecho anterior: completa a última questão
      if (aq.continuesPrevious && i === 0 && last) {
        const statement = (aq.statement || '').trim();
        if (statement) last.q.question = `${last.q.question} ${statement}`.trim();
        options.forEach((o, idx) => {
          if (o) last.q.options[idx] = last.q.options[idx]?.trim() ? `${last.q.options[idx]} ${o}` : o;
        });
        if (answer !== undefined) {
          last.q.correctAnswer = answer;
          last.answered = true;
        }
        last.figure = last.figure || !!aq.hasFigure;
        return;
      }

      const question = (aq.statement || '').trim();
      if (!question) return;

      const sectionName = (aq.section || '').trim() || current?.name || 'Questões';
      if (!current || !sameName(current.name, sectionName)) {
        current = sections.find(s => sameName(s.name, sectionName)) || null;
        if (!current) {
          current = { name: sectionName, description: '', questions: [] };
          sections.push(current);
        }
      }

      const q: ImportedQuestion = {
        question,
        subject: current.name,
        type: 'multiple-choice',
        options,
        correctAnswer: answer ?? 0,
        difficulty: 'Médio',
        points: 1
      };
      current.questions.push(q);
      metas.push({ q, section: current.name, number: aq.number, answered: answer !== undefined, figure: !!aq.hasFigure });
    });
  }

  // Gabarito em tabela/lista (normalmente no fim da prova)
  parts.flatMap(p => p.answerKey).forEach(key => {
    const idx = letterIndex(key.letter);
    if (idx === undefined) return;
    const candidates = metas.filter(m => m.number === key.number && (!key.section || sameName(m.section, key.section)));
    const target = candidates.find(m => !m.answered) || candidates[0];
    if (target) {
      target.q.correctAnswer = idx;
      target.answered = true;
    }
  });

  // Objetiva só com pelo menos 2 alternativas
  metas.forEach(m => {
    for (let i = 0; i < 5; i++) m.q.options[i] = m.q.options[i] || '';
    if (m.q.options.filter(o => o.trim()).length < 2) {
      m.q.type = 'essay';
      m.q.options = ['', '', '', '', ''];
    }
  });

  const label = (list: Meta[]) => list.map(m => (sections.length > 1 ? `${m.section} ${m.number}` : String(m.number))).join(', ');
  if (metas.length === 0) {
    warnings.push('Não encontrei questões no arquivo. Confira se as páginas estão legíveis (foto nítida, sem cortar a folha) e tente de novo.');
  } else {
    const noAnswer = metas.filter(m => m.q.type === 'multiple-choice' && !m.answered);
    if (noAnswer.length > 0) {
      warnings.push(`A prova não indica o gabarito de ${noAnswer.length} questão(ões) (${label(noAnswer)}): ficou "A" — marque a resposta certa.`);
    }
    const figures = metas.filter(m => m.figure);
    if (figures.length > 0) {
      warnings.push(`Questão(ões) ${label(figures)} têm imagem/figura: confira o texto e anexe a imagem se precisar.`);
    }
  }

  return { sections: sections.filter(s => s.questions.length > 0), warnings };
}

async function importWithAI(files: File[], onProgress?: ProgressFn): Promise<ImportResult> {
  let parts: AIPartInput[];
  if (files[0].name.toLowerCase().endsWith('.docx')) {
    const text = docLinesToText(await extractLinesFromDocx(files[0]));
    parts = splitTextIntoParts(text).map(t => ({ text: t }));
  } else {
    // PDF e/ou fotos: todas as páginas como imagem, na ordem em que foram escolhidas
    const pages: string[] = [];
    for (const f of files) {
      if (f.name.toLowerCase().endsWith('.pdf')) pages.push(...await pdfToJpegPages(f));
      else pages.push(await imageFileToJpeg(f));
    }
    parts = [];
    for (let i = 0; i < pages.length; i += PAGES_PER_REQUEST) parts.push({ images: pages.slice(i, i + PAGES_PER_REQUEST) });
  }
  return mergeAIParts(await extractPartsWithAI(parts, onProgress));
}

// ---------- Ponto de entrada ----------

export async function importExamFile(input: File | File[], onProgress?: ProgressFn): Promise<ImportResult> {
  const files = Array.isArray(input) ? input : [input];
  if (files.length === 0) return { sections: [], warnings: [] };
  const file = files[0];
  const name = file.name.toLowerCase();

  if (files.some(f => /\.(heic|heif)$/i.test(f.name))) {
    return { sections: [], warnings: ['Fotos HEIC (iPhone) não são aceitas. No iPhone, use Ajustes > Câmera > Formatos > "Mais Compatível", ou envie a foto como JPG.'] };
  }

  const onlyImages = files.every(isImageFile);
  const pdfOrImages = files.every(f => f.name.toLowerCase().endsWith('.pdf') || isImageFile(f));

  if (name.endsWith('.docx') || pdfOrImages) {
    try {
      const result = await importWithAI(name.endsWith('.docx') ? [file] : files, onProgress);
      if (result.sections.length > 0 || onlyImages) return result;
    } catch (error) {
      console.error('Error importing exam with AI:', error);
      const reason = (error as Error)?.message || 'erro desconhecido';
      if (onlyImages) return { sections: [], warnings: [`Não foi possível ler as fotos: ${reason}`] };
      // Sem IA: tenta a leitura heurística do PDF/Word
      const fallback = await importExamFileHeuristic(file);
      fallback.warnings.unshift(`A leitura com IA falhou (${reason}); usei a leitura automática simples, que erra mais. Revise com atenção.`);
      return fallback;
    }
  }
  return importExamFileHeuristic(file);
}

async function importExamFileHeuristic(file: File): Promise<ImportResult> {
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
    return { sections: [], warnings: ['Formato não suportado. Envie .docx, .pdf, fotos (.jpg/.png), .xlsx, .xls ou .csv.'] };
  } catch (error) {
    console.error('Error importing exam file:', error);
    return { sections: [], warnings: ['Não foi possível ler o arquivo. Verifique se ele não está corrompido ou protegido por senha.'] };
  }
}
