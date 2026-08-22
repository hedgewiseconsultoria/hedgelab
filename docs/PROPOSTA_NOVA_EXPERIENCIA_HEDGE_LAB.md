# Proposta de Nova Experiência — HEDGE LAB

**Objetivo:** transformar o HEDGE LAB de um conjunto de módulos técnicos em uma ferramenta de trabalho e ensino para o consultor de hedge e para as equipes treinadas por ele.

## 1. Diagnóstico da experiência atual

O produto atual mistura, na mesma jornada, quatro coisas que têm propósitos diferentes: declaração do problema econômico da empresa, recuperação de fontes externas, experimentos didáticos e cálculos quantitativos auditáveis. Isso exige que o usuário saiba antecipadamente qual tela abrir, qual dado é necessário e qual resultado pode ser considerado utilizável. Para um consultor, essa estrutura aumenta o tempo de preparação; para um aluno ou executivo, ela dificulta entender o que fazer primeiro e o que uma mensagem de indisponibilidade realmente significa.

> A nova experiência deve começar pela pergunta de negócio — **“qual resultado da empresa está em risco?”** — e não pela pergunta de infraestrutura — **“qual arquivo de mercado está disponível?”**.

## 2. Princípios de produto

| Princípio | Decisão de experiência |
|---|---|
| Começar pelo negócio | Toda jornada parte de receita, despesa, dívida ou estoque físico. |
| Uma decisão por tela | A pessoa não precisa escolher contrato, fonte e modelo ao mesmo tempo. |
| Fonte não é cálculo | Dados oficiais, hipóteses de treinamento e resultados calculados recebem etiquetas e áreas visuais distintas. |
| Nenhuma falsa precisão | Quando um insumo oficial não estiver disponível, o app explica o bloqueio e oferece o próximo passo permitido. |
| Ensino incorporado ao fluxo | Cada decisão mostra o “por quê”, a lógica econômica e o limite técnico, sem transformar a tela em manual. |
| Profundidade sob demanda | O usuário operacional vê um resumo; o consultor abre evidências, hashes, arquivos e DataFrames somente quando necessário. |

## 3. Nova navegação principal

A barra lateral deve deixar de representar a estrutura técnica interna. A proposta é organizar o produto em seis áreas, nesta ordem:

| Área | Pergunta que responde | Público principal |
|---|---|---|
| **Início** | O que precisa da minha atenção agora? | Executivo, consultor e aluno |
| **Empresas e exposições** | Qual risco econômico vamos proteger? | Consultor e equipe financeira |
| **Alternativas de hedge** | Quais instrumentos podem proteger esta exposição e o que falta validar? | Consultor |
| **Simular e comparar** | Como a exposição e a cobertura reagem em cenários? | Consultor e aluno |
| **Relatório executivo** | O que deve ser apresentado ou decidido? | Executivo e comitê |
| **Base técnica** | Quais fontes, arquivos, DataFrames e evidências sustentam a análise? | Consultor avançado e auditoria |

**DataFrames**, arquivos B3, hashes, coleta e relatórios de normalização deixam de ser itens de primeiro nível. Eles passam para **Base técnica**, acessível quando a análise exigir verificação.

## 4. Tela inicial proposta: Central do consultor

A primeira tela não apresentará curvas, contratos ou botões de exportação. Ela mostrará uma central de trabalho com três blocos.

| Bloco | Conteúdo | Ação principal |
|---|---|---|
| **Carteira de riscos** | Quantidade de exposições abertas por USD, CDI, boi, milho, soja e outros fatores. | “Abrir empresa” ou “Criar exposição”. |
| **Estado da análise** | Quantas exposições estão prontas para simular, aguardam dado, aguardam contrato ou têm resultado disponível. | “Ver pendências”. |
| **Fontes oficiais** | Um resumo discreto: disponível, em atualização, indisponível ou bloqueada. | “Ver evidências”, apenas para quem precisa. |

O destaque da tela deve ser uma chamada simples: **“Qual empresa ou risco você deseja analisar?”**.

## 5. Jornada guiada por caso empresarial

O usuário escolhe um caso e segue um fluxo de cinco etapas. A aplicação mantém o contexto da empresa durante toda a jornada. A regra central é: **a exposição vem primeiro; as alternativas compatíveis aparecem imediatamente depois; a escolha de estratégia, o dimensionamento e o cenário vêm somente em seguida.**

### Etapa 1 — Entender a exposição

Em vez de pedir logo um derivativo, o app pergunta: “a empresa paga ou recebe em moeda estrangeira?”, “possui dívida indexada ao CDI?”, “compra ou vende commodity?”. Os casos iniciais seriam:

| Caso | Informações pedidas | Fator econômico apresentado |
|---|---|---|
| Importador | Valor em USD, data prevista do pagamento, moeda funcional. | Alta de USD/BRL. |
| Exportador | Receita em USD, data prevista de recebimento. | Queda de USD/BRL. |
| Dívida pós-fixada | Saldo, vencimento, indexador CDI e spread declarado. | Alta do CDI. |
| Compra de commodity | Quantidade, unidade, período de compra e produto. | Alta do preço físico. |
| Venda de commodity | Quantidade, unidade, período de venda e produto. | Queda do preço físico. |

Ao final, o sistema produz uma frase de negócio, por exemplo: **“A empresa está exposta à alta do dólar para um pagamento de USD 750 mil em 21/10/2026.”** O usuário deve confirmar essa frase antes de avançar.

### Etapa 2 — Alternativas de hedge declaradas automaticamente

Assim que a exposição for confirmada, o sistema declara as alternativas economicamente compatíveis. Não é uma recomendação nem uma seleção automática de contrato: é um **mapa explícito do que pode ser estudado** para aquele risco.

| Exposição declarada | Alternativas apresentadas pelo app | Situação que deve aparecer |
|---|---|---|
| Pagamento em USD | DOL, WDO, NDF/termo, opção de compra de USD e swap cambial. | Elegível, exige contrato bilateral ou aguarda observação B3. |
| Recebimento em USD | DOL, WDO, NDF/termo, opção de venda de USD e swap cambial. | Elegível, exige contrato bilateral ou aguarda observação B3. |
| Dívida CDI | DI1, FRA, swap de taxa e estruturas bilaterais de taxa. | Elegível apenas com curva/contrato validado; bloqueio explícito quando faltar insumo. |
| Compra de boi/milho/soja | Futuro e opção da commodity correspondente. | Elegível conforme unidade, contrato e observação B3. |
| Venda de boi/milho/soja | Futuro e opção da commodity correspondente. | Elegível conforme unidade, contrato e observação B3. |

Cada alternativa aparece com quatro informações: **relação econômica com a exposição**, **sentido de proteção**, **dados/documentos necessários** e **estado atual de utilização**. Assim, a primeira devolutiva do aplicativo para uma exposição não é uma curva nem um formulário técnico: é uma resposta direta à pergunta **“quais caminhos de hedge existem para este risco?”**.

### Etapa 3 — Definir o objetivo de proteção

O usuário escolhe um objetivo claro, como “reduzir a incerteza do custo”, “fixar uma taxa”, “proteger 70% do fluxo” ou “preservar participação em uma queda favorável”. O app pede somente o percentual desejado e o horizonte.

Essa etapa separa intenção econômica de instrumento. O software não deve sugerir que uma cobertura de 100% é sempre correta; deve registrar a meta declarada.

### Etapa 4 — Escolher uma alternativa e ver a evidência de mercado

As alternativas aparecem em cartões de linguagem executiva, e não como siglas isoladas. Um pagamento em USD, por exemplo, exibiria: **futuro de dólar**, **mini futuro**, **NDF/termo**, **opção de compra** e **swap cambial**, cada um com:

1. Quando costuma ser usado;
2. O que protege e o que não protege;
3. Quais dados ou documentos faltam;
4. Situação atual: **pronto para dimensionar**, **aguardando dado oficial** ou **exige contrato bilateral**.

O usuário escolhe uma ou mais alternativas para estudar; o app não apresenta uma “recomendação automática”. Ao selecionar uma alternativa listada em bolsa, a tela abre um painel visual de **evidência B3**.

| Alternativa selecionada | Evidência visual exibida | O que a curva comunica |
|---|---|---|
| DI1 ou FRA | Curva de futuros DI por vencimento, construída apenas com vértices B3 validados. | Níveis observados por vencimento e lacunas de dados; não projeta vértices ausentes. |
| DOL ou WDO | Série/estrutura de vencimentos de contratos disponíveis na data-base B3. | Preços observados e vencimentos recuperados; não cria uma previsão cambial. |
| BGI, CCM, SOY ou SJC | Estrutura de vencimentos e preços de ajuste observados para a família selecionada. | Contratos e referências disponíveis para o horizonte da exposição. |
| Opção B3 | Relação entre série de opção, futuro-objeto e a observação selecionada. | Evidência contratual e de liquidação; não exibe prêmio ou Greeks sem dados válidos. |

A curva deve ficar no contexto da alternativa escolhida, com título simples como **“Curva DI observada na B3 — data-base DD/MM/AAAA”**. Ao lado dela, uma frase curta informa o que está sendo mostrado e o que o gráfico **não** representa. Arquivo, hash, layout e DataFrame serão acessíveis pelo comando **“Ver evidências técnicas”**.

