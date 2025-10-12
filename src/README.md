# Sistema SEICE - Provas Impressas

Sistema completo para gerenciamento de simulados multidisciplinares impressos, com criação de provas, gestão de alunos, correção digital e análise de resultados.

## 📚 Documentação

> **[📑 Índice Completo da Documentação](INDEX.md)** - Navegue por todos os documentos

- **[📖 README.md](README.md)** - Este arquivo (Guia completo de testes)
- **[🚀 QUICK_START.md](QUICK_START.md)** - Comece a usar em 5 minutos
- **[🧪 TESTING.md](TESTING.md)** - Testes automatizados do sistema
- **[❓ FAQ.md](FAQ.md)** - Perguntas frequentes
- **[🏗️ ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura técnica do sistema
- **[📝 CHANGELOG.md](CHANGELOG.md)** - Histórico de versões e mudanças

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Início Rápido](#início-rápido)
- [Como Testar o Sistema](#como-testar-o-sistema)
- [Troubleshooting](#troubleshooting)
- [Suporte](#suporte)

---

## ⚡ Início Rápido

**Primeira vez usando o sistema?** Veja o [Guia Rápido (5 minutos)](QUICK_START.md)

**Desenvolvedor?** Consulte a [Documentação Técnica](ARCHITECTURE.md)

---

## 🎯 Visão Geral

O Sistema SEICE é uma plataforma completa para gerenciar todo o ciclo de vida de simulados impressos:

1. **Criação**: Monte simulados multidisciplinares com 10 questões por matéria
2. **Gest��o**: Gerencie alunos, turmas e séries
3. **Aplicação**: Exporte provas em PDF ou imprima diretamente
4. **Correção**: Faça upload de gabaritos escaneados e corrija digitalmente
5. **Análise**: Gere relatórios completos de desempenho

### Fluxo de Trabalho

```
Banco de Questões → Criar Simulado → Exportar/Imprimir → 
Aplicar Prova → Upload de Gabaritos → Correção → 
Relatórios e Análises
```

---

## ✨ Funcionalidades

### 1. Banco de Questões
- ✅ Cadastro de questões por matéria
- ✅ Filtros por matéria, dificuldade e tags
- ✅ Busca avançada
- ✅ Edição e exclusão de questões
- ✅ Importação/Exportação em lote

### 2. Gestão de Alunos
- ✅ Cadastro individual ou em lote (Excel/CSV)
- ✅ Organização por séries e turmas
- ✅ Edição e exclusão
- ✅ Exportação de dados

### 3. Criação de Simulados
- ✅ Simulados multidisciplinares (50 questões padrão)
- ✅ 10 questões por matéria (Matemática, Português, História, Geografia, Ciências)
- ✅ Seleção manual ou automática de questões
- ✅ Configuração de tempo estimado
- ✅ Status: Rascunho, Ativo, Arquivado

### 4. Gerenciamento de Simulados
- ✅ Duplicação de simulados
- ✅ Ativar/Desativar
- ✅ Exportação em Excel com formatação profissional
- ✅ Importação de simulados
- ✅ Visualização de estatísticas

### 5. Correção de Provas
- ✅ Upload de imagens de cartões resposta escaneados
- ✅ Correção automática por gabarito
- ✅ Análise por matéria
- ✅ Feedback personalizado para alunos
- ✅ Notas de revisão interna

### 6. Relatórios e Análises
- ✅ Exportação profissional em Excel
- ✅ Análise de desempenho por aluno
- ✅ Análise por matéria
- ✅ Estatísticas gerais
- ✅ Gráficos e visualizações

---

## 🏗️ Arquitetura

### Frontend
- **React** + **TypeScript**
- **Tailwind CSS** v4
- **shadcn/ui** (componentes)
- **Lucide Icons**

### Backend
- **Supabase** (PostgreSQL + Auth)
- **Hono** (Edge Functions)
- **Deno** runtime

### Armazenamento
- **KV Store** (dados estruturados)
- **Supabase Storage** (imagens de cartões resposta)

---

## 🧪 Como Testar o Sistema

### Pré-requisitos

1. **Conta criada no sistema**
   - Acesse a página de login
   - Clique em "Criar conta"
   - Preencha: Nome, Email, Senha
   - Faça login

### Roteiro Completo de Testes

---

## 📝 TESTE 1: Banco de Questões

### Objetivo
Verificar criação, edição e gestão de questões.

### Passos

1. **Acessar Banco de Questões**
   - No menu lateral, clique em "Banco de Questões"
   - Verifique que a página carrega sem erros

2. **Criar Nova Questão**
   - Clique no botão "+ Nova Questão"
   - Preencha os campos:
     ```
     Enunciado: "Qual é a capital do Brasil?"
     Matéria: Geografia
     Dificuldade: Fácil
     Opções:
       A) São Paulo
       B) Brasília (CORRETO)
       C) Rio de Janeiro
       D) Salvador
     Explicação: "Brasília é a capital federal desde 1960"
     Tags: geografia, brasil, capitais
     ```
   - Clique em "Salvar Questão"
   - ✅ **Resultado esperado**: Mensagem de sucesso + questão aparece na lista

3. **Filtrar Questões**
   - Use o filtro de matéria: selecione "Geografia"
   - Use o filtro de dificuldade: selecione "Fácil"
   - Use a busca: digite "capital"
   - ✅ **Resultado esperado**: Apenas questões correspondentes aparecem

4. **Editar Questão**
   - Clique no botão de editar (ícone de lápis)
   - Modifique o enunciado
   - Clique em "Salvar"
   - ✅ **Resultado esperado**: Alteração salva com sucesso

5. **Criar Mais Questões**
   - Crie pelo menos 10 questões de cada matéria:
     - Matemática
     - Português
     - História
     - Geografia
     - Ciências
   - **IMPORTANTE**: Você precisa de pelo menos 10 questões por matéria para criar simulados

6. **Exportar Questões**
   - Selecione algumas questões (checkbox)
   - Clique em "Exportar Selecionadas"
   - ✅ **Resultado esperado**: Download de arquivo Excel com questões

### ✅ Critérios de Sucesso
- [ ] Criar questões sem erros
- [ ] Filtros funcionam corretamente
- [ ] Edição salva alterações
- [ ] Exportação gera arquivo Excel válido

---

## 👥 TESTE 2: Gestão de Alunos

### Objetivo
Verificar cadastro e gestão de alunos.

### Passos

1. **Acessar Gestão de Alunos**
   - No menu lateral, clique em "Gestão de Alunos"
   - Verifique carregamento da página

2. **Criar Série**
   - Na aba "Séries/Turmas", clique "+ Nova Série"
   - Preencha:
     ```
     Nome: 1° ANO
     Descrição: Ensino Médio - Primeiro Ano
     ```
   - Clique "Criar Série"
   - ✅ **Resultado esperado**: Série criada com sucesso

3. **Criar Turma**
   - Ainda na aba "Séries/Turmas", clique "+ Nova Turma"
   - Preencha:
     ```
     Nome: Turma A
     Série: 1° ANO
     Ano Letivo: 2025
     ```
   - Clique "Criar Turma"
   - ✅ **Resultado esperado**: Turma criada com sucesso

4. **Cadastrar Aluno Individual**
   - Volte para aba "Alunos"
   - Clique "+ Adicionar Aluno"
   - Preencha:
     ```
     Nome: João Silva
     Email: joao.silva@escola.com
     Matrícula: 2025001
     Série: 1° ANO
     Turma: Turma A
     Data de Nascimento: 01/01/2008
     ```
   - Clique "Adicionar"
   - ✅ **Resultado esperado**: Aluno adicionado com sucesso

5. **Importar Alunos em Lote**
   - Clique em "Importar Alunos"
   - Baixe o template Excel
   - Preencha com dados de teste (pelo menos 10 alunos)
   - Faça upload do arquivo
   - ✅ **Resultado esperado**: Todos os alunos importados sem erros

6. **Filtrar e Buscar**
   - Use filtros de série e turma
   - Use a busca por nome
   - ✅ **Resultado esperado**: Filtros funcionam corretamente

7. **Exportar Dados**
   - Clique "Exportar para Excel"
   - ✅ **Resultado esperado**: Download de planilha com todos os alunos

### ✅ Critérios de Sucesso
- [ ] Séries e turmas criadas
- [ ] Alunos cadastrados individualmente
- [ ] Importação em lote funciona
- [ ] Filtros e buscas funcionam
- [ ] Exportação gera arquivo válido

---

## 📋 TESTE 3: Criação de Simulados

### Objetivo
Criar simulados multidisciplinares.

### Passos

1. **Acessar Criação de Simulados**
   - No menu lateral, clique em "Criar Simulado"
   - Verifique carregamento da página

2. **Informações Básicas**
   - Preencha:
     ```
     Título: Simulado ENEM 2025 - 1ª Aplicação
     Descrição: Primeiro simulado preparatório para o ENEM
     Questões por Matéria: 10
     Tempo Estimado: 90 minutos
     Status: Ativo
     ```

3. **Selecionar Questões**
   - **Opção A - Seleção Automática**:
     - Clique em "Seleção Automática"
     - O sistema seleciona 10 questões de cada matéria
     - ✅ **Resultado esperado**: 50 questões selecionadas (10 por matéria)

   - **Opção B - Seleção Manual**:
     - Clique em cada matéria (Matemática, Português, etc.)
     - Selecione exatamente 10 questões por matéria
     - ✅ **Resultado esperado**: Total de 50 questões

4. **Revisar Simulado**
   - Verifique o resumo:
     - Total: 50 questões
     - Por matéria: 10 cada
   - Clique em "Criar Simulado"
   - ✅ **Resultado esperado**: Simulado criado com sucesso

5. **Criar Múltiplos Simulados**
   - Crie pelo menos 3 simulados diferentes
   - Varie os títulos e questões
   - **IMPORTANTE**: Você precisa de simulados para testar as outras funcionalidades

### ✅ Critérios de Sucesso
- [ ] Simulado criado sem erros
- [ ] 50 questões corretamente distribuídas
- [ ] Informações salvas corretamente
- [ ] Múltiplos simulados criados

---

## 🗂️ TESTE 4: Gerenciamento de Simulados

### Objetivo
Testar funcionalidades de gestão de simulados.

### Passos

1. **Acessar Gerenciamento**
   - No menu lateral, clique em "Gerenciar Simulados"
   - Verifique que seus simulados aparecem

2. **Visualizar Detalhes**
   - Clique no botão "Ver Detalhes" (ícone de olho)
   - Verifique todas as informações do simulado
   - Veja as 50 questões listadas
   - ✅ **Resultado esperado**: Todas as informações corretas

3. **Duplicar Simulado**
   - Clique no botão "Duplicar" (ícone de cópia)
   - Verifique que uma cópia foi criada
   - A cópia deve ter "(Cópia)" no título
   - ✅ **Resultado esperado**: Cópia criada com todas as questões

4. **Ativar/Desativar**
   - Clique no botão de status (toggle)
   - Mude de "Ativo" para "Arquivado"
   - Mude de volta para "Ativo"
   - ✅ **Resultado esperado**: Status atualizado corretamente

5. **Exportar para Excel**
   - Selecione um ou mais simulados (checkbox)
   - Clique "Exportar Selecionados"
   - Abra o arquivo Excel baixado
   - Verifique:
     - Formatação profissional
     - Todas as questões presentes
     - Gabarito incluído
     - Informações completas
   - ✅ **Resultado esperado**: Arquivo Excel bem formatado e completo

6. **Imprimir Simulado**
   - Clique em "Imprimir" em um simulado
   - Verifique a pré-visualização de impressão
   - ✅ **Resultado esperado**: Formato adequado para impressão

7. **Importar Simulado**
   - Use um arquivo Excel exportado anteriormente
   - Clique "Importar Simulados"
   - Faça upload do arquivo
   - ✅ **Resultado esperado**: Simulado importado corretamente

### ✅ Critérios de Sucesso
- [ ] Detalhes visualizados corretamente
- [ ] Duplicação funciona
- [ ] Status atualizado
- [ ] Exportação Excel funciona e está bem formatada
- [ ] Impressão formatada corretamente
- [ ] Importação funciona

---

## ✍️ TESTE 5: Correção de Provas

### Objetivo
Testar correção digital de provas impressas.

### Passos

1. **Simular Aplicação de Prova**
   - Exporte um simulado em Excel
   - Anote o gabarito (respostas corretas)
   - **Simule respostas de alunos** (você vai precisar criar dados de submissão)

2. **Criar Submissões de Teste**
   - **ATENÇÃO**: Como o sistema foi mudado para impressos, você precisa ter submissões no banco
   - Use o console do navegador ou crie via API:
   ```javascript
   // No console do navegador, após login:
   const submitExam = async () => {
     const response = await fetch('https://[SEU-PROJECT-ID].supabase.co/functions/v1/make-server-83358821/submissions', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${localStorage.getItem('access_token')}`
       },
       body: JSON.stringify({
         examId: '[ID-DO-SIMULADO]',
         studentName: 'João Silva',
         studentClass: 'Turma A',
         studentGrade: '1° ANO',
         answers: [1, 2, 0, 3, 1, 2, 0, 3, 1, 2, /* ... 50 respostas */],
         timeSpent: 85
       })
     });
     return response.json();
   };
   submitExam();
   ```

3. **Acessar Correção**
   - No menu lateral, clique em "Correção de Provas"
   - Verifique que as submissões aparecem

4. **Visualizar Submissão**
   - Na aba "Submissões", clique no ícone de olho
   - Verifique:
     - Pontuação total
     - Percentual de acerto
     - Desempenho por matéria
   - ✅ **Resultado esperado**: Dados corretos e completos

5. **Upload de Cartão Resposta**
   - No dialog de revisão, procure a seção "Cartões Resposta"
   - Clique "Enviar Imagem"
   - Faça upload de uma imagem de teste (qualquer foto/scan)
   - ✅ **Resultado esperado**: 
     - Upload bem-sucedido
     - Imagem aparece no grid
     - Preview da imagem visível

6. **Gerenciar Imagens**
   - Faça upload de mais imagens (até 3)
   - Passe o mouse sobre uma imagem
   - Clique em "Excluir"
   - Confirme a exclusão
   - ✅ **Resultado esperado**: Imagem removida

7. **Adicionar Feedback**
   - No campo "Feedback para o Aluno", digite:
     ```
     Parabéns! Excelente desempenho em Matemática e Português.
     Recomendo revisar os conteúdos de História, principalmente 
     Brasil Colônia.
     ```
   - No campo "Notas de Revisão", digite:
     ```
     Aluno mostra domínio em Exatas. Dificuldades em Humanas.
     ```
   - Clique "Salvar Revisão"
   - ✅ **Resultado esperado**: Revisão salva com sucesso

8. **Exportar Resultados**
   - Selecione uma ou mais submissões
   - Clique "Exportar Selecionados"
   - ✅ **Resultado esperado**: Download de relatório em JSON

### ✅ Critérios de Sucesso
- [ ] Submissões carregam corretamente
- [ ] Análise por matéria funciona
- [ ] Upload de imagens funciona
- [ ] Exclusão de imagens funciona
- [ ] Feedback salvo corretamente
- [ ] Exportação funciona

---

## 📊 TESTE 6: Relatórios e Análises

### Objetivo
Verificar geração de relatórios.

### Passos

1. **Acessar Relatórios**
   - No menu lateral, clique em "Relatórios"
   - Verifique carregamento da página

2. **Visualizar Dashboard**
   - Na aba "Visão Geral", verifique:
     - Total de submissões
     - Média geral
     - Taxa de aprovação
     - Distribuição de performance
   - ✅ **Resultado esperado**: Estatísticas corretas

3. **Análise Detalhada**
   - Vá para aba "Análise Detalhada"
   - Selecione um simulado
   - Veja análises por:
     - Matéria
     - Questão
     - Aluno
   - ✅ **Resultado esperado**: Dados detalhados e corretos

4. **Exportar Relatório Completo**
   - Clique "Exportar Relatório Completo"
   - Escolha formato Excel
   - Abra o arquivo
   - Verifique:
     - Múltiplas abas (Resumo, Por Matéria, Por Aluno, etc.)
     - Formatação profissional
     - Gráficos (se aplicável)
   - ✅ **Resultado esperado**: Relatório completo e bem formatado

### ✅ Critérios de Sucesso
- [ ] Dashboard com estatísticas corretas
- [ ] Análises detalhadas funcionam
- [ ] Exportação gera arquivo completo
- [ ] Formatação profissional

---

## ⚙️ TESTE 7: Configurações

### Objetivo
Testar configurações do sistema.

### Passos

1. **Acessar Configurações**
   - No menu lateral, clique em "Configurações"

2. **Perfil do Usuário**
   - Na aba "Perfil", atualize:
     ```
     Nome: [Seu Nome]
     Instituição: Escola Teste
     Cargo: Professor
     Telefone: (11) 99999-9999
     ```
   - Clique "Salvar Perfil"
   - ✅ **Resultado esperado**: Perfil atualizado

3. **Configurações do Sistema**
   - Na aba "Sistema", ajuste:
     - Tempo padrão de prova
     - Permitir revisão de respostas
     - Mostrar respostas corretas
   - Clique "Salvar"
   - ✅ **Resultado esperado**: Configurações salvas

4. **Gerenciar Usuários** (se disponível)
   - Veja lista de usuários
   - Verifique permissões
   - ✅ **Resultado esperado**: Informações corretas

### ✅ Critérios de Sucesso
- [ ] Perfil atualizado
- [ ] Configurações salvas
- [ ] Sistema reflete mudanças

---

## 🔄 TESTE 8: Fluxo Completo

### Objetivo
Testar todo o fluxo do sistema do início ao fim.

### Cenário
Professor aplicando simulado ENEM para turma do 3° ano.

### Passos Completos

1. **Preparação**
   - [ ] Criar série "3° ANO"
   - [ ] Criar turma "Turma A - 3° ANO"
   - [ ] Importar 30 alunos
   - [ ] Criar banco com 50 questões de cada matéria

2. **Criação do Simulado**
   - [ ] Criar "Simulado ENEM 2025 - 1ª Aplicação"
   - [ ] 50 questões (10 por matéria)
   - [ ] Status: Ativo
   - [ ] Tempo: 180 minutos

3. **Preparação da Aplicação**
   - [ ] Exportar simulado em Excel
   - [ ] Imprimir provas (ou verificar PDF)
   - [ ] Verificar gabarito

4. **Aplicação** (simulada)
   - [ ] Criar submissões de teste para os 30 alunos
   - [ ] Simular diferentes níveis de desempenho

5. **Correção**
   - [ ] Acessar "Correção de Provas"
   - [ ] Revisar pelo menos 5 submissões
   - [ ] Fazer upload de imagens de cartões resposta
   - [ ] Adicionar feedback personalizado

6. **Análise**
   - [ ] Gerar relatório completo em Excel
   - [ ] Analisar desempenho por matéria
   - [ ] Identificar questões com mais erros
   - [ ] Identificar alunos com dificuldades

7. **Ações Pós-Análise**
   - [ ] Exportar lista de alunos para recuperação
   - [ ] Exportar questões mais difíceis
   - [ ] Duplicar simulado para próxima aplicação

### ✅ Critérios de Sucesso
- [ ] Fluxo completo sem erros
- [ ] Todos os dados corretos
- [ ] Relatórios gerados
- [ ] Sistema estável durante todo o processo

---

## 🐛 Troubleshooting

### Problema: "Erro ao carregar dados"

**Solução:**
1. Verifique conexão com internet
2. Limpe cache do navegador (Ctrl + Shift + R)
3. Verifique console do navegador (F12)
4. Faça logout e login novamente

### Problema: "Timeout ao carregar submissões"

**Solução:**
1. O sistema tem timeout de 10 segundos
2. Se muitos dados, pode demorar
3. Aguarde e tente novamente
4. Reduza filtros de busca

### Problema: "Erro ao fazer upload de imagem"

**Solução:**
1. Verifique tamanho da imagem (máx 10MB)
2. Use formatos: JPG, PNG
3. Verifique conexão com internet
4. Tente novamente

### Problema: "Excel não abre corretamente"

**Solução:**
1. Use Microsoft Excel ou Google Sheets
2. Verifique se o download completou
3. Tente exportar novamente
4. Verifique se há dados para exportar

### Problema: "Não consigo criar simulado"

**Solução:**
1. Verifique se tem questões suficientes
2. Precisa de pelo menos 10 questões por matéria
3. Crie mais questões no Banco de Questões
4. Tente seleção automática

---

## 📞 Suporte

### Logs do Sistema
- Abra o console do navegador (F12 → Console)
- Veja mensagens de erro detalhadas
- Copie erros para reportar

### Informações Úteis
- Versão do navegador
- Sistema operacional
- Passos que causaram o erro
- Prints de tela

---

## ✅ Checklist Final de Testes

### Funcionalidades Básicas
- [ ] Login e autenticação
- [ ] Navegação entre páginas
- [ ] Carregamento de dados

### Banco de Questões
- [ ] Criar questões
- [ ] Editar questões
- [ ] Filtrar e buscar
- [ ] Exportar questões

### Gestão de Alunos
- [ ] Criar séries/turmas
- [ ] Cadastrar alunos
- [ ] Importar alunos
- [ ] Exportar alunos

### Simulados
- [ ] Criar simulado
- [ ] Duplicar simulado
- [ ] Exportar simulado
- [ ] Imprimir simulado

### Correção
- [ ] Visualizar submissões
- [ ] Upload de imagens
- [ ] Adicionar feedback
- [ ] Exportar resultados

### Relatórios
- [ ] Dashboard com estatísticas
- [ ] Análises detalhadas
- [ ] Exportação Excel
- [ ] Formatação profissional

### Performance
- [ ] Carregamento em até 10 segundos
- [ ] Sistema responsivo
- [ ] Sem travamentos
- [ ] Exportações rápidas

---

## 📚 Próximos Passos

Após completar todos os testes:

1. **Documente problemas encontrados**
   - Liste erros
   - Descreva comportamentos inesperados
   - Sugira melhorias

2. **Teste em diferentes navegadores**
   - Chrome
   - Firefox
   - Edge
   - Safari

3. **Teste em diferentes dispositivos**
   - Desktop
   - Tablet
   - Mobile

4. **Use em situação real**
   - Aplique um simulado de verdade
   - Corrija provas reais
   - Gere relatórios reais

---

## 🎓 Dicas de Uso

### Para Melhor Performance
- Crie questões em lote (importação)
- Use seleção automática de questões
- Exporte relatórios fora de horário de pico
- Mantenha navegador atualizado

### Para Melhor Organização
- Use tags nas questões
- Nomeie simulados com padrão (ex: "ENEM 2025 - 1ª Aplicação")
- Organize alunos por série/turma
- Arquive simulados antigos

### Para Melhor Análise
- Revise todas as submissões
- Adicione feedback personalizado
- Compare resultados entre simulados
- Identifique padrões de dificuldade

---

## 🔒 Segurança

- Nunca compartilhe sua senha
- Faça logout em computadores públicos
- Backup de dados importante (exportações)
- Mantenha email de recuperação atualizado

---

---

## 📦 Estrutura do Sistema

```
SISTEMA SEICE - Provas Impressas
│
├── 📝 CRIAR CONTEÚDO
│   ├── Banco de Questões (50+ por matéria)
│   ├── Séries e Turmas
│   └── Cadastro de Alunos
│
├── 🎯 MONTAR SIMULADOS
│   ├── Seleção de Questões (10 por matéria)
│   ├── Configuração (tempo, status)
│   └── Preview e Validação
│
├── 📄 EXPORTAR/IMPRIMIR
│   ├── Exportação Excel (formatada)
│   ├── Impressão PDF
│   └── Gabarito Separado
│
├── ✍️ APLICAR PROVA
│   └── [Fora do sistema - em sala de aula]
│
├── ✅ CORREÇÃO DIGITAL
│   ├── Upload de Gabaritos Escaneados
│   ├── Correção Automática
│   ├── Análise por Matéria
│   └── Feedback Personalizado
│
└── 📊 ANÁLISE E RELATÓRIOS
    ├── Dashboard com Estatísticas
    ├── Performance por Aluno/Matéria
    └── Exportação Profissional
```

---

## 🎓 Próximos Passos

Após completar todos os testes, você estará pronto para:

1. ✅ Usar o sistema em produção
2. ✅ Aplicar simulados reais
3. ✅ Corrigir provas eficientemente
4. ✅ Gerar relatórios para sua instituição

**Continue aprendendo:**
- [Perguntas Frequentes](FAQ.md)
- [Dicas Avançadas](QUICK_START.md#💡-dicas-pro)
- [Documentação Técnica](ARCHITECTURE.md)

---

**Sistema SEICE - Versão 1.0**
*Última atualização: Outubro 2025*

**Links Rápidos:** [Índice](INDEX.md) | [Início Rápido](QUICK_START.md) | [FAQ](FAQ.md) | [Arquitetura](ARCHITECTURE.md) | [Changelog](CHANGELOG.md)
