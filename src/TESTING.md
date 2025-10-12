# 🧪 Guia de Testes - Sistema SEICE

## Testes Automatizados

### Como Executar

1. **Acesse o Sistema**
   - Faça login no sistema
   
2. **Vá para Testes**
   - Menu lateral → Configuração → **🧪 Testes do Sistema**

3. **Execute os Testes**
   - Clique em **"Executar Todos os Testes"**
   - Aguarde os resultados (15-30 segundos)

4. **Verifique os Resultados**
   - ✅ Verde = Teste passou
   - ❌ Vermelho = Teste falhou
   - 🔵 Azul = Teste em execução

---

## Testes Disponíveis

### 1. ✅ Conectividade Backend
**O que testa:** Conexão com servidor Supabase  
**Tempo:** ~500ms  
**Deve passar se:** Backend está respondendo

### 2. ✅ Criar Questão de Teste
**O que testa:** Criação de questão no banco de dados  
**Tempo:** ~1-2s  
**Deve passar se:** Sistema consegue criar questões

### 3. ✅ Listar Questões
**O que testa:** Buscar questões existentes  
**Tempo:** ~1s  
**Deve passar se:** Sistema consegue listar questões

### 4. ✅ Criar Aluno de Teste
**O que testa:** Cadastro de aluno  
**Tempo:** ~1-2s  
**Deve passar se:** Sistema consegue criar alunos

### 5. ✅ Criar Série/Turma
**O que testa:** Criação de séries e turmas  
**Tempo:** ~1-2s  
**Deve passar se:** Sistema consegue criar séries/turmas

### 6. ✅ Criar Simulado
**O que testa:** Montagem de simulado com 50 questões  
**Tempo:** ~2-3s  
**Deve passar se:** Há questões suficientes no banco

### 7. ✅ Duplicar Simulado
**O que testa:** Duplicação de simulados  
**Tempo:** ~1-2s  
**Deve passar se:** Simulado foi criado no teste anterior

### 8. ✅ Upload de Imagem
**O que testa:** Upload de cartão resposta para Supabase Storage  
**Tempo:** ~2-3s  
**Deve passar se:** Storage está configurado corretamente

### 9. ✅ Gerar Relatório
**O que testa:** Geração de estatísticas  
**Tempo:** ~1s  
**Deve passar se:** Sistema consegue gerar stats

---

## Resolução de Problemas

### ❌ "Backend não está respondendo"

**Causas possíveis:**
- Sem conexão com internet
- Servidor Supabase fora do ar
- Configuração incorreta

**Solução:**
1. Verifique sua conexão
2. Aguarde alguns segundos e tente novamente
3. Verifique console do navegador (F12)

### ❌ "Falha ao criar questão"

**Causas possíveis:**
- Problema no banco de dados
- Token de autenticação inválido
- Timeout

**Solução:**
1. Faça logout e login novamente
2. Tente criar questão manualmente
3. Verifique logs no console

### ❌ "Não há questões suficientes para criar simulado"

**Causas possíveis:**
- Banco de questões vazio
- Menos de 50 questões no total

**Solução:**
1. Crie pelo menos 50 questões primeiro
2. Ou importe questões em lote
3. Execute testes novamente

### ❌ "Nenhum simulado criado no teste anterior" (Teste #7)

**Causas possíveis:**
- Race condition entre React state e testes sequenciais
- Teste #6 falhou e não criou o simulado
- Bug no código (já corrigido)

**Solução:**
1. Este erro foi corrigido permanentemente
2. Se ainda ocorrer, verifique se o Teste #6 passou
3. Veja logs do console para detalhes

**Como funciona agora:**
```typescript
// Variáveis locais compartilhadas entre testes
let createdExamId: string | undefined;

// Teste #6
createdExamId = result.exam.id; // Síncrono!

// Teste #7
if (!createdExamId) { // Sempre disponível
  throw new Error('...');
}
```

**Documentação completa:** [FIXES_DUPLICATE_TEST.md](FIXES_DUPLICATE_TEST.md)

---

### ❌ "Failed to create serie" - Erro 500 (Teste #5)

**Causas possíveis:**
- Bug no código do servidor (já corrigido)
- TypeError ao verificar código duplicado

**Solução:**
1. Este erro foi corrigido permanentemente
2. Bug era no acesso `item.value.code` (agora `item.code`)
3. Se ainda ocorrer, verifique logs do servidor

