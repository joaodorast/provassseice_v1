# Relatório de testes — Correção por IA, telas e Banco de Questões

Este documento conta, na ordem em que aconteceu, tudo que foi feito, testado, o que deu errado e como ficou.

## 1. Resposta direta

**A correção por IA está 100% perfeita?** Não dá para prometer 100% de acerto automático com foto/scan de qualidade variável — nenhum leitor de cartão por IA garante isso. O que foi construído é um sistema que **não deixa um erro passar em silêncio**: tudo que não for uma marcação clara e confirmada é sinalizado para você conferir na tela, com a foto do lado.

Números dos testes finais (cartões de 60 questões, simulado criado pelo próprio sistema, navegador real):

| Situação | Resultado |
|---|---|
| Cartões limpos e fotos moderadas | 0 erros silenciosos |
| Cartão pior caso (lápis cinza fraco + foto borrada + borracha) | 1 erro silencioso em 60 questões |
| Antes (leitura da página inteira em 1 chamada) | Até 15 questões erradas em 80, e resultado diferente a cada chamada |

Onde há risco, o sistema avisa: questões em amarelo ("Revisar"), nota marcada como **provisória** e, se muitas questões duvidosas, alerta vermelho de **imagem de baixa qualidade** pedindo conferência do cartão inteiro.

### Onde eu parei — estava corrigindo perfeitamente?

**Quase, mas não "perfeitamente".** No último teste completo (3 cartões, 180 questões, simulado criado pelo sistema):
- 179 de 180 questões saíram corretas **ou foram sinalizadas para você conferir**; **1 questão errou sem aviso** (cartão de lápis cinza fraco com foto borrada e borracha, o pior caso que inventei).
- Nos 2 cartões melhores: **0 erros** sem aviso, notas salvas idênticas ao gabarito.
- O que ficou pendente quando parei: conferir visualmente o novo botão "Ver imagem" e os modais de algumas telas (Séries, Turmas, Alunos etc.). Parei por causa do custo.

Ou seja: a leitura ficou **muito mais confiável e honesta** do que era (antes errava até 15 questões e mudava a cada tentativa), mas o que garante zero erro na nota final é **você conferir as questões em amarelo** antes de usar as notas.

### Atualização final — testes com o cartão-resposta REAL do sistema

Até aqui os cartões de teste eram desenhados por mim. Nesta rodada usei o cartão que o próprio sistema gera (Gerenciar Simulados → ícone QR Code): A4, 2 colunas "GABARITO", bolhas pequenas de contorno azul e a **letra escrita à direita** de cada bolha. Renderizei esse cartão, preenchi com marcações simuladas (marcação cheia, parcial, borrão, em branco e dupla marcação) e degradei a imagem.

| Teste | Resultado |
|---|---|
| Leitura anterior no cartão real, qualidade média | 55/60 certas, **3 erros sem aviso** — a IA associava a bolha à letra errada (C lida como B, E como D) |
| **Nova leitura** (cada coluna lida separadamente, bolhas ampliadas, IA escreve letra + nível de cada bolha), cartão A, qualidade média | **60/60, 0 erros sem aviso**; as 5 sinalizações eram exatamente as anomalias plantadas (2 em branco, 2 dupla marcação, 1 borrão) |
| Nova leitura, cartão B, qualidade média (1 e 2 leituras) | **59/60, 0 erros sem aviso**; a única diferente era uma marcação parcial, sinalizada para revisão. 1 leitura e 2 leituras deram o mesmo resultado |
| Teste integrado no sistema (simulado criado pelo sistema, navegador real), cartão de **qualidade baixa** (borrado, granulado, letras quase ilegíveis) | **NÃO ficou perfeito:** 26 questões sinalizadas (43%), alerta vermelho de "imagem de baixa qualidade" apareceu, mas **4 questões (25, 27, 28, 29) foram lidas erradas sem aviso** |

Conclusão honesta:
- **Qualidade média** (como pediu): 0 erros sem aviso nos 2 cartões reais testados (120 questões). Não dá para garantir 100% em todos os casos, mas nada errado passou sem sinalização nesses testes.
- **Qualidade baixa:** o sistema detecta que a imagem é ruim e avisa, mas não é confiável sozinho. Nesse caso, confira o cartão inteiro na tela "Conferir" ou envie foto/scan melhor.
- Por causa disso, foi adicionado um reforço: se uma leitura marcar 10% ou mais das questões como duvidosas, o sistema faz **sozinho uma segunda leitura** e compara. Esse reforço só acrescenta avisos (nunca remove) e **não foi testado com IA paga** (limite de gasto), só o fluxo foi validado em simulação.
- A leitura padrão agora é **1 leitura** (metade do custo). A opção "Precisão máxima" (2 leituras) continua disponível.
- A leitura foi feita para o **cartão do sistema (2 colunas, letra à direita)**. Cartões de outro formato podem ter muitas linhas sinalizadas.