### Etapa 5 — Simular e comparar

Esta tela deve começar com um seletor explícito de modo:

| Modo | O que contém | Identidade visual |
|---|---|---|
| **Cenário de treinamento** | Hipóteses declaradas em aula, como preço inicial, preço final e quantidade. | Azul discreto e etiqueta “hipótese didática”. |
| **Cenário com dados oficiais** | Apenas observações B3/BCB/IBGE/ANBIMA/FGV que passaram nas validações aplicáveis. | Verde e etiqueta com fonte/data-base. |
| **Bloqueado** | Cálculo que exige curva, contrato, preço, volatilidade ou convenção ainda não validados. | Cinza/âmbar, com explicação e próximo passo. |

O resultado deve responder três perguntas, em linguagem simples: “o que acontece sem hedge?”, “o que acontece com esta cobertura?” e “qual risco residual permanece?”. A memória de cálculo e a linhagem ficam em um painel “Ver evidências”.

### Etapa 6 — Decidir, reportar e acompanhar

O fechamento mostra uma página de decisão: exposição, objetivo, alternativas selecionadas, cenário, cobertura obtida, risco residual, limitações e pendências. Dela saem o relatório PDF auditável e o pacote da sessão.

## 6. Tratamento correto da B3 e das demais fontes

As fontes devem ser um **serviço de apoio silencioso**, não o centro da interface. A tela inicial mostra apenas o estado resumido; a tela de análise mostra a curva e a fonte necessária somente quando a alternativa escolhida depende dela.

| Estado | Comunicação ao usuário | Comportamento do app |
|---|---|---|
| Disponível | “Dados B3 validados em DD/MM/AAAA.” | Libera os cálculos que dependem daquela evidência. |
| Em atualização | “Verificando arquivos oficiais; você pode continuar preenchendo a exposição.” | Não bloqueia o cadastro. |
| Indisponível | “A fonte oficial não devolveu um arquivo utilizável nesta tentativa.” | Não cria valor substituto e apresenta ação “tentar novamente”. |
| Não necessário | “Este caso não exige dado B3 nesta etapa.” | Não exibe alerta nem botão técnico. |

A área **Base técnica** mantém o controle completo: boletim, data-base, hash, arquivo, layout, colunas, DataFrame e logs. Ela não deve aparecer como requisito para iniciar uma análise empresarial.

## 7. Papéis de uso sem criar autenticação

Sem implementar controle de usuário, a interface pode oferecer dois níveis de densidade por meio de um seletor local:

| Visão | Conteúdo exibido |
|---|---|
| **Orientada** | Linguagem de negócio, perguntas guiadas, cartões de alternativas, alertas e relatório executivo. |
| **Consultor** | Acrescenta contratos, famílias B3, referências de arquivo, hashes, DataFrames, políticas e memória de cálculo. |

O seletor não concede permissões nem altera os dados; apenas reduz ou amplia a informação visível. Para um curso, o instrutor pode começar na visão orientada e abrir a visão consultor no momento didático adequado.

## 8. O que deixaria de aparecer imediatamente

Os seguintes elementos não devem aparecer no primeiro contato nem em tela de cadastro: curva DI, vértices DI1, DataFrames, hashes, escolha de XML, arquivo BVBG, tipologia de normalização, exportação Parquet, parâmetros de VaR e cálculos bloqueados que não tenham relação com o caso escolhido. Eles continuam disponíveis, porém progressivamente revelados.

## 9. Sequência de implementação proposta — somente após aprovação

| Prioridade | Entrega |
|---|---|
| 1 | Nova navegação, Central do consultor e separação entre área operacional e Base técnica. |
| 2 | Novo fluxo de exposição e objetivo de proteção, com frase de confirmação econômica. |
| 3 | Catálogo de alternativas em linguagem executiva e status por requisito. |
| 4 | Tela de simulação com separação visual entre hipótese didática, dado oficial e bloqueio. |
| 5 | Página de decisão e relatório executivo; evidências detalhadas sob demanda. |
| 6 | Revisão de todos os textos, vazios, erros e estados de fonte. |

## 10. Decisão solicitada

> Proponho aprovar esta direção: **o HEDGE LAB passa a ser uma ferramenta de condução de casos empresariais de hedge, e não um painel de infraestrutura de mercado.**

> Se aprovada, a próxima etapa será transformar esta arquitetura em telas e fluxos, preservando a regra de que nenhum dado oficial ausente será inventado e nenhum cálculo bloqueado será apresentado como resultado válido.
