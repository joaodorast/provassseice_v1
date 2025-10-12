# ❓ Perguntas Frequentes - Sistema SEICE

## 📑 Índice

- [Geral](#geral)
- [Banco de Questões](#banco-de-questões)
- [Simulados](#simulados)
- [Alunos](#alunos)
- [Correção](#correção)
- [Exportação](#exportação)
- [Problemas Técnicos](#problemas-técnicos)

---

## Geral

### O que é o Sistema SEICE?

O SEICE é um sistema completo para gerenciamento de simulados **impressos**. Você cria as provas digitalmente, imprime, aplica em sala, e depois corrige digitalmente fazendo upload dos gabaritos escaneados.

### É necessário internet para usar?

Sim, o sistema funciona 100% online. Você precisa de internet para:
- Criar e gerenciar questões
- Montar simulados
- Exportar para impressão
- Fazer correção digital
- Gerar relatórios

### Os alunos fazem a prova online?

**NÃO**. O sistema é focado em **provas impressas**. O fluxo é:
1. Professor cria simulado online
2. Professor imprime/exporta PDF
3. Alunos fazem a prova no papel
4. Professor escaneia gabaritos
5. Professor faz correção digital (upload das imagens)

### Quanto custa?

O sistema está sendo disponibilizado para testes. Consulte com sua instituição sobre custos e licenciamento.

### Quantos alunos posso cadastrar?

Não há limite técnico. O sistema suporta centenas ou milhares de alunos.

### Preciso de treinamento para usar?

Não. O sistema é intuitivo. Siga o [Guia Rápido](QUICK_START.md) e você estará pronto em 5 minutos.

---

## Banco de Questões

### Quantas questões posso criar?

Não há limite. Recomendamos ter pelo menos 50 questões por matéria para variedade.

### Posso importar questões de outros sistemas?

Sim! Use a funcionalidade de importação em lote via Excel. Baixe o template e preencha.

### Como organizo minhas questões?

Use:
- **Matérias**: Matemática, Português, etc.
- **Dificuldades**: Fácil, Médio, Difícil
- **Tags**: enem, basico, avancado, geometria, etc.

### Posso usar questões dissertativas?

O sistema suporta questões dissertativas, mas a correção automática só funciona para múltipla escolha. Questões dissertativas precisam de correção manual.

### Como edito uma questão depois de criada?

1. Vá em "Banco de Questões"
2. Encontre a questão
3. Clique no ícone de lápis (editar)
4. Faça as alterações
5. Clique "Salvar"

### Posso deletar questões em lote?

Sim! Selecione as questões (checkbox) e use a opção de exclusão em lote.

### O que acontece se eu deletar uma questão usada em simulado?

⚠️ **CUIDADO**: Se a questão já está em simulados aplicados, a exclusão pode causar problemas nos resultados. Recomendamos:
- Não deletar questões de simulados ativos
- Arquivar ao invés de deletar

---

## Simulados

### Quantas questões deve ter um simulado?

O padrão é **50 questões**:
- 10 de Matemática
- 10 de Português
- 10 de História
- 10 de Geografia
- 10 de Ciências

Você pode ajustar o número de questões por matéria se desejar.

### Preciso selecionar as questões manualmente?

Não! Você tem duas opções:
1. **Seleção Automática**: O sistema escolhe 10 questões de cada matéria aleatoriamente
2. **Seleção Manual**: Você escolhe cada questão individualmente

### Posso criar simulado com menos de 50 questões?

Sim, mas você precisa ter questões suficientes. Se escolher 5 questões por matéria, precisará de 25 questões no total.

### Como duplico um simulado?

1. Vá em "Gerenciar Simulados"
2. Encontre o simulado
3. Clique no ícone de cópia (duplicar)
4. Um novo simulado "(Cópia)" será criado

### Posso editar um simulado depois de criado?

Sim! Mas **ATENÇÃO**: Se o simulado já foi aplicado e tem submissões, editar pode causar inconsistências nos resultados.

### O que é o status de simulado?

- **Rascunho**: Simulado em criação, não visível para aplicação
- **Ativo**: Pronto para ser aplicado
- **Arquivado**: Simulado antigo, apenas para consulta

### Posso criar simulados de uma matéria só?

O sistema é otimizado para simulados **multidisciplinares** (tipo ENEM). Para provas de matéria única, você pode:
- Criar com 50 questões de uma só matéria
- Ajustar o número de questões por matéria

---

## Alunos

### Como importo alunos de uma planilha Excel?

1. Vá em "Gestão de Alunos"
2. Clique "Importar Alunos"
3. Baixe o template
4. Preencha com dados dos alunos
5. Faça upload

### O que é Série e Turma?

- **Série**: Nível de ensino (1° ANO, 2° ANO, 3° ANO, etc.)
- **Turma**: Divisão dentro da série (Turma A, Turma B, etc.)

Exemplo:
```
Série: 1° ANO
  ├── Turma A (30 alunos)
  └── Turma B (28 alunos)
```

### Preciso criar Séries e Turmas antes de cadastrar alunos?

Sim! Primeiro crie:
1. Séries
2. Turmas (associadas às séries)
3. Alunos (associados às turmas)

### Posso transferir alunos entre turmas?

Sim! Edite o aluno e selecione a nova turma.

### Como exporto lista de alunos?

1. Vá em "Gestão de Alunos"
2. (Opcional) Use filtros para selecionar alunos específicos
3. Clique "Exportar para Excel"

### Alunos têm acesso ao sistema?

**NÃO**. Apenas professores/coordenadores acessam o sistema. Alunos fazem as provas em papel.

---

## Correção

### Como faço correção das provas?

1. Escaneie os cartões resposta dos alunos
2. Vá em "Correção de Provas"
3. Selecione a submissão do aluno
4. Faça upload da imagem escaneada
5. Confira os dados e adicione feedback
6. Salve a revisão

### Preciso escanear os cartões resposta?

É **recomendado** mas não obrigatório. O upload de imagens ajuda a:
- Ter registro visual da prova
- Conferir em caso de dúvidas
- Manter arquivo digital

### Quais formatos de imagem são aceitos?

- **JPG** (recomendado)
- **PNG**
- Tamanho máximo: **10MB por imagem**

### Posso fazer upload de múltiplas imagens por aluno?

Sim! Você pode fazer upload de até 3 imagens por submissão (ex: frente e verso do gabarito).

### Como o sistema corrige as provas?

A correção é **automática** para questões de múltipla escolha:
1. Sistema compara respostas do aluno com gabarito
2. Calcula acertos por matéria
3. Gera percentual e nota
4. Mostra análise detalhada

### Posso corrigir manualmente?

Sim! Você pode:
- Revisar as correções automáticas
- Adicionar feedback personalizado
- Fazer anotações internas
- Ajustar pontuações (em casos excepcionais)

### Como adiciono feedback para o aluno?

No dialog de revisão:
1. Campo "Feedback para o Aluno" = mensagem que o aluno verá
2. Campo "Notas de Revisão" = anotações internas (só professor vê)

---

## Exportação

### Como exporto simulados para impressão?

1. Vá em "Gerenciar Simulados"
2. Selecione o simulado
3. Clique "Exportar" ou "Imprimir"
4. Escolha o formato (Excel ou PDF via impressão)

### O arquivo Excel está bem formatado?

Sim! O sistema gera Excel com:
- ✅ Formatação profissional
- ✅ Cores e estilos
- ✅ Cabeçalho com logo
- ✅ Questões numeradas
- ✅ Gabarito separado
- ✅ Pronto para imprimir

### Posso exportar apenas o gabarito?

Sim! No arquivo Excel exportado, o gabarito está em uma seção separada.

### Como exporto relatórios de resultados?

1. Vá em "Relatórios"
2. Escolha o tipo de análise
3. Clique "Exportar Relatório Completo"
4. Abra o Excel gerado

### O que vem no relatório exportado?

Dependendo do tipo:
- **Resumo Geral**: Estatísticas gerais da turma
- **Por Matéria**: Desempenho em cada disciplina
- **Por Aluno**: Resultados individuais detalhados
- **Por Questão**: Análise de cada questão do simulado

### Posso exportar em PDF?

Diretamente em PDF não, mas você pode:
1. Exportar em Excel
2. Abrir no Excel/Google Sheets
3. Salvar como PDF

Ou usar a função de impressão do navegador (Ctrl+P) e salvar como PDF.

---

## Problemas Técnicos

### "Erro ao carregar dados"

**Soluções:**
1. Verifique sua conexão com internet
2. Recarregue a página (F5 ou Ctrl+R)
3. Limpe o cache do navegador (Ctrl+Shift+R)
4. Faça logout e login novamente
5. Tente em outro navegador

### "Timeout" ao carregar submissões

O sistema tem timeout de 10 segundos. Se houver muitos dados:
1. Aguarde alguns segundos
2. Tente novamente
3. Use filtros para reduzir a quantidade de dados
4. Limpe filtros se estiverem muito restritivos

### "Erro ao fazer upload de imagem"

**Verifique:**
- ✅ Tamanho do arquivo < 10MB
- ✅ Formato JPG ou PNG
- ✅ Conexão com internet estável
- ✅ Navegador atualizado

**Se persistir:**
1. Tente reduzir o tamanho da imagem
2. Converta para JPG
3. Tente em outro navegador

### "Não consigo criar simulado"

**Requisitos:**
- ✅ Ter pelo menos 10 questões de cada matéria
- ✅ Título e descrição preenchidos
- ✅ Questões selecionadas (50 no total)

**Se persistir:**
1. Verifique se há questões suficientes no banco
2. Tente seleção automática ao invés de manual
3. Recarregue a página

### "Excel não abre corretamente"

**Soluções:**
1. Use Microsoft Excel (desktop) ou Google Sheets
2. Certifique-se que o download completou
3. Verifique se o arquivo não está corrompido
4. Tente exportar novamente

### "Login não funciona"

**Verifique:**
- ✅ Email e senha corretos
- ✅ Caps Lock desativado
- ✅ Já criou uma conta (primeiro acesso requer registro)

**Esqueceu a senha?**
Atualmente não há recuperação automática. Entre em contato com suporte.

### "Página fica carregando infinitamente"

1. Aguarde até 10 segundos (timeout automático)
2. Recarregue a página (F5)
3. Limpe cache (Ctrl+Shift+Del)
4. Desabilite extensões do navegador
5. Tente em modo anônimo

### "Dados não salvam"

**Verifique:**
1. Clicou no botão "Salvar"?
2. Viu mensagem de confirmação?
3. Recarregou a página para conferir?

**Se persistir:**
1. Verifique console do navegador (F12 → Console)
2. Veja se há erros em vermelho
3. Tire print e reporte ao suporte

### Como vejo erros técnicos?

1. Pressione **F12** no navegador
2. Vá na aba **"Console"**
3. Veja mensagens de erro (em vermelho)
4. Copie a mensagem para reportar

### O sistema funciona em celular?

O sistema é **otimizado para desktop**. Em celular/tablet:
- ✅ Funciona para consultas
- ⚠️ Criar/editar pode ser difícil
- ❌ Exportação/impressão limitada

**Recomendação:** Use em computador para melhor experiência.

### Quais navegadores são suportados?

✅ **Recomendados:**
- Google Chrome (última versão)
- Microsoft Edge (última versão)

✅ **Funcionam:**
- Firefox (última versão)
- Safari (macOS)

❌ **Não suportados:**
- Internet Explorer
- Navegadores muito antigos

---

## 💡 Dicas e Boas Práticas

### Para Performance
- Crie questões em lote (importação)
- Use seleção automática ao criar simulados
- Exporte relatórios em horários de menor uso
- Mantenha navegador sempre atualizado

### Para Organização
- Nomeie simulados com padrão: "ENEM 2025 - 1ª Aplicação"
- Use tags nas questões: "enem", "basico", "geometria"
- Organize alunos por série e turma
- Arquive simulados antigos (não delete)

### Para Segurança
- Nunca compartilhe sua senha
- Faça logout em computadores públicos
- Mantenha backup de exportações importantes
- Email de recuperação atualizado

### Para Melhor Uso
- Leia o [Guia Rápido](QUICK_START.md) antes de começar
- Faça testes antes de usar em produção
- Revise todas as submissões com cuidado
- Adicione feedback personalizado aos alunos

---

## 📞 Precisa de Mais Ajuda?

### Documentação
- **[Guia Rápido](QUICK_START.md)** - Início em 5 minutos
- **[README Completo](README.md)** - Todos os testes
- **[Arquitetura](ARCHITECTURE.md)** - Documentação técnica

### Suporte Técnico
- Descreva o problema detalhadamente
- Informe navegador e sistema operacional
- Inclua prints de tela
- Copie mensagens de erro do Console (F12)

### Comunidade
- Compartilhe dúvidas com outros usuários
- Sugira melhorias
- Reporte bugs

---

**Não encontrou sua dúvida?** Entre em contato com o suporte!

**Sistema SEICE - FAQ v1.0**
*Última atualização: Outubro 2025*