**Como era o bug:**
```typescript
// ❌ ANTES - TypeError
const codeExists = existingSeries.some(item => 
  item.value.code.toLowerCase() === body.code.toLowerCase()
  // item.value era undefined!
);

// ✅ DEPOIS - Correto
const codeExists = existingSeries.some(item => 
  item.code.toLowerCase() === body.code.toLowerCase()
);
```

**Documentação completa:** [FIXES_SERIES_CREATE.md](FIXES_SERIES_CREATE.md)

---

### ❌ "Falha ao gerar estatísticas: Erro desconhecido" (Teste #9)

**Causas possíveis:**
- Método `getDashboardStats()` não existia (já corrigido)
- Servidor não retornava `success: true` (já corrigido)

**Solução:**
1. Este erro foi corrigido permanentemente
2. Método adicionado em `/utils/api.ts`
3. Servidor atualizado para retornar formato correto

**Como funciona agora:**
```typescript
// API
const result = await apiService.getDashboardStats();

// Resposta do servidor
{
  "success": true,
  "stats": {
    "totalStudents": 45,
    "totalExams": 12,
    "totalSubmissions": 234,
    "activeExams": 3,
    "averageScore": 75.5
  }
}
```

**Documentação completa:** [FIXES_DASHBOARD_STATS.md](FIXES_DASHBOARD_STATS.md)

---

### ❌ "Nome e código são obrigatórios" (Teste #5)

**Causas possíveis:**
- Falta campo `code` obrigatório na criação de série
- Código duplicado

**Solução:**
1. Sempre envie `name` E `code` ao criar série
2. O código deve ser único (não pode duplicar)
3. Formato correto:
```javascript
{
  name: 'Série Teste',
  code: 'TEST-001', // OBRIGATÓRIO e ÚNICO!
  description: 'Opcional'
}
```

**⚠️ IMPORTANTE:** A resposta é `{ success: true, data: {...} }`, use `result.data.id` (não `result.serie.id`)

### ❌ "Falha ao fazer upload de imagem"

**Causas possíveis:**
- Storage não configurado
- Permissões incorretas
- Bucket não existe

**Solução:**
1. Verifique configuração do Supabase Storage
2. Certifique-se que bucket existe
3. Verifique permissões de acesso

---

## Dados de Teste Criados

Os testes criam dados reais no sistema:

- ✅ **Questões** com prefixo `[TESTE]`
- ✅ **Alunos** com email `teste@escola.com`
- ✅ **Séries/Turmas** com "Teste" no nome
- ✅ **Simulados** com título "Simulado Teste"
- ✅ **Imagens** de teste pequenas (100x100px)

### Limpeza

Se desejar limpar dados de teste:

1. **Questões:** Banco de Questões → Buscar "[TESTE]" → Deletar
2. **Alunos:** Gestão de Alunos → Buscar "Teste" → Deletar
3. **Simulados:** Gerenciar Simulados → Buscar "Teste" → Deletar
4. **Imagens:** São automaticamente associadas a submissões

---

## Testes Manuais Rápidos

Além dos testes automatizados, você pode fazer testes manuais:

### Teste Rápido 1: Criar Questão (1 min)
```
1. Vá em "Banco de Questões"
2. Clique "+ Nova Questão"
3. Preencha todos os campos
4. Clique "Salvar"
5. ✓ Questão aparece na lista
```

### Teste Rápido 2: Criar Simulado (2 min)
```
1. Crie 50 questões (10 de cada matéria)
2. Vá em "Criar Simulado"
3. Preencha informações
4. Clique "Seleção Automática"
5. Clique "Criar Simulado"
6. ✓ Simulado criado com sucesso
```

### Teste Rápido 3: Exportar Excel (30 seg)
```
1. Vá em "Gerenciar Simulados"
2. Selecione um simulado
3. Clique "Exportar"
4. ✓ Arquivo baixado
5. ✓ Abra e verifique formatação
```

### Teste Rápido 4: Upload de Imagem (30 seg)
```
1. Vá em "Correção de Provas"
2. Clique em uma submissão
3. Clique "Enviar Imagem"
4. Selecione uma foto
5. ✓ Imagem aparece no grid
```

---

## Checklist de Funcionalidades

Use este checklist para verificar manualmente:

### Banco de Questões
- [ ] Criar questão
- [ ] Editar questão
- [ ] Deletar questão
- [ ] Filtrar por matéria
- [ ] Filtrar por dificuldade
- [ ] Buscar por texto
- [ ] Exportar questões
- [ ] Importar questões

### Gestão de Alunos
- [ ] Criar série
- [ ] Criar turma
- [ ] Adicionar aluno individual
- [ ] Importar alunos em lote
- [ ] Editar aluno
- [ ] Deletar aluno
- [ ] Filtrar por série/turma
- [ ] Exportar alunos

### Simulados
- [ ] Criar simulado (seleção manual)
- [ ] Criar simulado (seleção automática)
- [ ] Ver detalhes do simulado
- [ ] Editar simulado
- [ ] Duplicar simulado
- [ ] Ativar/Desativar simulado
- [ ] Exportar simulado Excel
- [ ] Imprimir simulado
- [ ] Importar simulado

### Correção
- [ ] Ver lista de submissões
- [ ] Ver detalhes de submissão
- [ ] Upload de imagem
- [ ] Deletar imagem
- [ ] Adicionar feedback
- [ ] Adicionar notas de revisão
- [ ] Salvar revisão
- [ ] Exportar resultados

### Relatórios
- [ ] Ver dashboard
- [ ] Ver estatísticas gerais
- [ ] Análise por matéria
- [ ] Análise por aluno
- [ ] Exportar relatório completo
- [ ] Gráficos funcionam

---

## Métricas de Performance

### Tempos Esperados

| Operação | Tempo Ideal | Tempo Aceitável | Timeout |
|----------|-------------|-----------------|---------|
| Login | < 1s | < 3s | 5s |
| Listar questões | < 1s | < 2s | 10s |
| Criar questão | < 500ms | < 1s | 10s |
| Criar simulado | < 1s | < 3s | 10s |
| Upload imagem (1MB) | < 2s | < 5s | 10s |
| Exportar Excel | < 1s | < 3s | 10s |
| Gerar relatório | < 2s | < 5s | 10s |

### Volume de Dados

| Item | Mínimo | Recomendado | Máximo Testado |
|------|--------|-------------|----------------|
| Questões | 50 | 200+ | 1000+ |
| Alunos | 10 | 50+ | 500+ |
| Simulados | 1 | 10+ | 50+ |
| Submissões | 5 | 30+ | 200+ |
| Imagens/Submissão | 1 | 2-3 | 5 |

---

## CI/CD (Futuro)

Planejado para versões futuras:

- [ ] Testes unitários (Jest/Vitest)
- [ ] Testes de integração (Playwright)
- [ ] Testes E2E automatizados
- [ ] Coverage reports
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)

---

## Relatando Bugs Encontrados

Se encontrar um bug durante os testes:

1. **Anote o teste que falhou**
2. **Copie a mensagem de erro**
3. **Tire um print da tela**
4. **Abra o Console (F12)**
5. **Copie erros em vermelho**
6. **Reporte com todos os detalhes**

### Formato de Reporte

```markdown
## Bug: [Título curto]

**Teste:** [Nome do teste que falhou]

**Passos para Reproduzir:**
1. [Passo 1]
2. [Passo 2]
3. [Erro acontece]

**Erro:**
```
[Cole o erro aqui]
```

**Console:**
```
[Cole logs do console]
```

**Ambiente:**
- Navegador: Chrome 118
- SO: Windows 11
- Data: 2025-10-04
```

---

## Boas Práticas de Teste

### Antes de Testar
- ✅ Use navegador atualizado
- ✅ Limpe cache (Ctrl + Shift + Del)
- ✅ Verifique conexão estável
- ✅ Feche outras abas pesadas
- ✅ Tenha dados de teste prontos

### Durante os Testes
- ✅ Teste uma funcionalidade por vez
- ✅ Anote resultados
- ✅ Tire prints de erros
- ✅ Teste casos extremos
- ✅ Teste com dados inválidos

### Depois dos Testes
- ✅ Limpe dados de teste
- ✅ Reporte bugs encontrados
- ✅ Sugira melhorias
- ✅ Documente casos de uso
- ✅ Compartilhe feedback

---

**Última atualização:** Outubro 2025  
**Versão:** 1.0.0

**Navegação:**
[Início](README.md) | [Guia Rápido](QUICK_START.md) | [FAQ](FAQ.md) | [Arquitetura](ARCHITECTURE.md)
