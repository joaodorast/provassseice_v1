import { supabase } from './supabase-client';
import { publicAnonKey } from './supabase/info';

// Chamadas à API do servidor (Edge Function) carregam o token guardado no localStorage.
// Se esse token estiver vencido ou desatualizado, o servidor responde 401 "Invalid authorization token"
// e as telas não carregam. Esta camada, instalada uma vez no início do app, renova a sessão
// do Supabase quando isso acontece e repete a chamada uma única vez com o token novo.

const API_MARK = '/functions/v1/make-server-83358821';

let renewing: Promise<string | null> | null = null;

async function renewAccessToken(): Promise<string | null> {
  // Várias chamadas podem falhar ao mesmo tempo; todas aguardam a mesma renovação
  if (!renewing) {
    renewing = (async () => {
      const { data, error } = await supabase.auth.refreshSession();
      const token = data.session?.access_token ?? null;
      if (error || !token) return null;
      localStorage.setItem('access_token', token);
      return token;
    })().finally(() => {
      renewing = null;
    });
  }
  return renewing;
}

// Algumas telas chamam a API com a chave pública (anon) no lugar do token do usuário.
// Como turmas e cursos são de cada login, a chamada precisa levar o token do usuário logado.
function withUserToken(init?: RequestInit): RequestInit | undefined {
  const headers = new Headers(init?.headers);
  if (headers.get('Authorization') !== `Bearer ${publicAnonKey}`) return init;
  const token = localStorage.getItem('access_token');
  if (!token) return init;
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

export function installAuthRetry() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
    if (url.includes(API_MARK)) init = withUserToken(init);

    const response = await originalFetch(input, init);

    // Só tenta de novo chamadas à API com corpo simples (string/URL); um Request já consumido não pode ser reenviado
    if (!url.includes(API_MARK) || response.status !== 401) return response;

    const token = await renewAccessToken();
    if (!token) return response;

    const headers = new Headers(init?.headers);
    headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(input, { ...init, headers });
  };
}