Custo dessa rodada de testes: cerca de **US$ 0,18** (limite pedido: US$ 0,25; teste de qualidade baixa: 1 prova, ~US$ 0,03). Custo por cartão de 60 questões: ~US$ 0,04 com 1 leitura, ~US$ 0,09 com 2 leituras (400 cartões/mês ≈ US$ 16 com 1 leitura).

Toda a IA usa **somente a API da Claude** (sua chave, guardada no servidor). O Gemini foi removido do código.

## 2. Linha do tempo

### 2.1 Troca do Gemini pela Claude
- Gemini limitado a 20 correções/dia no plano gratuito → substituído pela API da Claude (`claude-sonnet-5`), com repetição automática em caso de limite de requisições.
- **Erro 1:** a Claude recusou o parâmetro `temperature` ("deprecated for this model"). Removido e testado.
- A chave de API foi guardada no banco (não no código). **Recomendo trocar a chave**, pois ela foi colada no chat.

### 2.2 "Correções erradas e diferentes para o mesmo aluno"
- Reproduzido: a mesma imagem enviada 3 vezes deu respostas diferentes (questões 2 e 54).
- Causa 1: o app reduzia a imagem para 1600px com qualidade baixa. Aumentado para 2400px/0,95.

### 2.3 Teste de estresse mostrou que ainda não bastava
Cartões sintéticos com foto torta, sombra, desfoque, ruído, lápis fraco, questões em branco e dupla marcação. Leitura antiga (página inteira, 1 chamada), 3 execuções por cartão:

| Cartão | Acertos por execução |
|---|---|
| A – limpo, 60q, com brancos/duplas | 51, 57, 57 de 60 |
| B – lápis cinza, 60q | 58, 52, 58 de 60 |
| C – foto torta com sombra, 60q | 58, 58, 58 de 60 |
| D – limpo, 80q | 65, 70, 69 de 80 |
| E – foto torta, 50q | 49, 49, 49 de 50 |

Problemas: linhas "deslizavam" nas últimas linhas de cartões grandes, branco/dupla marcação lidos como letra, e resultado mudando entre chamadas. **Conclusão: ler a página inteira de uma vez não é confiável.**

### 2.4 Experimentos para achar a técnica certa (custaram crédito)
| Técnica | Resultado |
|---|---|
| Cortar em faixas + descrever bolha por bolha (sim/não) | 60/60, 60/60, 59/60, 80/80, 49/50 — 2 erros silenciosos (dupla marcação lida como simples) |
| + nível de preenchimento 0–3 por bolha, 1 leitura | 3 erros silenciosos em 7 cartões (mas vários já sinalizados) |
| + 2 leituras independentes com cortes diferentes | 1 erro silencioso em 7 cartões (um "em branco" que na verdade era lápis fraco) |
| **Decisão:** sinalizar também toda linha em branco | Fecha essa brecha |
| Dica de prompt "compare bolhas da mesma linha" | **Piorou** (5 erros silenciosos) — descartado |
| Normalização de contraste da imagem | Não ajudou (1 erro) — descartado |

### 2.5 Arquitetura final da leitura
1. O app recorta a imagem em faixas e remove as margens vazias.
2. Nova função no servidor (`omr-reader`) lê cada faixa e devolve o nível de preenchimento (0–3) de cada bolha.
3. O app decide a resposta: **só é "limpa" se houver exatamente uma bolha bem marcada e nada suspeito**.
4. (Versão inicial: o cartão era lido 2 vezes. **Versão final:** padrão de 1 leitura, com blocos por coluna e ampliados, e 2ª leitura automática se a imagem for ruim ou se você escolher "Precisão máxima" — ver "Atualização final" acima.)
5. Em branco, dupla marcação, marca leve, leituras divergentes ou linha não lida → **"Revisar"**.

### 2.6 Teste integrado (simulado criado pelo sistema)
Feito no navegador real: criado usuário, alunos, e um simulado de 60 questões pelo próprio sistema; login; envio de 3 cartões em lote; atribuição dos alunos; correção do lote; conferência; salvamento.

| Aluno / cartão | Nota salva | Nota esperada | Sinalizadas | Erros silenciosos |
|---|---|---|---|---|
| Ana – limpo | 37/60 | 37/60 | 5 | 0 |
| Bruno – foto torta | 10/60 | 10/60 | 2 | 0 |
| Carla – lápis fraco + foto ruim | 11/60 | 11/60 | 9 | 1 (Q58) |

