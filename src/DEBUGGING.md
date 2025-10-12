# 🔍 Guia de Debugging - Sistema SEICE

## Como Debugar Quando os Testes Falham

### 1️⃣ Abrir o Console do Navegador

**Teclas de Atalho:**
- **Windows/Linux:** F12 ou Ctrl + Shift + I
- **Mac:** Cmd + Option + I

**O que você verá:**
```
🧪 INICIANDO TESTES DO SISTEMA SEICE
══════════════════════════════════════════════════
▶ Teste 1: Conectividade Backend
✓ PASSOU - 234ms
──────────────────────────────────────────────────
▶ Teste 2: Criar Questão de Teste
✗ FALHOU - 1523ms
Erro: Falha ao criar questão: Timeout
```

---

## 2️⃣ Entendendo as Mensagens de Erro

### ❌ "Backend não está respondendo"

**Causa:** Servidor Supabase offline ou lento

**Solução:**
1. Verifique sua internet
2. Aguarde 30 segundos
3. Tente novamente
4. Se persistir, o servidor pode estar fora do ar

**Como testar manualmente:**
```javascript
// Cole no console:
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/health')
  .then(r => r.json())
  .then(console.log)
```

---

### ❌ "Falha ao criar questão: Timeout"

**Causa:** Requisição demorou mais de 10 segundos

**Solução:**
1. Verifique sua conexão
2. O servidor pode estar sobrecarregado
3. Tente criar questão manualmente primeiro
4. Se funcionar manualmente, é problema temporário

---

### ❌ "Não há questões suficientes"

**Causa:** Banco de questões vazio ou com poucas questões

**Solução:**
1. Vá em **Banco de Questões**
2. Clique **"+ Nova Questão"**
3. Crie pelo menos **5 questões**
4. Execute os testes novamente

**Criação rápida via Console:**
```javascript
// Cole no console para criar 5 questões de teste:
for(let i = 1; i <= 5; i++) {
  fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/questions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      question: `Questão teste ${i}: Quanto é ${i} + ${i}?`,
      subject: 'Matemática',
      difficulty: 'Fácil',
      options: [`${i}`, `${i+1}`, `${i*2}`, `${i*3}`],
      correctAnswer: 2,
      explanation: 'Teste automático',
      weight: 1.0
    })
  }).then(r => r.json()).then(console.log)
}
```

---

### ❌ "Falha ao criar aluno: Error 401"

**Causa:** Token de autenticação inválido ou expirado

**Solução:**
1. Faça **logout**
2. Faça **login** novamente
3. Execute os testes

**Verificar token no Console:**
```javascript
console.log('Token:', localStorage.getItem('access_token'));
// Se retornar null, você não está logado
```

---

### ❌ "Falha ao fazer upload de imagem"

**Causa:** Bucket do Supabase não configurado

**Solução:**
1. Este teste pode falhar se o Storage não estiver configurado
2. Não é crítico para funcionamento do sistema
3. Upload manual ainda funciona

---

## 3️⃣ Testes Individuais no Console

### Testar Conectividade

**Teste 1: Health Check (Sem Auth)**
```javascript
// Este teste NÃO precisa de autenticação
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/health')
.then(r => {
  console.log('Status:', r.status, r.statusText);
  return r.json();
})
.then(data => {
  console.log('Resposta:', data);
  if (data.success || data.status === 'ok') {
    console.log('%c✓ BACKEND ONLINE!', 'color: green; font-weight: bold;');
  } else {
    console.error('✗ Backend retornou status inválido');
  }
})
.catch(err => {
  console.error('%c✗ ERRO DE CONEXÃO:', 'color: red; font-weight: bold;', err);
  console.error('Possíveis causas:');
  console.error('1. Internet offline');
  console.error('2. Servidor Supabase offline');
  console.error('3. URL incorreta');
  console.error('4. CORS bloqueado');
})
```

