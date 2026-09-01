# HEDGE LAB — Contratos de DataFrames da Primeira Versão

## 1. Princípio de modelagem

Um **DataFrame** no HEDGE LAB é uma coleção de linhas com esquema explícito e uma linhagem obrigatória. A linhagem não fica fora do resultado: ela acompanha o conjunto, a exportação de cenário e o relatório. O produto não usa esses arquivos como um banco de dados disfarçado; os DataFrames vivem durante a sessão e só são materializados quando o usuário solicita uma exportação.

## 2. Instrument Master DataFrame

O `instrument_master_dataframe` será formado inicialmente pelo parser do `BVBG.028.02`. Os campos abaixo são parte do contrato de saída. Valores indisponíveis na fonte são nulos, nunca estimados.

| Campo | Origem ou regra | Situação no BVBG.028.02 validado |
|---|---|---|
| `instrument_id` | Identificador próprio do instrumento | Observado no XML. |
| `symbol` | Símbolo de negociação | Observado para futuros e opções. |
| `isin` | ISIN do bloco de instrumento | Observado para futuros e opções. |
| `family` | Ativo do bloco comum | Observado; filtrado ao universo inicial autorizado. |
| `instrument_type` | Tipo do bloco XML | `FUTURE`, `OPTION` ou `OTHER`, sem inferência pelo símbolo. |
| `underlying_id` | Identificador do ativo-objeto quando presente | Observado para futuros e opções nos blocos verificados. |
| `maturity` | Data de expiração do bloco específico | Observada para futuros e opções. |
| `currency` | Moeda de negociação do bloco específico | Observada quando o campo existe. |
| `contract_size` | Especificação econômica confirmada | Inicialmente `null`; não é derivado do multiplicador do XML. |
| `tick_size` | Especificação econômica confirmada | Inicialmente `null`; requer fonte específica. |
| `settlement_type` | Especificação econômica confirmada | Inicialmente `null`; requer fonte específica. |
| `status` | Indicador de atividade do relatório | Normalizado para `active`, `inactive` ou `unknown`. |
| `source`, `source_file`, `asof` | Linhagem de coleta | Sempre obrigatórios no DataFrame curado. |

Os campos `source_contract_multiplier` e `source_asset_quotation_quantity` preservam a informação observada no XML sem rebatizá-la como tamanho de contrato. Para produtos como DOL, WDO e DI1, o tamanho de contrato usado pelo motor de hedge virá da especificação oficial aplicável, registrada separadamente e coberta por teste.

## 3. Market Data DataFrame

O `market_data_dataframe` está reservado para o boletim de negociação. Ele não é produzido a partir do arquivo de instrumentos. Seu contrato separa campos economicamente distintos e bloqueia o uso de linhas sem instrumento identificado.

| Campo | Regra de validação |
|---|---|
| `date`, `instrument_id`, `symbol`, `family` | Obrigatórios após a associação ao Instrument Master. |
| `open`, `high`, `low`, `close`, `average` | Preços; não recebem valores de taxa ou PU. |
| `settlement_pu`, `settlement_rate`, `previous_settlement` | Mantidos em colunas independentes e somente quando o layout indicar sua natureza. |
| `volume`, `trades`, `open_interest` | Não negativos e com unidade de origem preservada. |
| `maturity` | Herdado ou verificado contra o instrumento correspondente; divergência gera erro. |

## 4. Option Master e Option Market DataFrames

O `option_master_dataframe` usa apenas instrumentos cujo tipo XML é `OPTION` e mantém `underlying_id`, `option_type`, `exercise_style`, `exercise_price` e `maturity`. Um `underlying_id` ausente é erro impeditivo: a opção pode continuar visível para inspeção, mas fica bloqueada para qualquer cálculo de hedge.

O `option_market_dataframe` será habilitado somente após a extração e inspeção de fonte oficial de preços de opções. Até então, o produto não exibirá volatilidade implícita, prêmio de mercado ou Greeks como dados de mercado.

## 5. DataFrames de trabalho do usuário

| DataFrame | Conteúdo | Forma de continuidade sem banco |
|---|---|---|
| `exposure_dataframe` | Exposições, fluxo de caixa, moeda, nocional, direção e data | Exportação JSON do cenário. |
| `hedge_dataframe` | Instrumento selecionado, quantidade, método e premissas | Exportação JSON do cenário. |
| `scenario_dataframe` | Choques cambiais, de juros ou de volatilidade | Exportação JSON do cenário. |
| `calculation_dataframe` | Inputs, outputs, versão da fórmula e alertas | Exportação JSON e relatório. |
| `lineage_dataframe` | Fonte, URL, hash, instante de extração e validações | Manifesto JSON anexado ao relatório. |

## 6. Critérios de qualidade

Cada DataFrame deverá passar por validação de colunas obrigatórias, identificadores duplicados, tipos incompatíveis e referencial de fonte. O parser do `BVBG.028.02` já possui testes unitários e foi executado contra o arquivo real recuperado da B3; a execução incremental foi concluída com êxito, sem carregar o XML integralmente em memória. A geração de DataFrames de preço, cálculo ou relatório continua bloqueada até que suas respectivas fontes e layouts sejam extraídos e validados.