- Tempo: ~46 segundos para 3 cartões (2 leituras cada).
- Após conferir todas as sinalizadas de um aluno: pendências 0 e status mudou de "aguardando conferência" para "corrigido".
- O único erro silencioso: no cartão mais deteriorado, uma borracha cinza foi lida como marca e o lápis fraco real não foi visto.

### 2.7 Telas e modais
- **Bug encontrado:** o modal base tinha `sm:max-w-lg`, que **vence** classes como `max-w-4xl`. Resultado: todo modal "largo" ficava preso em 512px e o conteúdo espremia/saía do quadrado. Confirmado por dois testes. **Corrigido na raiz.**
- Selo do nome da prova ficava por cima do botão X de fechar → espaço reservado.
- Modal de nova questão: botões "Cancelar/Adicionar" ficaram abaixo da dobra ao adicionar o interruptor do banco → corrigido.
- Auditoria automática (1280×800 e 1024×700): 10 páginas sem rolagem horizontal; modais de Criar Simulado (nova seção, nova questão, banco) cabem na tela, sem botões cortados.

### 2.8 Banco de Questões no Criar/Editar Simulado
- Faixa grande preta/amarela "Banco de Questões" com botão **"Salvar todas no Banco (N)"**.
- Cada questão: botão amarelo **"Salvar no Banco"** ou selo verde **"No Banco de Questões"**.
- Modal de nova questão: interruptor **"Salvar também no Banco de Questões"** (ligado por padrão).
- Sem duplicar: questões com o mesmo enunciado já no banco são reconhecidas.

### 2.9 Novidades na tela Enviar Imagens
- **Corrigir Lote Completo com IA**: miniaturas de cada cartão, atribuição do aluno, aviso de aluno repetido, botão único.
- Falha em um cartão não trava o lote; erros aparecem em lista vermelha.
- **Conferir Correção** por aluno: foto do cartão ao lado, acertos/erros/para revisar, desempenho por matéria, cada questão clicável para corrigir, botão Confirmar, salvar.
- **Ver imagem**: miniatura em cada cartão da lista + visualizador grande (anterior/próxima, setas do teclado, tamanho real, nova aba).

## 3. Custos
- **Gasto nos testes: cerca de US$ 2** (maior parte nos experimentos da seção 2.4). Não foram rodados mais testes com IA depois que você avisou.
- **Custo daqui para frente (cartão de 60 questões, medido no cartão real):** ~US$ 0,04 com 1 leitura (padrão); ~US$ 0,09 com 2 leituras; imagens pequenas/ruins custam menos por leitura.
- Isso **substitui as estimativas anteriores** (inclusive a antiga de US$ 0,005–0,01). 400 cartões/mês ≈ US$ 16 (1 leitura). Com US$ 5 de crédito: cerca de 120 cartões no modo padrão.

## 4. Limites e o que NÃO foi testado
- Os cartões de teste foram sintéticos (gerados por computador). Fotos reais de celular podem se comportar diferente — nas primeiras provas reais, confira os cartões sinalizados.
- PDF: não dá para recortar no navegador; usa a leitura antiga e **todas** as questões vão para revisão.
- O visualizador de imagens (Ver imagem) passou na compilação mas **não foi conferido visualmente** no navegador.
- Modais das telas Séries, Turmas, Alunos, Banco de Questões, Gerenciar Simulados e Correção: a correção geral (largura/altura) vale para todos, mas **não foram inspecionados um a um** (auditoria interrompida para poupar seu crédito).
- Tamanho de celular (menos de 640px) não foi auditado.

## 5. Como usar
1. Enviar Imagens → escolha o simulado → envie os cartões (modo Lote).
2. **Corrigir Lote Completo com IA** → confira a miniatura e escolha o aluno de cada cartão → **Corrigir Todos**.
3. No resultado, abra **Conferir** dos alunos com aviso amarelo; confirme ou corrija as questões em amarelo e salve.
4. Se aparecer "imagem de baixa qualidade", confira o cartão inteiro ou envie foto/scan melhor.
5. Foto boa ajuda mais que qualquer configuração: folha plana, luz uniforme, cartão inteiro enquadrado, sem sombra.

## 6. Arquivos
- Novo: `supabase/functions/omr-reader/index.ts` (função de leitura, já publicada no Supabase)
- Novo: `src/utils/omr.ts` (recorte, leituras, consenso, sinalização)
- Alterados: `src/components/dashboard/SendImagesPage.tsx`, `CreateSimuladoPage.tsx`, `src/components/ui/dialog.tsx`, `src/utils/api.ts`