**Teste 2: Health Check (Com Auth)**
```javascript
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/health', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
})
.then(r => r.json())
.then(console.log)
```

### Testar Listar Questões
```javascript
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/questions', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
})
.then(r => r.json())
.then(data => console.log('Questões:', data.questions?.length || 0))
```

### Testar Criar Aluno
```javascript
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/students', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    students: [{
      name: 'Teste Console',
      email: 'teste@escola.com',
      registration: 'TEST001',
      grade: '1° ANO',
      class: 'A'
    }]
  })
})
.then(r => r.json())
.then(console.log)
```

---

## 4️⃣ Verificar Estado do Sistema

### Checar se está logado
```javascript
console.log('Logado:', !!localStorage.getItem('access_token'));
```

### Ver estatísticas do dashboard
```javascript
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/dashboard/stats', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
})
.then(r => r.json())
.then(console.log)
```

### Contar questões no banco
```javascript
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/questions', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
})
.then(r => r.json())
.then(data => console.log(`${data.questions?.length || 0} questões no banco`))
```

---

## 5️⃣ Limpar Dados de Teste

### Listar testes criados
```javascript
// Questões de teste
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/questions', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
})
.then(r => r.json())
.then(data => {
  const testQuestions = data.questions?.filter(q => q.question.includes('[TESTE]'));
  console.log('Questões de teste:', testQuestions?.length);
  console.log(testQuestions);
})
```

### Deletar questão específica
```javascript
const questionId = 'COLE_O_ID_AQUI';
fetch(`https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/questions/${questionId}`, {
  method: 'DELETE',
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
})
.then(r => r.json())
.then(console.log)
```

---

## 6️⃣ Erros Comuns e Soluções

### 🔴 ERRO #1: "Backend não está respondendo" (Teste #1 Falha)

**Sintomas:**
```
✗ Teste 1: Conectividade Backend - FALHOU
Erro: Backend não retornou resposta
```

**Diagnóstico Passo a Passo:**

1. **Abra o Console (F12)**
2. **Execute o comando de teste:**
   ```javascript
   fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/health')
     .then(r => r.json())
     .then(d => console.log('✓ Backend OK:', d))
     .catch(e => console.error('✗ Erro:', e.message))
   ```

3. **Interprete o resultado:**

   | Resultado | O que significa | Solução |
   |-----------|----------------|---------|
   | `✓ Backend OK: {status: "ok"}` | Servidor funcionando! | Execute os testes novamente |
   | `✗ Erro: Failed to fetch` | Sem internet ou servidor offline | Verifique sua internet |
   | `✗ Erro: NetworkError` | CORS ou firewall | Verifique configurações de rede |
   | `✗ Erro: timeout` | Servidor muito lento | Aguarde 1 minuto e tente |
   | `404 Not Found` | URL incorreta | Verifique o projectId |

4. **Soluções por Tipo de Erro:**

   **A) Failed to fetch**
   ```
   Causas:
   - Internet offline
   - Servidor Supabase em manutenção
   - Firewall bloqueando
   
   Solução:
   1. Teste sua internet: ping google.com
   2. Acesse: https://hedpsjqpzgmeturonoka.supabase.co
   3. Se não abrir, servidor está offline
   ```

   **B) CORS Error**
   ```
   Causas:
   - Servidor não está enviando headers CORS
   - Navegador bloqueando
   
   Solução:
   1. Verifique o servidor index.tsx
   2. Confirme que tem: app.use('*', cors({...}))
   3. Tente em modo anônimo do navegador
   ```

   **C) Timeout**
   ```
   Causas:
   - Servidor iniciando (cold start)
   - Internet muito lenta
   
   Solução:
   1. Aguarde 30-60 segundos
   2. Execute os testes novamente
   3. Cold start pode demorar até 2 minutos
   ```

