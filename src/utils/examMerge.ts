// Completa um simulado que já existe com as questões de um arquivo importado: acha no simulado a
// questão equivalente a cada questão do arquivo e adiciona SÓ as que não estão lá, na posição certa
// (logo depois da questão anterior do arquivo). Nada do que já existe é alterado ou reordenado.
import { normalizeText } from './series';

export interface MergeQuestion {
  id: string;
  question: string;
  options: string[];
  points: number;
  /** Número que a questão tem na prova importada */
  printedNumber?: number;
}

export interface MergeSection<Q extends MergeQuestion> {
  id: string;
  name: string;
  description: string;
  questions: Q[];
}

export interface MergeResult<Q extends MergeQuestion, S extends MergeSection<Q>> {
  sections: S[];
  /** Questões que entraram, com a seção onde foram colocadas */
  added: { section: string; question: Q }[];
  /** Questões do arquivo que já existiam no simulado */
  matched: number;
  /** Questões do simulado que não foram achadas no arquivo (continuam onde estão) */
  notInFile: number;
  /** Alternativas em que sobrava o texto de uma questão vizinha que foi adicionada (leitura antiga) */
  cleaned: { section: string; position: number; option: number }[];
  /** Matérias em que quase nada do arquivo bateu com o simulado (provável outra versão da prova): nada foi adicionado nelas */
  skipped: { section: string; matched: number; inFile: number; inExam: number }[];
}

// Duas questões são a mesma quando a maior parte das palavras (enunciado + alternativas) coincide.
// Tolera pequenas diferenças de transcrição (acentos, símbolos, pontuação, espaços).
const SIMILARITY_THRESHOLD = 0.5;

const words = (text: string) =>
  new Set(normalizeText(text).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 1));

// Números que aparecem na questão ("20,00", "7,50", "2500"), sem separadores. Versões diferentes da mesma
// prova (A e B) têm quase o mesmo texto e mudam justamente os números.
const numbers = (text: string) =>
  new Set((text.match(/\d+(?:[.,]\d+)*/g) || []).map(n => n.replace(/[.,]/g, '')));

interface Signature { words: Set<string>; numbers: Set<string> }

const signature = (q: MergeQuestion): Signature => {
  const text = `${q.question.slice(0, 600)} ${q.options.join(' ')}`;
  return { words: words(text), numbers: numbers(text) };
};

// Quando as palavras da questão do arquivo estão (quase) todas na questão do simulado, ela é a mesma com
// texto a mais (ex: o enunciado da questão seguinte que ficou grudado numa alternativa na leitura antiga)
const CONTAINED_THRESHOLD = 0.85;

// Os números das duas questões batem? (sem números, ou com poucos, não há o que comparar). Compara em
// relação ao lado que tem menos números, então texto cortado ou com sobra não atrapalha; mas as versões A e B
// de uma prova, que trocam os valores, ficam abaixo do limite.
function sameNumbers(file: Set<string>, existing: Set<string>): boolean {
  if (file.size < 2 || existing.size < 2) return true;
  let shared = 0;
  file.forEach(n => { if (existing.has(n)) shared++; });
  return shared / Math.min(file.size, existing.size) >= 0.65;
}

// 0 = não parecem a mesma questão; perto de 1 = a mesma
function similarity(file: Signature, existing: Signature): number {
  if (!sameNumbers(file.numbers, existing.numbers)) return 0;
  const fileWords = file.words;
  const existingWords = existing.words;
  if (fileWords.size === 0 && existingWords.size === 0) return 1;
  let shared = 0;
  fileWords.forEach(w => { if (existingWords.has(w)) shared++; });
  const jaccard = shared / (fileWords.size + existingWords.size - shared);
  if (jaccard >= SIMILARITY_THRESHOLD) return jaccard;
  const contained = fileWords.size > 0 ? shared / fileWords.size : 0;
  return fileWords.size >= 8 && contained >= CONTAINED_THRESHOLD ? contained * 0.9 : 0;
}

// Para conferências externas: quão parecidas são duas questões (0 = diferentes, perto de 1 = a mesma)
export function questionSimilarity(a: MergeQuestion, b: MergeQuestion): number {
  return similarity(signature(a), signature(b));
}

const sameSectionName = (a: string, b: string) =>
  normalizeText(a).replace(/[^a-z0-9]+/g, ' ').trim() === normalizeText(b).replace(/[^a-z0-9]+/g, ' ').trim();

