# HEDGE LAB — Registro de Fontes Oficiais e Convenções Confirmadas

**Data da verificação:** 17 de agosto de 2026, GMT-3.  
**Regra de uso:** esta matriz registra somente fatos observados nas páginas oficiais consultadas. Um campo ausente ou uma convenção não citada permanece indisponível no produto até validação posterior.

## 1. Catálogo de fontes autorizadas

| Identificador interno | Instituição | Domínio econômico | Meio oficialmente verificado | Condição de uso no HEDGE LAB |
|---|---|---|---|---|
| `BCB_PTAX` | Banco Central do Brasil | Cotações e boletins de câmbio | Serviço PTAX com recursos OData documentados pelo BCB. [1] | Permitido para a camada de câmbio de referência; o coletor escolherá apenas recursos e parâmetros confirmados pela documentação vigente. |
| `B3_PUBLIC_FILES` | B3 | Instrumentos, boletins de negociação, derivativos, opções e cenários | Página de pesquisa por pregão e catálogo de layouts de arquivos. [2] [3] | Permitido. A coleta será implementada somente após validar o mecanismo de download e inspecionar um arquivo efetivamente recebido. |
| `ANBIMA_ETTJ` | ANBIMA | Estrutura a termo e referências de curva | Página pública de estrutura a termo; o conteúdo identifica a unidade de curva como percentual ao ano em base 252 dias úteis. [4] | Permitido para vértices e curvas publicamente acessíveis. A forma de download será verificada antes de automatização. |
| `IBGE_IPCA` | IBGE | IPCA e metadados de inflação | Portal do IPCA, séries históricas e API de agregados que alimenta o SIDRA. [5] [6] | Permitido para IPCA. O agregador, a variável e a unidade serão descobertos pelos metadados no momento da coleta; não serão fixados por suposição. |
| `FGV_IGPM` | FGV IBRE | IGP-M | Página institucional do IGP e publicações de resultados do IGP-M. [7] [8] | **Exceção autorizada pelo usuário, exclusivamente para IGP-M.** O registro da extração deve declarar a origem FGV IBRE e essa exceção deve aparecer na interface e no relatório. |

## 2. B3: arquivos, contratos e implicações de implementação

A B3 lista os arquivos **BVBG.187.01** como *Derivatives Simplified Price Report*, **BVBG.086.01** como *Pricing Report* e **BVBG.028.02** como *InstrumentReport* em seu catálogo de layouts. [2] A página de pesquisa por pregão também disponibiliza esses três itens entre os arquivos da clearing. [3] Portanto, eles serão tratados como fontes potenciais distintas: instrumentos não serão deduzidos do boletim de preço, e preço não será deduzido do cadastro de instrumento.

Na página oficial de pesquisa por pregão, a seleção do `BVBG.028.02` corresponde a `IN{YYMMDD}.zip`, a do `BVBG.086.01` a `PR{YYMMDD}.zip` e a do `BVBG.187.01` a `SPRD{YYMMDD}.zip`. A página mantém campos de data separados para cada arquivo e aplica a conversão de data exibida `DD/MM/AAAA` para o trecho `AAMMDD` do nome de arquivo.

Uma inspeção do JavaScript entregue pela própria página identificou o fluxo efetivo: a função `downloadFiles` agrega os nomes selecionados e abre `g_LumisRootPath + "pesquisapregao/download?filelist=" + filelist`. No HTML publicado, `g_LumisRootPath` corresponde à raiz do domínio B3. Portanto, para 14/08/2026, os nomes observados são `PR260814.zip` e `SPRD260814.zip`, e o endpoint publicado é `https://www.b3.com.br/pesquisapregao/download?filelist=...`. Esse endpoint é uma evidência do fluxo da página, não uma API de mercado independente.

