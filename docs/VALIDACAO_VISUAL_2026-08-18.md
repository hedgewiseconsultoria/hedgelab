# Validação visual — 18/08/2026

Foram inspecionadas as rotas do dashboard em **1280 × 720** e **375 × 812** após a inclusão da interface de formação didática e dos DataFrames canônicos. A navegação lateral, os cartões empilhados, os controles de formulário e as tabelas com `overflow-x-auto` permaneceram renderizados sem erro de cliente.

| Área observada | Desktop | Mobile | Observação |
|---|---|---|---|
| Laboratório de formação | Renderizado | Renderizado em coluna única | Os campos de horizonte, meta de cobertura, quantidade e data-base permanecem identificados como cenário didático. |
| Quadro de alternativas | Renderizado | Renderizado com rolagem horizontal quando necessário | Não afirma preço, contrato ou resultado quando a sessão não os possui. |
| Quadro de resultados de sessão | Renderizado | Renderizado com rolagem horizontal quando necessário | Mantém parâmetros, método, status e linhagem por cálculo. |
| Pipeline B3 denso | Renderizado com colunas, hashes e cobertura por família | Mantém rolagem horizontal consciente quando necessário | PriceReport, DerivativesSimplifiedPriceReport e InstrumentReport de 13/08/2026 foram exibidos com 71 colunas materializadas, sem embutir preços individuais no painel. |
| Coleta DI1 em andamento | Renderizado com botão bloqueado e indicador de progresso | Mantém o mesmo bloqueio de interação | O cartão “Vértices de DI futuro publicados pela B3” exibiu o estado de carregamento durante a coleta oficial, inclusive em tentativa posterior de duração prolongada. |
| Erro de coleta DI1 | Renderizado | Pendente de nova inspeção dirigida | A B3 não respondeu ao conjunto de arquivos exigido para a data-base solicitada; o painel exibiu a mensagem de bloqueio e declarou que nenhuma curva alternativa foi estimada. |
| Comparabilidade de estratégias | Renderizado | Renderizado em coluna; tabelas preservam rolagem horizontal | O quadro separa sem hedge, futuro e cobertura parcial de exercícios intrínsecos de opções, sem equivalência automática de métricas. |

| Estado de sessão vazio | Renderizado | Renderizado em coluna única | Não há exposições ou cálculos fictícios; os cartões e os controles mantêm hierarquia e alcance por teclado. |
| Fonte indisponível | Renderizado | Renderizado | A ausência de PTAX para a data consultada é exibida como indisponibilidade de fonte, sem taxa alternativa ou cálculo derivado. |

## Checklist de evidências por componente e viewport

| Estado requerido | Componente / área | Evidência desktop — 1280 × 720 | Evidência mobile — 375 × 812 | Critério de aceite |
|---|---|---|---|---|
| Vazio | Resumo consolidado e DataFrames de sessão | “Sem exposição” e “Nenhuma linha restaurada” renderizados sem posição fictícia | Mesmas mensagens renderizadas em coluna única | Não há cálculo, preço ou exposição inventados. |
| Erro de fonte | Cartão PTAX / USD | “Sem cotação para a data solicitada” exibido após resposta real da fonte | A mesma mensagem foi exibida no cartão compacto | O estado informa indisponibilidade e não calcula taxa substituta. |
| Carregamento | Vértices de DI futuro publicados pela B3 | Botão bloqueado, ícone de progresso e texto de processamento renderizados | Layout de coluna e bloqueio de interação preservados | Não há reentrada enquanto a coleta oficial está pendente. |
| Dados densos | Pipeline B3 e cartões de evidência | Manifesto alinhado exibe 71 colunas, arquivos e hashes | Tabelas mantêm rolagem horizontal intencional | Linhagem e hashes permanecem legíveis; preços individuais não são embutidos. |
| Erro específico de coleta | Vértices de DI futuro publicados pela B3 | Mensagem de bloqueio observada quando os arquivos B3 exigidos não responderam | Coberto por teste de componente; nova execução móvel só é necessária para isolar esse subtipo de falha | Nenhuma curva alternativa, interpolação ou taxa substituta é produzida. |

> O checklist separa **estado de erro do dashboard**, já evidenciado por PTAX nos dois viewports, de **erro específico de coleta DI1**, cuja apresentação desktop foi observada e cujo comportamento de componente é testado automaticamente. Essa distinção evita declarar que uma falha de fonte equivale a uma curva DI alternativa ou a dados de mercado simulados.