5. **Teste Manual na Interface:**
   - Vá para Testes do Sistema
   - Procure o card roxo "🔗 Informações de Conexão"
   - Clique em **"Testar Conexão Direta"**
   - Veja o resultado no toast

---

### 🔴 ERRO #2: "Nenhum simulado criado no teste anterior" (Teste #7 Falha)

**Sintomas:**
```
✗ Teste 7: Duplicar Simulado - FALHOU
Erro: Nenhum simulado criado no teste anterior para duplicar
```

**Causa:**
- Race condition entre React state e execução sequencial de testes
- O Teste #6 salva `examId` com `setTestData()` (assíncrono)
- O Teste #7 executa imediatamente e `testData.examId` ainda é `undefined`

**Solução Implementada:**
- ✅ Criadas variáveis locais compartilhadas entre testes
- ✅ `createdExamId` é atualizado sincronamente
- ✅ Teste #7 usa `createdExamId` em vez de `testData.examId`

**Por que funcionou:**
```typescript
// ANTES - Race condition
const result = await apiService.createExam(exam);
setTestData(prev => ({ ...prev, examId: result.exam.id })); // Assíncrono!
// Próximo teste executa antes do state atualizar

// DEPOIS - Síncrono
const result = await apiService.createExam(exam);
createdExamId = result.exam.id; // Imediato!
// Próximo teste tem acesso ao ID
```

**Documentação:** Ver [FIXES_DUPLICATE_TEST.md](FIXES_DUPLICATE_TEST.md)

---

### 🔴 ERRO #3: "Failed to create serie" - Erro 500 (Teste #5 Falha)

**Sintomas:**
```
✗ Teste 5: Criar Série/Turma - FALHOU
API Error: /series - Failed to create serie
Erro: Falha ao criar série: Failed to create serie
```

**Causa:**
- Bug no servidor: código tentava acessar `item.value.code` mas deveria ser `item.code`
- `getByPrefix` retorna array de valores diretamente, não `{key, value}` objects
- TypeError ao verificar código duplicado → catch genérico → erro 500

**Solução Implementada:**
- ✅ Corrigido acesso de `item.value.code` para `item.code`
- ✅ Validação de código duplicado agora funciona corretamente
- ✅ Séries podem ser criadas sem erro

**Código Corrigido:**
```typescript
// ANTES - Bug
const codeExists = existingSeries.some(item => 
  item.value.code.toLowerCase() === body.code.toLowerCase()
);

// DEPOIS - Corrigido
const codeExists = existingSeries.some(item => 
  item.code.toLowerCase() === body.code.toLowerCase()
);
```

**Documentação:** Ver [FIXES_SERIES_CREATE.md](FIXES_SERIES_CREATE.md)

---

### 🔴 ERRO #4: "Falha ao gerar estatísticas: Erro desconhecido" (Teste #9 Falha)

**Sintomas:**
```
✗ Teste 9: Gerar Relatório - FALHOU
Erro: Falha ao gerar estatísticas: Erro desconhecido
```

**Causa:**
- Método `getDashboardStats()` não existia na API
- Resposta do servidor sem `success: true`
- Formato inconsistente: `{ stats }` em vez de `{ success: true, stats }`

**Solução Implementada:**
- ✅ Adicionado método `getDashboardStats()` na API
- ✅ Servidor agora retorna `{ success: true, stats }`
- ✅ Formato padronizado como outras rotas

**Código Corrigido:**
```typescript
// API (utils/api.ts)
async getDashboardStats() {
  return this.request('/dashboard/stats');
}

// Servidor (server/index.tsx)
return c.json({ success: true, stats }); // Antes: { stats }
```

**Documentação:** Ver [FIXES_DASHBOARD_STATS.md](FIXES_DASHBOARD_STATS.md)

---

### 🔴 ERRO #5: "Nome e código são obrigatórios" (Teste #5 Falha)

**Sintomas:**
```
✗ Teste 5: Criar Série/Turma - FALHOU
Erro: Falha ao criar série: Nome e código são obrigatórios
```