| Boletim | Checkbox/identificador observado | Nome de arquivo parametrizado | Atualização exibida pela B3 durante a verificação |
|---|---|---|---|
| BVBG.086.01 — PriceReport | `8AA8D0975C8A570C015C8E080B9D3700` | `PR{YYMMDD}.zip` | 14/08/2026 20:39 |
| BVBG.187.01 — DerivativesSimplifiedPriceReport | `8AE490C87D04F52B017D2B4585693782` | `SPRD{YYMMDD}.zip` | 14/08/2026 20:36 |
| BVBG.028.02 — InstrumentReport | `8AA8D0975C8A570C015C8E0933F74222` | `IN{YYMMDD}.zip` | 17/08/2026 00:23 |

O catálogo oficial de layouts aponta o mesmo PDF `Catalogo_precos_v1.3.pdf` para BVBG.086.01, BVBG.187.01, BVBG.186.01 e BVBG.087.01. O catálogo de cadastro de instrumentos é um documento separado para BVBG.028.02. A recuperação e a comparação de cada arquivo real permanecem requisitos obrigatórios antes de qualquer parser de preço.

### Extrações reais validadas — PriceReport e DerivativesSimplifiedPriceReport

| Atributo | BVBG.086.01 — PriceReport | BVBG.187.01 — DerivativesSimplifiedPriceReport |
|---|---|---|
| Data selecionada no fluxo oficial | 14/08/2026 | 14/08/2026 |
| Endpoint observado | `https://www.b3.com.br/pesquisapregao/download?filelist=PR260814.zip,` | `https://www.b3.com.br/pesquisapregao/download?filelist=SPRD260814.zip,` |
| Pacote externo recebido | `PR260814_download.zip` — 13 MB | `SPRD260814_download.zip` — 131 KB |
| SHA-256 do pacote externo | `a9a7348188b02e12650847ac83ea7ab5dd44bba930cd5d3d7ed5fc8306b99d86` | `f8addca2f465495759c0027bc50537e5253318f71dda2913c7db53a22540dc69` |
| ZIP interno | `PR260814.zip` | `SPRD260814.zip` |
| XMLs internos recebidos | 4 arquivos `BVBG.086.01` entre 156.066.731 e 156.121.582 bytes | 2 arquivos `BVBG.187.01` entre 4.674.326 e 4.674.330 bytes |
| Data de negociação no XML | `2026-08-14` | `2026-08-14` |
| Quantidade total no cabeçalho do primeiro XML | 68.272 mensagens | 2.241 mensagens |
| Tipo e mensagem no cabeçalho | `BVBG.086.01` / `BVMF.217.01` | `BVBG.187.01` / `BVMF.217.01` |

Os XMLs reais usam o envelope `urn:bvmf.052.01.xsd` e documentos internos `urn:bvmf.217.01.xsd`. O catálogo oficial de preços recuperado possui SHA-256 `2ebdea0162594b64f0cb00dd4b85bb3818b04ca039985e40215c91d439f7d850` e documenta ambos os boletins sob a mensagem `PriceReport` (`bvmf.217.01`). O catálogo descreve `TradDt/Dt`, `SctyId/TckrSymb`, `FinInstrmId/OthrId/Id`, `FinInstrmId/PlcOfListg/MktIdrCd`, `TradDtls/TradQty` e `FinInstrmAttrbts` com campos de preço, quantidade, ajuste e limites.

Os registros reais confirmam que a presença dos campos varia por instrumento. Em `DI1Z28`, por exemplo, foram observados preço inicial, mínimo, máximo, médio, último, contratos em aberto, quantidade negociada, `AdjstdQt`, `AdjstdQtTax`, ajustes anteriores, oscilação, variação em pontos, valor do ajuste por contrato e limites. Já uma opção `WDOZ26C005250` apresentou `TradDtls` vazio e somente limites de negociação no registro verificado. O parser deverá representar ausência como ausência, sem preencher preço ou ajuste por aproximação.

### Extração real validada — BVBG.028.02

