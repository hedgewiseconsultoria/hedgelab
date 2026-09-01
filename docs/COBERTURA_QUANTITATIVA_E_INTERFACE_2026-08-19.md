# HEDGE LAB — Cobertura Quantitativa, Bloqueios e Interface

**Data de referência:** 19 de agosto de 2026, GMT-3.  
**Modelo de operação:** DataFrames exclusivamente em sessão, artefatos JSON/CSV/Parquet verificáveis e armazenamento de objetos para evidências. Não há persistência relacional de posições, cenários ou observações de mercado.

> Este documento separa uma **observação oficial**, um **cálculo auditável** e um **cenário didático parametrizado**. Um cenário didático não substitui preço, ajuste, curva ou cotação publicada por fonte oficial.

## Cobertura quantitativa publicada

| Domínio | Resultado funcional publicado | Linhagem ou convenção exigida | Limite explícito |
|---|---|---|---|
| Câmbio | Consulta PTAX USD por data, cenário FX e VaR paramétrico com parâmetros declarados pelo usuário. | Recurso PTAX do BCB, data-base, data/hora de extração e SHA-256 do payload. [1] | PTAX não é preço futuro, ajuste B3 nem taxa contratual. |
| Dólar futuro e opções DOL | Dimensionamento nocional DOL/WDO, ajuste diário com duas evidências B3 e liquidação intrínseca de opção DOL. | Ficha B3 compatível, observação selecionada, arquivo, data-base e hash. [2] [3] | Não calcula margem, prêmio, volatilidade implícita, delta, MTM ou Greeks. |
| DI futuro | DataFrame de vértices publicados, referência de taxa/PU/data-base e ajuste diário para posição iniciada no dia ou em aberto. | PriceReport e InstrumentReport B3 da mesma data-base, calendário escolhido, hashes e campos observados. [4] [5] | Não interpola vértices, não constrói taxa forward, não estima DV01 ou curva de precificação. |
| Taxa over | Fator acumulado da SGS 11 por capitalização das observações diárias e continuidade no calendário bancário ANBIMA 2026. | Série BCB SGS 11, SHA-256, dias úteis bancários sem lacuna. [6] [7] | Não anualiza, preenche dias, infere taxa contratual nem constrói curva. |
| Selic anualizada | Consulta direta da SGS 1178 em percentual ao ano, base 252. | Série BCB indicada, período e linhagem preservados. [8] | Não deriva a série da SGS 11 nem a converte automaticamente. |
| Inflação | IPCA acumulado pelo quociente de números-índice da tabela 1737, variável 2266, na mesma localidade. | Metadados e observações do IBGE, competência inicial/final e hashes. [9] [10] | Não soma percentuais arredondados, não projeta competências e não completa ausências. |
| IGP-M | Coleta parametrizada de publicação institucional da FGV, como exceção autorizada. | URL, competência, hash e exceção declarada. [11] | Não declara uma série histórica ou API que não esteja publicada. |
| Commodities B3 | Dimensionamento físico de futuros BGI, CCM, SOY e SJC e exercícios intrínsecos habilitados de opções compatíveis. | Unidade de exposição coincidente com a ficha B3, série selecionada, data-base e hash. [12] | Não converte unidade, não cria prêmio, MTM, volatilidade ou Greeks; SOY e SJC permanecem em USD. |
| OTC | Referência nocional de NDF, swap cambial e swap de taxa mediante contrato bilateral hasheado e designação explícita. | Termos declarados, contrato, moeda, vencimento e hash. | Não precifica taxa, cupom, valor justo, DV01, crédito de contraparte ou resultado financeiro. |
| Contabilidade de hedge | Hedge ratio nocional, triagem de efetividade e registro de política IAS 39 ou IFRS 9/CPC 48. | Nocionais, designação e política declarada. [13] [14] | Não emite conclusão de qualificação contábil automática. |

## Bloqueios quantitativos intencionais

Os bloqueios abaixo são controles de integridade, e não lacunas preenchidas por estimativa. A aplicação deixa o resultado indisponível sempre que preço, contrato, convenção ou fonte não estiverem validados.