> A inspeção recente confirma o estado-base vazio, a indisponibilidade real de PTAX, o carregamento de coleta DI1 e o painel B3 densamente populado em **1280 × 720** e **375 × 812**. A mensagem “Sem cotação para a data solicitada” foi exibida nos dois viewports pelo cartão PTAX, enquanto um erro real de coleta DI1 também foi observado em desktop com bloqueio explícito de curva alternativa. Os cartões de ajuste diário DOL/WDO, de liquidação intrínseca de opção DOL e de dimensionamento físico de commodities permanecem empilhados e legíveis no estado vazio; não recebem valores fictícios. Tabelas auditáveis extensas exigem rolagem horizontal em telas móveis por opção consciente de legibilidade.

## Reinspeção de runtime — 19/08/2026

| Verificação | Evidência observada | Resultado |
|---|---|---|
| Runtime da prévia | Navegação integral pela rota raiz e consulta ao console do navegador após reinício do servidor | Não houve erro atual no console; avisos antigos de módulos não reproduziram no runtime corrente. |
| Mobile 375 × 812 | Captura do primeiro viewport e captura integral da página na sessão inicial | Cabeçalho, hero, ações de pacote e cartões seguem em coluna única; o cartão PTAX permanece sem cotação, sem taxa substituta nem dado simulado. |

## Evidência dirigida DI1 — 19/08/2026

| Estado | Viewport | Evidência observada | Resultado |
|---|---|---|---|
| Carregamento DI1 | Desktop | Ação real de “Coletar vértices DI1” na data-base 13/08/2026; o botão ficou desabilitado, com ícone de progresso, enquanto o campo de data-base também permaneceu bloqueado. Captura: `2026-08-19_02-00-47`. | Confirmado sem confundir o estado com a indisponibilidade PTAX. A resposta de fonte ainda estava em processamento no momento da captura. |
| Erro de coleta DI1 | Desktop | Após o limite de 60.000 ms, o botão foi reabilitado e o cartão apresentou “A B3 não respondeu em 60000 ms ao solicitar IN260813.zip”, seguido da afirmação de que nenhuma curva alternativa foi estimada. Captura: `2026-08-19_02-02-07`. | Confirmado: o timeout encerra o carregamento e separa este bloqueio da indisponibilidade PTAX. |
| Pipeline B3 denso | Mobile 375 × 812 | Captura integral atual da rota raiz, com o painel do pipeline, colunas de DataFrame, famílias, arquivos e hashes no layout estreito. | Confirmado: cartões se empilham; tabelas extensas mantêm a rolagem horizontal intencional, sem comprimir ou inventar cotações. |
| Watchdog DI1 | Desktop | Após 65 segundos de coleta pendente, o botão passou a “Tentar novamente”, a data-base foi reabilitada e a mensagem local explicou que nenhum dado alternativo foi estimado. Captura: `2026-08-19_02-31-48`. | Confirmado: o watchdog diferencia indisponibilidade local de resposta do erro oficial B3 e não mantém o formulário bloqueado. |

> Na reinspeção seguinte, o cartão voltou a exibir “Coletar vértices DI1” após recarregamento da sessão; o painel preservou a sessão vazia, a indisponibilidade PTAX e as fontes IBGE/ANBIMA já carregadas. A captura do erro oficial B3 no runtime continua pendente porque o gateway não a propagou durante a observação.

> Atualização: a coleta seguinte exibiu o erro oficial no desktop após a solicitação de `IN260813.zip`: “A B3 não respondeu em 60000 ms”. O cartão manteve o botão e a data-base utilizáveis. Esse estado é distinto tanto do aviso de timeout local quanto do cartão PTAX sem cotação.

> **Evidência móvel recebida em 19/08/2026:** `Screenshot_20260819-003921_Chrome.webp` registra o cartão DI1 no navegador móvel. A data-base `13/08/2026` e o botão “Coletar vértices DI1” permanecem visíveis e utilizáveis; abaixo, o aviso informa: “A B3 não respondeu em 60000 ms ao solicitar IN260813.zip.” O mesmo painel declara explicitamente que nenhuma curva alternativa foi estimada. A captura é distinta do cartão de coleta PTAX imediatamente abaixo e comprova a mensagem DI1 em mobile; a auditoria desktop independente permanece pendente.