| Atributo | Evidência observada |
|---|---|
| Fonte | Página pública de pesquisa por pregão da B3. [3] |
| Arquivo externo recebido | `pesquisa-pregao.zip` |
| Arquivo interno | `IN260817.zip` |
| Artefato de instrumentos | `BVBG.028.02_BV000327202608170327109521301524041.xml` |
| Data de referência no conteúdo | `2026-08-17` |
| Tamanho do XML | 712.818.456 bytes |
| SHA-256 do XML | `a4fbe2209d42f7b582dfa6f638bacbd194e5e5ab1c441e7b379ab69394af8c60` |
| Estrutura de topo observada | Documento XML com namespace externo `urn:bvmf.052.01.xsd` e grupos de negócio contendo documentos `urn:bvmf.100.02.xsd`. |

O conteúdo recuperado contém registros de instrumentos reais. Um registro `DI1F41` observado possui ativo `DI1`, data de expiração `2041-01-02`, base `252`, moeda de negociação `BRL`, ISIN e identificador de instrumento subjacente. Um registro de opção de dólar observado possui ativo `DOL`, ticker `DOLJ27P006950`, tipo `PUTT`, estilo `EURO`, preço de exercício, data de expiração, multiplicador de contrato, quantidade de cotação e identificador de subjacente. Esses campos serão mapeados somente após o parser confirmar o tipo de instrumento de cada bloco.

> A extração acima valida a recuperação real do cadastro de instrumentos. Ela **não** valida ainda os arquivos de preços BVBG.086.01 ou BVBG.187.01, nem autoriza cálculo de preços, PU, ajuste ou risco residual antes de suas extrações e respectivas inspeções.

| Instrumento | Fato oficialmente confirmado | Aplicação controlada |
|---|---|---|
| DOL | Código `DOL`; tamanho de contrato de USD 50.000; cotação em BRL por USD 1.000; variação mínima de BRL 0,5 por USD 1.000; vencimento no primeiro dia útil do mês; liquidação financeira. [9] | O dimensionador só usa este multiplicador quando o registro de instrumento e a especificação aplicável forem consistentes. |
| WDO | Código `WDO`; tamanho de contrato de USD 10.000; cotação em BRL por USD 1.000; variação mínima de BRL 0,50 por USD 1.000; vencimento no primeiro dia útil do mês; liquidação financeira. [10] | O dimensionador usará a especificação própria do WDO e não derivará seus atributos de DOL. |
| DI1 | Subjacente é a acumulação da Taxa DI no intervalo descrito pela B3; valor nocional de R$ 100.000 no vencimento; PU desconta os R$ 100.000 pela taxa negociada; cotação em taxa efetiva anual, base 252 dias úteis; liquidação financeira. [11] | O módulo DI armazenará taxa, PU, data-base, data de vencimento, contagem de dias úteis e versão da fórmula como campos explícitos. A fórmula concreta de PU/DV01 será implementada somente após validar o manual de apreçamento referido pela B3. |

> A B3 informa que o preço de ajuste do Futuro de DI é calculado por metodologia VWAP em uma janela de 10 minutos, mas isso não é uma licença para reproduzir internamente seu método sem consultar o manual indicado pela própria B3. [11]

## 3. Câmbio, inflação e curva

O BCB documenta o serviço PTAX com recursos para cotação de dólar e de moedas por data ou período e prevê retornos em JSON, XML, CSV ou HTML. [1] A página oficial informa o endereço-base OData e identifica os recursos `Moedas`, `CotacaoDolarDia`, `CotacaoDolarPeriodo`, `CotacaoMoedaDia` e `CotacaoMoedaPeriodo`. O HEDGE LAB preservará tanto a data-base econômica quanto o instante técnico de extração. A taxa PTAX será identificada no modelo pelo recurso oficial utilizado, em vez de ser confundida com cotação de futuro, preço de ajuste ou taxa de contrato.

