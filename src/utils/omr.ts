import { apiService } from './api';

// Leitura de cartão-resposta por IA com foco em NÃO errar em silêncio.
// Feita para o cartão-resposta gerado pelo próprio sistema (Gerenciar Simulados > QR Code):
// 2 colunas de questões, número à esquerda, 5 bolhas (A-E) com a letra à DIREITA de cada bolha.
//  - a imagem é recortada em blocos pequenos (faixa x coluna) e ampliada: a IA erra ao ler linhas pequenas/muitas de uma vez;
//  - para cada bolha a IA escreve LETRA + nível de preenchimento (0-3); letras fora de ordem invalidam a linha;
//  - a decisão da alternativa é tomada aqui, e o cartão pode ser lido mais de uma vez com cortes diferentes;
//  - qualquer linha que não seja "exatamente uma bolha claramente marcada e confirmada" (em branco, dupla marcação,
//    marca leve, leituras divergentes, linha não lida) é SINALIZADA para revisão humana.

export const OMR_BUBBLES = 5;

export interface OmrResult {
  answers: number[]; // índice da alternativa marcada (0=A...), -1 = sem resposta válida
  flags: Record<number, string>; // número da questão (1-based) -> motivo da revisão
}

interface RowReading {
  answer: number;
  reason: string | null;
}

const ROW_RE = /^\s*(\d{1,3})\s*:\s*((?:[A-E][0-3]){5})\s*$/;
const MAX_SIDE = 2600;
const BAND_OVERLAP = 0.15;
const COLUMN_COUNT = 2;
const COLUMN_OVERLAP = 0.04;
const TILE_UPSCALE = 1.5;
const TILE_MAX_SIDE = 1500;
const CALL_CONCURRENCY = 3;
const ADAPTIVE_FLAG_RATIO = 0.1;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem do cartão'));
    img.src = src;
  });

const renderScaled = (img: HTMLImageElement, maxSide: number): HTMLCanvasElement => {
  let { width, height } = img;
  const longest = Math.max(width, height);
  if (longest > maxSide) {
    const ratio = maxSide / longest;
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
};

// Remove as margens vazias do cartão (deixa as linhas maiores nos blocos).
const trimToContent = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
  const probeScale = Math.min(1, 700 / Math.max(canvas.width, canvas.height));
  const pw = Math.max(1, Math.round(canvas.width * probeScale));
  const ph = Math.max(1, Math.round(canvas.height * probeScale));
  const probe = document.createElement('canvas');
  probe.width = pw;
  probe.height = ph;
  const pctx = probe.getContext('2d');
  if (!pctx) return canvas;
  pctx.drawImage(canvas, 0, 0, pw, ph);
  const { data } = pctx.getImageData(0, 0, pw, ph);

  let minX = pw, minY = ph, maxX = -1, maxY = -1;
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 150) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return canvas;

  const pad = Math.round(Math.max(canvas.width, canvas.height) * 0.02);
  const x0 = Math.max(0, Math.floor(minX / probeScale) - pad);
  const y0 = Math.max(0, Math.floor(minY / probeScale) - pad);
  const x1 = Math.min(canvas.width, Math.ceil((maxX + 1) / probeScale) + pad);
  const y1 = Math.min(canvas.height, Math.ceil((maxY + 1) / probeScale) + pad);

  // Se o "conteúdo" cobre quase tudo (foto com fundo escuro/sombra), não vale recortar.
  if ((x1 - x0) * (y1 - y0) > canvas.width * canvas.height * 0.92) return canvas;

  const out = document.createElement('canvas');
  out.width = x1 - x0;
  out.height = y1 - y0;
  const octx = out.getContext('2d');
  if (!octx) return canvas;
  octx.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
  return out;
};

// Divide o cartão em blocos (faixas horizontais x colunas) com sobreposição e amplia cada bloco,
// para as bolhas ficarem grandes o bastante para a IA distinguir bolha preenchida de vazia.
const splitIntoTiles = (canvas: HTMLCanvasElement, bandCount: number): string[] => {
  const { width, height } = canvas;
  const step = height / bandCount;
  const bandOverlap = step * BAND_OVERLAP;
  const tiles: string[] = [];

  for (let b = 0; b < bandCount; b++) {
    const y0 = Math.max(0, Math.floor(b * step - bandOverlap));
    const y1 = Math.min(height, Math.ceil((b + 1) * step + bandOverlap));

    for (let c = 0; c < COLUMN_COUNT; c++) {
      const x0 = Math.max(0, Math.floor((c * width) / COLUMN_COUNT - COLUMN_OVERLAP * width));
      const x1 = Math.min(width, Math.ceil(((c + 1) * width) / COLUMN_COUNT + COLUMN_OVERLAP * width));
      const tw = x1 - x0;
      const th = y1 - y0;
      const scale = Math.min(TILE_UPSCALE, TILE_MAX_SIDE / Math.max(tw, th));

      const tile = document.createElement('canvas');
      tile.width = Math.max(1, Math.round(tw * scale));
      tile.height = Math.max(1, Math.round(th * scale));
      const tctx = tile.getContext('2d');
      if (!tctx) throw new Error('Canvas indisponível');
      tctx.imageSmoothingQuality = 'high';
      tctx.drawImage(canvas, x0, y0, tw, th, 0, 0, tile.width, tile.height);
      tiles.push(tile.toDataURL('image/jpeg', 0.95));
    }
  }

  return tiles;
};