> **Reinspeção desktop em 19/08/2026, 03:44:** após 65 segundos, o navegador exibiu “A coleta DI1 excedeu 65 segundos no cliente. Os controles foram liberados; nenhuma curva alternativa foi estimada.” O botão passou a “Tentar novamente” e o campo de data-base ficou reabilitado. Esta captura confirma o timeout local e sua diferença operacional para a mensagem oficial B3 presente na evidência móvel.

> **Reinspeção desktop em 19/08/2026, 03:50:** o limite do servidor DI1 foi definido em 45 segundos, abaixo do watchdog de 65 segundos do cliente. A captura `3000-ibswhlmpurs5goo_2026-08-19_03-50-27_2641.webp` registra o aviso oficial completo: “A B3 não respondeu ou o conjunto não pôde ser validado para a data-base informada. Nenhuma curva alternativa foi estimada. A B3 não respondeu em 45000 ms ao solicitar IN260813.zip.” O botão retornou a “Coletar vértices DI1” e a data-base permaneceu habilitada. Esta evidência conclui a diferenciação desktop entre o timeout local e o erro oficial B3.

> **Integridade da captura desktop:** SHA-256 `da61f2435eef9ef41147c31a0364dfa85f358414e5df0d27de9ab12c0aef5d8e`, calculado sobre `3000-ibswhlmpurs5goo_2026-08-19_03-50-27_2641.webp` imediatamente após a observação no navegador.

> **Artefato verificável:** cópia imutável da captura preservada no armazenamento estático do projeto em [`/manus-storage/di1-erro-oficial-desktop-2026-08-19_da04bd58.webp`](/manus-storage/di1-erro-oficial-desktop-2026-08-19_da04bd58.webp). O artefato possui 146.372 bytes e a mesma impressão SHA-256 acima.

> **Transcrição conferida na imagem preservada:** no cartão “Vértices de DI futuro publicados pela B3”, o aviso amarelo declara: “A B3 não respondeu ou o conjunto não pôde ser validado para a data-base informada. Nenhuma curva alternativa foi estimada. A B3 não respondeu em 45000 ms ao solicitar IN260813.zip.” A mesma imagem mostra o campo de data-base e o botão “Coletar vértices DI1” habilitados. Portanto, trata-se do erro oficial de coleta e não do watchdog local nem do cartão PTAX logo abaixo.

> A reinspeção revelou uma conexão B3 que entregou cabeçalhos e não concluiu o corpo do arquivo. O timeout do downloader foi então estendido até o término de `arrayBuffer()`, com teste isolado para corpo pendente; assim, a interface recebe erro explícito em vez de permanecer em carregamento indefinidamente. Nenhum conteúdo de mercado é gerado nesse bloqueio.

| Reinspeção de cartões recentes | Mobile 375 × 812 | Captura integral após os cartões de IPCA por número-índice e fator over SGS 11. | A hierarquia permanece vertical; tabelas de evidência mantêm rolagem horizontal. A inspeção DI1 móvel foi concluída no modo visual de desenvolvimento descrito abaixo, sem mutation nem dados de mercado. |

## Fechamento da inspeção responsiva — 19/08/2026

| Estado / área | Desktop — 1280 × 720 | Mobile — 375 × 812 | Limite preservado |
|---|---|---|---|
| Pipeline B3 denso | Captura integral da rota raiz com o manifesto real alinhado de 13/08/2026, os três arquivos B3, hashes, cobertura por família e as 71 colunas materializadas. | Captura integral da mesma rota confirma a pilha vertical dos cartões e a permanência da rolagem horizontal para as tabelas densas. | O painel exibe somente metadados, linhagem e cobertura dos arquivos reais; não embute preço individual nem gera curva. |
| Carregamento DI1 | Ação real de coleta registrou botão e data-base bloqueados, ícone de progresso e ausência de curva durante a requisição oficial. | Captura em `/?visual=di1-loading` confirma o mesmo layout estreito com os controles bloqueados. Esse modo está condicionado a desenvolvimento e não dispara mutação, não cria payload nem introduz observação simulada. | A inspeção visual usa somente o estado de interface. A coleta B3 continua exclusiva da ação real e os testes confirmam que o modo de inspeção não chama a mutation. |

> A inspeção do modo móvel foi confirmada por evidência DOM: `data-visual-state="loading"`, botão “Coletar vértices DI1” desabilitado, campo `di-curve-asof` desabilitado e ausência de tabela de curva. O teste de componente correspondente também confirma que nenhuma mutation é iniciada.