Para `CotacaoDolarDia`, a documentação especifica o parâmetro `dataCotacao` no padrão `MM-DD-AAAA` e os campos `cotacaoCompra`, `cotacaoVenda` e `dataHoraCotacao`. Para cotações de uma moeda em data específica, a documentação especifica `moeda` com três letras e o mesmo padrão de data, além de `paridadeCompra`, `paridadeVenda`, `cotacaoCompra`, `cotacaoVenda`, `dataHoraCotacao` e `tipoBoletim`. O conector implementará esses nomes e não converterá automaticamente uma paridade em cotação. [1]

Uma chamada real ao recurso `CotacaoDolarDia`, para a data `08-14-2026`, retornou HTTP 200 em JSON com a propriedade `value` e os campos `cotacaoCompra`, `cotacaoVenda` e `dataHoraCotacao`. A resposta demonstrou que o formato e os parâmetros documentados são operacionalmente recuperáveis; os valores retornados serão tratados como observações pontuais, com data-base e carimbo técnico de extração, e não como série persistida.

O IBGE descreve o IPCA como índice mensal e disponibiliza séries históricas e resultados no SIDRA; sua API declara que a consulta se estrutura por agregados, períodos, variáveis, localidades e classificações. [5] [6] Por isso, o conector IBGE começará pela leitura de metadados do agregado escolhido e validará a unidade retornada antes de persistir observações.

A página institucional do IBGE identifica a **tabela 1737** do SIDRA como a série histórica de números-índice do IPCA. A página da tabela descreve seis variáveis: número-índice, variação mensal, variações acumuladas em 3 e 6 meses, no ano e em 12 meses. A coleta inicial será limitada à tabela 1737, Brasil, e exigirá que a variável e a unidade recebidas sejam preservadas no DataFrame. [15] [16]

Uma consulta real aos metadados do agregado `1737` retornou que a periodicidade é mensal, o período disponível termina em `202607` e as variáveis incluem: `2266` (número-índice, unidade número-índice), `63` (variação mensal, `%`), `2263` (acumulada em 3 meses, `%`), `2264` (acumulada em 6 meses, `%`), `69` (acumulada no ano, `%`) e `2265` (acumulada em 12 meses, `%`). Esses identificadores só serão usados com os respectivos nomes e unidades retornados pela própria resposta de metadados.

Uma consulta real da variável `63` para o período `202607` e a localidade `N1[all]` retornou HTTP 200. O corpo contém o identificador da variável, seu nome e unidade, além da estrutura `resultados → series → localidade → serie`, onde o período `202607` é associado ao valor textual `0.07` para Brasil. O parser do HEDGE LAB validará essa estrutura e converterá valores somente quando o conteúdo for numérico; símbolos de indisponibilidade permanecerão como ausência de dado.

Na página pública da ANBIMA consultada, a estrutura a termo apresenta a tabela como `ETTJ / Inflação Implícita (IPCA) (%a.a./252)` e solicita o uso de todas as casas decimais disponíveis nos downloads. [4] O HEDGE LAB manterá a precisão de origem e só arredondará na apresentação.

Uma consulta real à página pública da ANBIMA retornou uma data de referência, parâmetros para `PREFIXADOS` e `IPCA`, e uma tabela com vértices, `ETTJ IPCA`, `ETTJ PRE` e inflação implícita. Os vértices e taxas serão interpretados como conteúdo de uma curva de referência da ANBIMA; eles não serão apresentados como preços de futuros DI, ajustes B3 ou taxas próprias de contratos sem a fonte correspondente.

A FGV IBRE identifica o IGP-M como uma das modalidades mensais do IGP e informa que a coleta do IGP-M ocorre entre o dia 21 do mês anterior e o dia 20 do mês de referência. [7] A página de resultados publica a variação mensal e os acumulados, enquanto o portal informa que a série histórica é acessada em área de autenticação de produtos licenciados. [7] [8] Por esse motivo, a parametrização inicial da FGV deve suportar publicação oficial por competência e marcar explicitamente a cobertura histórica disponível, sem alegar acesso a uma API ou série completa não exposta publicamente.

