import jsQR from 'jsqr';

// Identifica de quem é um cartão-resposta a partir do QR Code impresso nele pelo próprio sistema
// (Gerenciar Simulados > QR Code). O QR guarda um link com ?exam=<id da prova>&student=<id do aluno>.
// Leitura 100% local no navegador: exata, gratuita e sem usar IA.

export interface CardIdentity {
  studentId: string;
  examId: string | null;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível abrir a imagem'));
    img.src = src;
  });

const decodeCanvas = (canvas: HTMLCanvasElement): string | null => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  return jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null;
};

// Desenha uma região da imagem (em frações 0-1) num canvas com a largura desejada
// (ampliar a região do QR ajuda a ler fotos pequenas ou borradas).
type Enhance = 'none' | 'stretch' | number; // número = binarização com esse limiar de luminância

const regionCanvas = (
  img: HTMLImageElement,
  region: { x: number; y: number; w: number; h: number },
  targetWidth: number,
  enhance: Enhance = 'none'
): HTMLCanvasElement => {
  const sx = region.x * img.width;
  const sy = region.y * img.height;
  const sw = region.w * img.width;
  const sh = region.h * img.height;
  const scale = targetWidth / sw;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  if (enhance !== 'none') {
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const px = image.data;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const v = enhance === 'stretch'
        ? (lum < 120 ? 0 : lum > 170 ? 255 : ((lum - 120) / 50) * 255)
        : (lum < enhance ? 0 : 255);
      px[i] = px[i + 1] = px[i + 2] = v;
    }
    ctx.putImageData(image, 0, 0);
  }

  return canvas;
};

const parseQrText = (text: string): CardIdentity | null => {
  let studentId: string | null = null;
  let examId: string | null = null;

  try {
    const url = new URL(text);
    studentId = url.searchParams.get('student');
    examId = url.searchParams.get('exam');
  } catch {
    studentId = /student=([^&\s]+)/.exec(text)?.[1] ?? null;
    examId = /exam=([^&\s]+)/.exec(text)?.[1] ?? null;
  }

  return studentId ? { studentId: decodeURIComponent(studentId), examId: examId ? decodeURIComponent(examId) : null } : null;
};

export async function readCardIdentity(dataUrl: string): Promise<CardIdentity | null> {
  if (!dataUrl?.startsWith('data:image/')) return null;

  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return null;
  }

  // O QR fica no canto superior direito do cartão do sistema; tenta a folha inteira e depois a região
  // do QR ampliada (com e sem reforço de contraste), do mais barato ao mais trabalhoso.
  const attempts: Array<() => HTMLCanvasElement> = [
    () => regionCanvas(img, { x: 0, y: 0, w: 1, h: 1 }, Math.min(img.width, 1800)),
    () => regionCanvas(img, { x: 0.6, y: 0, w: 0.4, h: 0.3 }, 1000),
  ];

  // Foto ruim: amplia a região do QR em várias escalas e binariza com vários limiares
  const zoomRegions = [
    { x: 0.6, y: 0, w: 0.4, h: 0.3 },
    { x: 0.5, y: 0, w: 0.5, h: 0.4 },
  ];
  for (const region of zoomRegions) {
    for (const width of [900, 1400, 2000]) {
      for (const enhance of ['stretch', 130, 150, 170, 110] as Enhance[]) {
        attempts.push(() => regionCanvas(img, region, width, enhance));
      }
    }
  }

  for (const attempt of attempts) {
    const text = decodeCanvas(attempt());
    const identity = text ? parseQrText(text) : null;
    if (identity) return identity;
  }

  return null;
}
