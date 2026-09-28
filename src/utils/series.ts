// Classificação dos cursos (séries) por etapa de ensino.
// Os cursos são salvos como uma lista de nomes; a etapa é deduzida do nome,
// então cursos antigos como "3º Ano" ou "1º Ano EM" já caem no grupo certo.

export type StageKey = 'fund1' | 'fund2' | 'emVestibular' | 'emTecnico' | 'outros';

export const STAGE_LABELS: Record<StageKey, string> = {
  fund1: 'Ensino Fundamental I',
  fund2: 'Ensino Fundamental II',
  emVestibular: 'EM Vestibular',
  emTecnico: 'EM Técnico',
  outros: 'Outros'
};

export const normalizeText = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[°ª]/g, 'º').toLowerCase().replace(/\s+/g, ' ').trim();

const TECH_KEYWORDS = /tecnico|informatica|administracao|\badm\b|enfermagem/;

// Descobre a etapa e, para o técnico, o nome do curso
export function classifySeries(name: string): { stage: StageKey; techCourse?: string } {
  const n = normalizeText(name);

  if (TECH_KEYWORDS.test(n)) {
    const match = name.match(/t[ée]cnico\s+(?:em\s+)?(.+)$/i);
    let course = match ? match[1].trim() : '';
    if (!course) {
      if (/informatica/.test(n)) course = 'Informática';
      else if (/administracao|\badm\b/.test(n)) course = 'Administração';
      else if (/enfermagem/.test(n)) course = 'Enfermagem';
      else course = 'Outros';
    }
    return { stage: 'emTecnico', techCourse: course };
  }

  if (/\bem\b|medio|vestibular|\bserie\b/.test(n)) return { stage: 'emVestibular' };
  if (/\bpre\b|infantil|maternal|jardim/.test(n)) return { stage: 'fund1' };

  const num = parseInt(n.match(/\d+/)?.[0] || '', 10);
  if (num >= 1 && num <= 5) return { stage: 'fund1' };
  if (num >= 6 && num <= 9) return { stage: 'fund2' };
  return { stage: 'outros' };
}

// Ordem natural: Pré I, Pré II, 1º, 2º...
export function seriesOrder(name: string) {
  const n = normalizeText(name);
  if (/\bpre\b/.test(n)) return /\bii\b|\b2\b/.test(n) ? -1 : -2;
  const num = parseInt(n.match(/\d+/)?.[0] || '', 10);
  return isNaN(num) ? 99 : num;
}

export const sortSeries = (list: string[]) =>
  [...list].sort((a, b) => seriesOrder(a) - seriesOrder(b) || a.localeCompare(b, 'pt-BR'));

// Acha o curso cadastrado equivalente a um texto ("9° Ano" == "9º Ano")
export function findRegisteredSeries(text: string, registered: string[]): string | undefined {
  const n = normalizeText(text);
  return registered.find(s => normalizeText(s) === n);
}

// Parece um nome de curso? ("9º Ano", "Pré II", "1º Ano EM"...)
export function looksLikeSeriesName(text: string, registered: string[]): boolean {
  if (findRegisteredSeries(text, registered)) return true;
  const n = normalizeText(text);
  return /^\d+ ?º? ?ano\b/.test(n) || /^pre\b/.test(n);
}

// Parece um código de turma? ("9001", "9001 - CE", "301A")
export function looksLikeClassCode(text: string): boolean {
  return /^\d{3,4}\b/.test(normalizeText(text));
}

// Deduz o curso pelo código da turma: 9001 -> 9º Ano (só se existir esse curso)
export function inferSeriesFromClassCode(code: string, registered: string[]): string | undefined {
  const m = normalizeText(code).match(/^(\d)\d{2,3}\b/);
  if (!m) return undefined;
  return findRegisteredSeries(`${m[1]}º Ano`, registered);
}