| Capacidade bloqueada | Motivo | Comportamento do produto |
|---|---|---|
| Base entre mercados, basis e conversões de unidade | Não há definição homogênea aplicável, série emparelhada e convenção de contrato suficientes para cada exposição. | Não calcula base, spread ou conversão implícita. |
| Curvas de precificação, desconto e forward | Vértices DI1 publicados não autorizam interpolação, bootstrap, taxa forward ou metodologia própria sem especificação validada. | Exibe a referência observada e bloqueia curva derivada. |
| MTM, valor justo, DV01 e sensibilidade de juros | Dependem de contrato, curva, datas, metodologia e preços observáveis compatíveis. | Mantém o rótulo de bloqueio e não cria estimativa. |
| Prêmio, volatilidade e Greeks de opções | Exigem cadeia de opções, convenção, calendário e insumos observáveis ainda não validados para o motor pretendido. | Libera somente o exercício intrínseco quando a ficha e a observação B3 forem válidas. |
| Coleta DI1 sem resposta da fonte | A B3 pode não responder ou o conjunto de arquivos pode não ser validável. | Mostra o bloqueio específico, libera os controles e nunca cria curva alternativa. |

## Auditoria de idioma, identidade e responsividade

A interface exposta ao usuário está em **português brasileiro** e usa nomes de domínio consistentes, como “Data-base”, “Exposição econômica”, “Vértices de DI futuro publicados pela B3”, “Nenhuma curva alternativa foi estimada” e “Relatório PDF”. Os textos de bloqueio descrevem a ausência de fonte ou método em vez de apresentar resultado inferido.

| Critério | Evidência consolidada | Resultado |
|---|---|---|
| Identidade corporativa | Navegação lateral, hero institucional, cartões de evidência, tipografia editorial e estados de fonte usam a mesma paleta institucional. | Concluído. |
| Acessibilidade | Controles têm rótulos, estados desabilitados preservam semântica, métricas usam região dinâmica e as transições respeitam `prefers-reduced-motion`. | Concluído. |
| Desktop | Validação em 1280 × 720 inclui vazio, erro PTAX, pipeline B3 denso, carregamento DI1 e erro oficial B3. | Concluído. |
| Mobile | Validação em 375 × 812 inclui coluna única, tabelas densas com rolagem horizontal e carregamento DI1 de inspeção sem mutation. | Concluído. |
| Dados de mercado | O modo visual de carregamento existe apenas em desenvolvimento e não introduz payload, DataFrame ou observação simulada. | Concluído. |

Para o detalhe de cada captura, incluindo o artefato desktop da B3 com SHA-256, consulte [`VALIDACAO_VISUAL_2026-08-18.md`](./VALIDACAO_VISUAL_2026-08-18.md). Para contratos de DataFrame, consulte [`CONTRATOS_DATAFRAMES.md`](./CONTRATOS_DATAFRAMES.md); para fontes e layouts, consulte [`FONTES_OFICIAIS.md`](./FONTES_OFICIAIS.md).

## Referências

[1]: https://dadosabertos.bcb.gov.br/dataset/dolar-americano-usd-todos-os-boletins-diarios/resource/ae69aa94-4194-45a6-8bae-12904af7e176 "Banco Central do Brasil — PTAX"
[2]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Futuro de Taxa de Câmbio de Reais por Dólar Comercial"
[3]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-mini-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Futuro Mini de Taxa de Câmbio de Reais por Dólar Comercial"
[4]: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/layout-dos-arquivos/ "B3 — Layout dos arquivos"
[5]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/futuro-de-taxa-media-de-depositos-interfinanceiros-de-um-dia.htm "B3 — Futuro de Taxa Média de Depósitos Interfinanceiros de Um Dia"
[6]: https://dadosabertos.bcb.gov.br/dataset/11-taxa-de-juros-selic "Banco Central do Brasil — SGS 11"
[7]: https://www.anbima.com.br/feriados/feriados.asp "ANBIMA — Feriados bancários"
[8]: https://dadosabertos.bcb.gov.br/dataset/1178-taxa-de-juros-selic-ao-ano "Banco Central do Brasil — SGS 1178"
[9]: https://sidra.ibge.gov.br/tabela/1737 "IBGE SIDRA — Tabela 1737"
[10]: https://servicodados.ibge.gov.br/api/docs/agregados?versao=3 "IBGE — API de dados agregados"
[11]: https://portalibre.fgv.br/igp "FGV IBRE — Índice Geral de Preços"
[12]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/derivativos/ "B3 — Derivativos"
[13]: https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=106 "CPC — CPC 48"
[14]: https://www.ifrs.org/issued-standards/list-of-standards/ifrs-9-financial-instruments/ "IFRS Foundation — IFRS 9"