## 4. Referência contábil e limite de escopo

O CPC disponibiliza o Pronunciamento Técnico CPC 48 e registra suas aprovações regulatórias. [12] A IFRS Foundation informa que a IFRS 9 contém um capítulo de hedge accounting e permite, como política contábil, a aplicação dos requisitos de hedge accounting da IFRS 9 ou a continuidade dos requisitos correspondentes da IAS 39. [13] A IAS 39 é descrita pela IFRS Foundation como substituída pela IFRS 9, ressalvadas as opções e exceções indicadas para hedge accounting. [14]

Consequentemente, o produto poderá documentar designação, razão de hedge, hipótese de efetividade, resultados quantitativos e evidência das fontes. Ele **não** emitirá parecer contábil, não afirmará qualificação automática para hedge accounting e não substituirá validação por responsável técnico, auditoria ou política contábil da entidade.

## 5. Controles que bloqueiam a publicação de dados e cálculos

| Situação detectada | Comportamento obrigatório |
|---|---|
| URL, endpoint ou layout ainda não confirmados | Não executar coleta automatizada; exibir fonte pendente de validação. |
| Arquivo oficial recebido com colunas diferentes do parser | Preservar o bruto, registrar erro de contrato e bloquear normalização. |
| Contrato sem tamanho, unidade ou vencimento confirmados | Não disponibilizar para o Hedge Engine. |
| IGP-M sem publicação FGV oficial verificável para a competência | Não preencher observação; reportar cobertura indisponível. |
| Cálculo sem todos os dados de entrada, convenção e versão do método | Não apresentar como resultado de risco ou hedge; registrar pendência. |

## Referências

[1]: https://dadosabertos.bcb.gov.br/dataset/dolar-americano-usd-todos-os-boletins-diarios/resource/ae69aa94-4194-45a6-8bae-12904af7e176 "Banco Central do Brasil — PTAX: navegador e documentação de API"
[2]: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/layout-dos-arquivos/ "B3 — Layout dos arquivos"
[3]: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/pesquisa-por-pregao/ "B3 — Pesquisa por pregão"
[4]: https://www.anbima.com.br/informacoes/est-termo/CZ.asp "ANBIMA — Estrutura a Termo das Taxas de Juros Estimada"
[5]: https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html "IBGE — Índice Nacional de Preços ao Consumidor Amplo"
[6]: https://servicodados.ibge.gov.br/api/docs/agregados?versao=3 "IBGE — API de dados agregados"
[7]: https://portalibre.fgv.br/igp "FGV IBRE — Índice Geral de Preços"
[8]: https://portalibre.fgv.br/taxonomy/term/94 "FGV IBRE — IGP-M"
[9]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Futuro de Taxa de Câmbio de Reais por Dólar Comercial"
[10]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-mini-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Futuro Míni de Taxa de Câmbio de Reais por Dólar Comercial"
[11]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/futuro-de-taxa-media-de-depositos-interfinanceiros-de-um-dia.htm "B3 — Futuro de Taxa Média de Depósitos Interfinanceiros de Um Dia"
[12]: https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=106 "CPC — CPC 48: Instrumentos Financeiros"
[13]: https://www.ifrs.org/issued-standards/list-of-standards/ifrs-9-financial-instruments/ "IFRS Foundation — IFRS 9 Financial Instruments"
[14]: https://www.ifrs.org/issued-standards/list-of-standards/ias-39-financial-instruments-recognition-and-measurement/ "IFRS Foundation — IAS 39 Financial Instruments: Recognition and Measurement"
[15]: https://www.ibge.gov.br/explica/inflacao.php "IBGE — Inflação: referência à tabela 1737 do SIDRA"
[16]: https://sidra.ibge.gov.br/tabela/1737 "IBGE SIDRA — Tabela 1737: série histórica do IPCA"
