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
}

// Duas questões são a mesma quando a maior parte das palavras (enunciado + alternativas) coincide.
// Tolera pequenas diferenças de transcrição (acentos, símbolos, pontuação, espaços).
const SIMILARITY_THRESHOLD = 0.5;

const words = (text: string) =>
  new Set(normalizeText(text).replace(/[^a-z0-9]+/g, ' ').split(' ').filter(w => w.length > 1));

const signature = (q: MergeQuestion) => words(`${q.question.slice(0, 600)} ${q.options.join(' ')}`);

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let shared = 0;
  a.forEach(w => { if (b.has(w)) shared++; });
  return shared / (a.size + b.size - shared);
}

const sameSectionName = (a: string, b: string) =>
  normalizeText(a).replace(/[^a-z0-9]+/g, ' ').trim() === normalizeText(b).replace(/[^a-z0-9]+/g, ' ').trim();

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
        const score = jaccard(fileSignature, existingSignature);
        if (score >= SIMILARITY_THRESHOLD) pairs.push({ f, e, score });
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
        // Mantém o valor em pontos que as demais questões da seção já têm
        const question = points !== null ? { ...fileQuestion, points } : fileQuestion;
        target.questions.splice(cursor + 1, 0, question);
        cursor++;
        added.push({ section: target.name, question });
      }
    });
  }

  return { sections, added, matched, notInFile };
}