**Causa:**
- O endpoint `/series` requer os campos `name` E `code`
- Se enviar apenas `name`, retorna erro 400

**Solução:**
```javascript
// ✗ ERRADO - falta o código
const serie = {
  name: 'Série Teste',
  description: 'Descrição'
};

// ✓ CORRETO - inclui código
const serie = {
  name: 'Série Teste',
  code: 'TEST-001', // OBRIGATÓRIO!
  description: 'Descrição'
};
```

**Resposta da API:**
```javascript
// A API retorna:
{
  success: true,
  data: {
    id: '...',
    name: '...',
    code: '...',
    ...
  }
}

// Então use:
const serieId = result.data.id; // ✓ CORRETO
// NÃO: result.serie.id ✗ ERRADO
```

---

### Tabela de Erros Gerais

| Erro | Causa | Solução |
|------|-------|---------|
| `Nome e código são obrigatórios` | Falta campo `code` | Adicione o campo `code` |
| `Failed to fetch` | Sem internet | Verifique conexão |
| `401 Unauthorized` | Não logado | Faça login |
| `404 Not Found` | Rota incorreta | Recarregue a página |
| `500 Internal Server Error` | Erro no servidor | Aguarde e tente novamente |
| `Timeout` | Servidor lento | Aguarde 30s e tente |
| `CORS Error` | Configuração CORS | Problema no backend |

---

## 7️⃣ Logs Úteis

### Habilitar logs detalhados
```javascript
// No console, antes de executar testes:
localStorage.setItem('debug', 'true');
```

### Desabilitar logs
```javascript
localStorage.removeItem('debug');
```

### Ver todos os logs de API
Já está habilitado por padrão! Veja no console:
```
API Request starting: /questions
API Response received: /questions - Status: 200
API Success: /questions
```

---

## 8️⃣ Reportar Bug

Se encontrou um bug que não consegue resolver:

### Informações necessárias:

1. **Qual teste falhou:**
   ```
   Teste #2: Criar Questão de Teste
   ```

2. **Mensagem de erro:**
   ```
   ✗ Falhou: Falha ao criar questão: Timeout
   ```

3. **Logs do console:**
   ```
   (Copie e cole os logs em vermelho)
   ```

4. **Passos para reproduzir:**
   ```
   1. Fiz login
   2. Cliquei em Testes do Sistema
   3. Cliquei em "Executar Todos os Testes"
   4. Teste #2 falhou
   ```

5. **Ambiente:**
   ```
   - Navegador: Chrome 118
   - SO: Windows 11
   - Data/Hora: 2025-10-04 14:30
   ```

---

## 9️⃣ Dicas Avançadas

### Executar testes um por um
Use o console:
```javascript
// Teste 1 - Backend
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/health')
  .then(r => r.json())
  .then(d => console.log('✓ Backend OK:', d))
  .catch(e => console.error('✗ Backend falhou:', e))
```

### Medir tempo de resposta
```javascript
console.time('Backend');
fetch('https://hedpsjqpzgmeturonoka.supabase.co/functions/v1/make-server-83358821/health', {
  headers: { 'Authorization': 'Bearer ' + localStorage.getItem('access_token') }
})
  .then(r => r.json())
  .then(d => {
    console.timeEnd('Backend');
    console.log(d);
  })
```

### Ver network requests
1. Abra DevTools (F12)
2. Aba **Network**
3. Execute os testes
4. Veja todas as requisições
5. Clique em uma para ver detalhes

---

## 🆘 Ajuda Adicional

**Documentação:**
- [README.md](README.md) - Guia completo
- [TESTING.md](TESTING.md) - Guia de testes
- [FAQ.md](FAQ.md) - Perguntas frequentes

**Suporte:**
- Abra o console (F12)
- Execute os comandos de debug acima
- Reporte com todos os detalhes

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0.0
