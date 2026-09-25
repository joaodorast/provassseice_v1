import { createClient } from 'npm:@supabase/supabase-js'

// Leitor óptico de cartão-resposta. Recebe UM trecho (faixa) da imagem do cartão e devolve, para cada
// linha de questão totalmente visível, o nível de preenchimento (0-3) de cada bolha no formato "NN:ddddd".
// A decisão de qual alternativa foi marcada (e o que precisa de revisão humana) é feita no cliente,
// combinando várias faixas e leituras independentes.

const CLAUDE_MODEL = 'claude-sonnet-5';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getClaudeApiKey = async (): Promise<string | undefined> => {
  const { data } = await supabase
    .from('kv_store_83358821')
    .select('value')
    .eq('key', 'config:claude-api-key')
    .maybeSingle();
  return data?.value?.claudeApiKey || Deno.env.get('ANTHROPIC_API_KEY');
};

const buildPrompt = (optionsPerQuestion: number) => {
  const letters = 'ABCDE'.slice(0, optionsPerQuestion).split('').join(', ');
  return `Você é um leitor óptico de cartão-resposta. A imagem é um TRECHO de um cartão de múltipla escolha; cada questão tem ${optionsPerQuestion} bolhas em ordem (${letters}).
Para CADA linha de questão COMPLETAMENTE visível (número impresso + todas as bolhas), escreva uma string no formato "NN:d...d" com o número impresso da questão, dois-pontos e ${optionsPerQuestion} dígitos (um por bolha, na ordem), onde cada dígito é o nível de preenchimento daquela bolha:
0 = vazia (só contorno e letra)
1 = marca leve/incerta (rabisco fraco, sombra, borracha, mancha, lápis muito claro)
2 = preenchida parcialmente ou com traço claro
3 = totalmente preenchida/escura ou com X evidente.
Descreva só o que vê, bolha por bolha, sem usar gabarito nem supor a resposta. Linha cortada na borda da imagem: IGNORE. Ignore textos que não são linhas de questão.
Exemplo para 5 bolhas com a 2ª pintada: "07:03000". Responda pela tool return_result.`;
};

const callClaude = async (apiKey: string, imageData: string, optionsPerQuestion: number) => {
  const match = imageData.match(/^data:([\w.+-]+\/[\w.+-]+);base64,(.*)$/s);
  const mediaType = match?.[1] || 'image/jpeg';
  const base64 = match ? match[2] : imageData;

  const body = JSON.stringify({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: buildPrompt(optionsPerQuestion) },
        ],
      },
    ],
    tools: [
      {
        name: 'return_result',
        description: 'Retorna as linhas lidas do cartão-resposta.',
        input_schema: {
          type: 'object',
          properties: { rows: { type: 'array', items: { type: 'string' } } },
          required: ['rows'],
        },
      },
    ],
    tool_choice: { type: 'tool', name: 'return_result' },
  });

  const maxAttempts = 6;
  let lastMessage = 'Falha ao consultar a IA';

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body,
    });

    if (response.ok) {
      const result = await response.json();
      const toolUse = result.content?.find((block: any) => block.type === 'tool_use');
      const rows = toolUse?.input?.rows;
      if (!Array.isArray(rows)) throw new Error('Resposta da IA sem linhas de leitura');
      return rows.filter((r: unknown) => typeof r === 'string');
    }

    const errorText = await response.text();
    console.error(`Claude API error (${response.status}), tentativa ${attempt}/${maxAttempts}:`, errorText);
    try {
      lastMessage = JSON.parse(errorText)?.error?.message || lastMessage;
    } catch {
      // resposta não era JSON
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error('Chave da API da Claude inválida ou sem permissão.');
    }

    if ([429, 503, 529].includes(response.status) && attempt < maxAttempts) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : attempt * 2500);
      continue;
    }

    if (response.status === 429) {
      throw new Error('Limite de requisições da API da Claude atingido. Aguarde alguns instantes e tente novamente.');
    }
    throw new Error(String(lastMessage).slice(0, 200));
  }

  throw new Error(String(lastMessage).slice(0, 200));
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const accessToken = req.headers.get('Authorization')?.split(' ')[1];
    if (!accessToken) return json({ error: 'No authorization token provided' }, 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user?.id) return json({ error: 'Invalid authorization token' }, 401);

    const body = await req.json();
    const { imageData } = body;
    const optionsPerQuestion = Math.min(5, Math.max(2, Number(body.optionsPerQuestion) || 5));

    if (!imageData || typeof imageData !== 'string') {
      return json({ error: 'imageData is required' }, 400);
    }

    const apiKey = await getClaudeApiKey();
    if (!apiKey) return json({ error: 'Claude API key not configured' }, 500);

    const rows = await callClaude(apiKey, imageData, optionsPerQuestion);
    return json({ success: true, rows });
  } catch (error) {
    console.error('omr-reader error:', error);
    return json({ error: (error as Error).message || 'Erro desconhecido' }, 500);
  }
});