const mapPool = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;

  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

// Decide a alternativa marcada a partir dos níveis de preenchimento. Só é "limpa" (sem revisão)
// quando há exatamente UMA bolha bem marcada e nenhuma outra suspeita.
export const deriveAnswer = (levels: number[]): RowReading => {
  const strong = levels.map((l, i) => (l >= 2 ? i : -1)).filter((i) => i >= 0);
  const faint = levels.filter((l) => l === 1).length;

  if (strong.length === 1 && faint === 0) return { answer: strong[0], reason: null };
  if (strong.length === 1) return { answer: strong[0], reason: 'marca leve extra' };
  if (strong.length >= 2) return { answer: -1, reason: 'dupla marcação' };
  if (faint > 0) return { answer: -1, reason: 'marca leve/incerta' };
  return { answer: -1, reason: 'em branco' };
};

interface PassReading {
  reading: Map<number, RowReading>;
  conflicts: Set<number>;
}

export const parseRows = (rowsPerTile: string[][], totalQuestions: number): PassReading => {
  const reading = new Map<number, RowReading>();
  const conflicts = new Set<number>();

  rowsPerTile.forEach((rows) => {
    rows.forEach((raw) => {
      const match = ROW_RE.exec(raw);
      if (!match) return;

      const question = parseInt(match[1], 10);
      const pairs = [...match[2].matchAll(/([A-E])([0-3])/g)];
      // As letras precisam vir na ordem A-E; se a IA embaralhou, a linha não é confiável e é descartada
      // (a questão acaba sinalizada como "linha não lida").
      if (pairs.map((p) => p[1]).join('') !== 'ABCDE') return;
      if (question < 1 || question > totalQuestions) return;

      const derived = deriveAnswer(pairs.map((p) => parseInt(p[2], 10)));
      const existing = reading.get(question);

      if (!existing) {
        reading.set(question, derived);
      } else if (existing.answer !== derived.answer) {
        conflicts.add(question);
      } else if (!existing.reason && derived.reason) {
        reading.set(question, derived);
      }
    });
  });

  return { reading, conflicts };
};

export const mergePasses = (passes: PassReading[], totalQuestions: number): OmrResult => {
  const answers: number[] = [];
  const flags: Record<number, string> = {};

  for (let q = 1; q <= totalQuestions; q++) {
    const reads = passes.map((p) => p.reading.get(q)).filter((r): r is RowReading => !!r);
    const hasConflict = passes.some((p) => p.conflicts.has(q));

    if (reads.length === 0) {
      answers.push(-1);
      flags[q] = 'linha não lida';
      continue;
    }

    const distinctAnswers = new Set(reads.map((r) => r.answer));
    if (hasConflict || distinctAnswers.size > 1) {
      answers.push(-1);
      flags[q] = 'leituras divergentes';
      continue;
    }

    answers.push(reads[0].answer);
    const reason = reads.find((r) => r.reason)?.reason;
    if (reason) flags[q] = reason;
    else if (reads.length < passes.length) flags[q] = 'lida apenas uma vez';
  }

  return { answers, flags };
};

export const bandCountFor = (totalQuestions: number) => Math.max(2, Math.round(totalQuestions / 20) + 1);

export async function readAnswerSheet(
  dataUrl: string,
  options: {
    totalQuestions: number;
    passes?: number;
    onProgress?: (fraction: number) => void;
  }
): Promise<OmrResult> {
  const { totalQuestions, passes = 1, onProgress } = options;

  const img = await loadImage(dataUrl);
  const content = trimToContent(renderScaled(img, MAX_SIDE));

  const baseBands = bandCountFor(totalQuestions);
  const totalCalls = Array.from({ length: passes }, (_, p) => (baseBands + p) * COLUMN_COUNT).reduce((a, b) => a + b, 0);
  let completed = 0;
  onProgress?.(0);

  const passReadings: PassReading[] = [];

  const runPass = async (p: number) => {
    // Cada leitura usa uma quantidade diferente de faixas, para que os cortes caiam em lugares
    // diferentes e um erro de corte não se repita na leitura seguinte.
    const tiles = splitIntoTiles(content, baseBands + p);

    const rowsPerTile = await mapPool(tiles, CALL_CONCURRENCY, async (tile) => {
      const rows = await apiService.readBubblesAI(tile);
      completed++;
      onProgress?.(Math.min(0.99, completed / totalCalls));
      return rows;
    });

    passReadings.push(parseRows(rowsPerTile, totalQuestions));
  };

  for (let p = 0; p < passes; p++) {
    await runPass(p);
  }

  // Imagem ruim (muitas linhas duvidosas): faz automaticamente mais uma leitura e compara com a anterior.
  // Só acrescenta comparação/sinalização, nunca remove aviso; só é usada quando a imagem já é ruim.
  const firstMerge = mergePasses(passReadings, totalQuestions);
  if (Object.keys(firstMerge.flags).length >= totalQuestions * ADAPTIVE_FLAG_RATIO && passes < 2) {
    await runPass(passes);
  }

  onProgress?.(1);
  return mergePasses(passReadings, totalQuestions);
}