// Leituras antigas do arquivo às vezes "engoliam" uma questão: o enunciado dela ficava grudado no fim da
// última alternativa da questão anterior. Quando essa questão é adicionada agora, tira o texto que sobrou.
function stripSwallowedStatement<Q extends MergeQuestion>(q: Q, statement: string): { question: Q; option: number } | null {
  const snippet = statement.trim().slice(0, 30);
  if (snippet.length < 20) return null;
  for (let i = 0; i < q.options.length; i++) {
    const at = (q.options[i] || '').indexOf(snippet);
    if (at <= 0) continue;
    // também tira o número da questão ("18.") que veio junto com o texto
    const cleaned = q.options[i].slice(0, at).replace(/\s*\d{1,3}\s*[.)]?\s*$/, '').trimEnd();
    return { question: { ...q, options: q.options.map((o, j) => (j === i ? cleaned : o)) }, option: i };
  }
  return null;
}

// Valor de ponto que todas as questões da seção têm em comum (ex: 0,5 em Português), ou null
function commonPoints(questions: MergeQuestion[]): number | null {
  if (questions.length === 0) return null;
  const first = Number(questions[0].points);
  return questions.every(q => Number(q.points) === first) ? first : null;
}

export function mergeMissingQuestions<Q extends MergeQuestion, S extends MergeSection<Q>>(
  existing: S[],
  imported: S[]
): MergeResult<Q, S> {
  const sections: S[] = existing.map(s => ({ ...s, questions: [...s.questions] }));
  const added: { section: string; question: Q }[] = [];
  let matched = 0;
  let notInFile = 0;
  const cleaned: { section: string; position: number; option: number }[] = [];
  const skipped: { section: string; matched: number; inFile: number; inExam: number }[] = [];

  for (const fileSection of imported) {
    const target = sections.find(s => sameSectionName(s.name, fileSection.name));

    // Matéria que o simulado ainda não tem: entra inteira
    if (!target) {
      sections.push({ ...fileSection, questions: [...fileSection.questions] });
      fileSection.questions.forEach(question => added.push({ section: fileSection.name, question }));
      continue;
    }

    // Pareia, uma para uma, cada questão do arquivo com a questão do simulado mais parecida
    const fileSignatures = fileSection.questions.map(signature);
    const pairs: { f: number; e: number; score: number }[] = [];
    target.questions.forEach((existingQuestion, e) => {
      const existingSignature = signature(existingQuestion);
      fileSignatures.forEach((fileSignature, f) => {
        const score = similarity(fileSignature, existingSignature);
        if (score > 0) pairs.push({ f, e, score });
      });
    });
    pairs.sort((a, b) => b.score - a.score);
    const matchOfFile = new Map<number, string>(); // índice no arquivo -> id da questão do simulado
    const usedExisting = new Set<number>();
    for (const pair of pairs) {
      if (matchOfFile.has(pair.f) || usedExisting.has(pair.e)) continue;
      matchOfFile.set(pair.f, target.questions[pair.e].id);
      usedExisting.add(pair.e);
    }

    // Poucas questões bateram numa matéria que já tem várias: o arquivo provavelmente é de outra versão da
    // prova (ex: a B). Não adiciona nada nela, para não misturar as duas provas
    if (target.questions.length >= 3 && matchOfFile.size < Math.ceil(fileSection.questions.length / 2)) {
      skipped.push({ section: target.name, matched: matchOfFile.size, inFile: fileSection.questions.length, inExam: target.questions.length });
      continue;
    }
    notInFile += target.questions.length - usedExisting.size;

    // Percorre o arquivo na ordem: questão que já existe vira o ponto de referência; questão que
    // falta entra logo depois dele (ou no começo, se nenhuma anterior foi achada)
    const points = commonPoints(target.questions);
    let cursor = -1;
    fileSection.questions.forEach((fileQuestion, f) => {
      const existingId = matchOfFile.get(f);
      if (existingId !== undefined) {
        matched++;
        const at = target.questions.findIndex(q => q.id === existingId);
        if (target.questions[at].printedNumber === undefined && fileQuestion.printedNumber !== undefined) {
          target.questions[at] = { ...target.questions[at], printedNumber: fileQuestion.printedNumber };
        }
        cursor = at;
      } else {
        // Se o texto desta questão ficou grudado na anterior (leitura antiga), limpa a anterior
        const previous = cursor >= 0 ? stripSwallowedStatement(target.questions[cursor], fileQuestion.question) : null;
        if (previous) {
          target.questions[cursor] = previous.question;
          cleaned.push({ section: target.name, position: cursor + 1, option: previous.option });
        }
        // Mantém o valor em pontos que as demais questões da seção já têm
        const question = points !== null ? { ...fileQuestion, points } : fileQuestion;
        target.questions.splice(cursor + 1, 0, question);
        cursor++;
        added.push({ section: target.name, question });
      }
    });
  }

  return { sections, added, matched, notInFile, cleaned, skipped };
}
