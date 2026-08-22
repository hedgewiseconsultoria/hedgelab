# B3 — Comparação entre Layout Oficial e Arquivos Reais de Preço

**Data de negociação dos arquivos analisados:** 14/08/2026.  
**Layout oficial analisado:** `Catalogo_precos_v1.3.pdf`, SHA-256 `2ebdea0162594b64f0cb00dd4b85bb3818b04ca039985e40215c91d439f7d850`.  
**Mensagem de negócio documentada e observada:** `BVMF.217.01` / `PriceReport`.

## 1. Escopo da comparação

| Arquivo | Artefato real analisado | Header observado | Função descrita no layout |
|---|---|---|---|
| BVBG.086.01 | `BVBG.086.01_BV000328202608140328000001841416779.xml` | `TtlNbOfMsg=68272`, `BizGrpTp=BVBG.086.01`, `MsgDefIdr=BVMF.217.01` | Dados completos de preços e valores de negociação. |
| BVBG.187.01 | `BVBG.187.01_BV000471202608140001000071927517130.xml` | `TtlNbOfMsg=2241`, `BizGrpTp=BVBG.187.01`, `MsgDefIdr=BVMF.217.01` | Dados resumidos de derivativos, preços e demais valores de negociação. |

O catálogo descreve os campos com a regra **R1** como obrigatórios quando houver negociação e os campos **R2** como opcionais no `BVBG.086.01` e não enviados no `BVBG.187.01`. A comparação dos XMLs confirma que o parser precisa admitir campos opcionais e registros sem negócios, em vez de interpretar a ausência como zero.

## 2. Campos estruturais

| Caminho XML | Situação em BVBG.086.01 | Situação em BVBG.187.01 | Resultado da comparação |
|---|---|---|---|
| `PricRpt/TradDt/Dt` | Observado | Observado | Conforme o layout; data de negociação `2026-08-14`. |
| `PricRpt/SctyId/TckrSymb` | Observado | Observado | Conforme; identificação curta do instrumento. |
| `PricRpt/FinInstrmId/OthrId/Id` | Observado | Observado | Conforme; identificador proprietário do instrumento. |
| `PricRpt/FinInstrmId/OthrId/Tp/Prtry` | Observado | Observado | Conforme; o valor observado no conjunto analisado foi `8`. |
| `PricRpt/FinInstrmId/PlcOfListg/MktIdrCd` | Observado | Observado | Conforme; o valor observado foi `BVMF`. |
| `PricRpt/TradDtls` | Observado, inclusive registros vazios | Observado, inclusive registros vazios | O bloco é opcional; não converter ausência em quantidade zero. |

## 3. Campos de negociação e atributos

| Grupo de campo | BVBG.086.01 observado | BVBG.187.01 observado | Leitura de contrato para o parser |
|---|---|---|---|
| Fluxo e volumes | `MktDataStrmId`, `NtlFinVol`, `IntlFinVol`, `FinInstrmQty`, `NtlRglrVol`, `NtlNonRglrVol`, `IntlRglrVol`, `IntlNonRglrVol` | Não observados no XML simplificado analisado | Tratar como campos exclusivos/opcionais do PriceReport completo. |
| Preços de negociação | `BestBidPric`, `BestAskPric`, `FrstPric`, `MinPric`, `MaxPric`, `TradAvrgPric`, `LastPric` | `FrstPric`, `MinPric`, `MaxPric`, `TradAvrgPric`, `LastPric` | `best bid/ask` não devem ser esperados no simplificado. |
| Quantidades | `TradQty`, `RglrTxsQty`, `NonRglrTxsQty`, `RglrTraddCtrcts`, `NonRglrTraddCtrcts` | `RglrTxsQty` em parte dos registros; `TradQty` não observado no XML simplificado analisado | A quantidade deve ser nula quando ausente, e não imputada. |
| Ajustes | `AdjstdQt`, `AdjstdQtTax`, `AdjstdQtStin`, `PrvsAdjstdQt`, `PrvsAdjstdQtTax`, `PrvsAdjstdQtStin`, `VartnPts`, `AdjstdValCtrct` | `AdjstdQt`, `AdjstdQtTax`, `AdjstdQtStin`, `PrvsAdjstdQt`, `PrvsAdjstdQtTax`, `PrvsAdjstdQtStin` | Os dois layouts permitem ajuste; campos de variação e valor por contrato não foram observados no simplificado analisado. |
| Mercado e limites | `OpnIntrst`, `OscnPctg`, `DaysToSttlm`, `EqvtVal`, `MaxTradLmt`, `MinTradLmt` | `OpnIntrst` | A conversão equivalente para agrícola e os limites pertencem somente ao conjunto completo observado. |

## 4. Amostras reais de cobertura

| Família | Ticker real localizado no BVBG.086.01 | Situação observada | Conclusão de validação |
|---|---|---|---|
| Dólar cheio | `DOLF29` e opção `DOLQ27P004950` | Futuros e opções presentes. | A família `DOL` é coberta; o tipo deve vir do InstrumentReport, não de inferência do ticker. |
| Mini dólar | `WDOX26` e opção `WDOZ26C005250` | Futuros e opções presentes; a opção inspecionada tinha `TradDtls` vazio e apenas limites. | A família `WDO` é coberta e campos podem estar ausentes por instrumento. |
| DI | `DI1Z28` | Preços, contratos em aberto, ajuste em PU/taxa, ajustes anteriores e valor de ajuste por contrato presentes. | A família `DI1` é coberta no PriceReport completo. |
| Boi gordo | `BGIU26` e opção `BGIQ26C036500` | Futuros e opções presentes. | Cobertura de commodity confirmada por arquivo real. |
| Café | `CCMX27` e opção `CCMX26P006800` | Futuros e opções presentes. | Cobertura de commodity confirmada por arquivo real. |
| Açúcar | `ICFU27` e opção `ICFU27C035000` | Futuros e opções presentes. | Cobertura de commodity confirmada por arquivo real. |

## 5. Decisões de implementação

O parser trabalhará por streaming sobre cada `PricRpt` e produzirá uma linha para cada instrumento encontrado. O tipo econômico — futuro, opção ou outro — será associado por `instrument_id` ao `BVBG.028.02`, e **não** pela forma do ticker. Todos os campos de preço, ajuste, quantidade, volume e limite serão opcionais e manterão `null` quando não vierem no XML.

O `market_data_dataframe` preservará, no mínimo, `trade_date`, `symbol`, `instrument_id`, `market_identifier_code`, `source_file`, `source_hash_sha256`, `source_message_type`, `price_report_type`, e os campos de mercado explicitamente observados. A normalização deve rejeitar divergência entre arquivo e tipo `BVBG` esperado, data inválida, `MktIdrCd` ausente e identificador proprietário ausente.

> Nenhum campo de preço, taxa, ajuste ou volatilidade será criado quando estiver ausente no XML de origem. A ausência de negociação de uma opção, por exemplo, não autoriza atribuir a ela o preço de outro instrumento ou o último preço conhecido.

## 6. DataFrames reais materializados

A rotina `scripts/build-b3-real-dataframes.mjs` foi executada contra os XMLs oficiais preservados e gerou CSVs fora do projeto web, em `/home/ubuntu/hedge-lab-data/curated/b3/2026-08-14`. A saída contém um `manifest.json` com fonte, hash, versão de parser, campos observados, cobertura e alertas. Não foram usados preços sintéticos, valores de preenchimento ou fallback.

| DataFrame real | Linhas produzidas | Origem |
|---|---:|---|
| `instrument_master_20260817.csv` | 8.282 | BVBG.028.02 de 17/08/2026. |
| `price_dataframe_bvbg086_20260814.csv` | 68.272 | BVBG.086.01 de 14/08/2026, normalizado diretamente do XML real. |
| `price_dataframe_bvbg187_20260814.csv` | 2.241 | BVBG.187.01 de 14/08/2026, normalizado diretamente do XML real. |
| `market_associated_bvbg086_20260814.csv` | 0 | Associação bloqueada: preço de 14/08/2026 versus cadastro de 17/08/2026. |
| `market_associated_bvbg187_20260814.csv` | 0 | Associação bloqueada: preço de 14/08/2026 versus cadastro de 17/08/2026. |

O DataFrame de mercado materializou 71 colunas, incluindo identificadores, data, fluxo, preço, volume, ajustes, limites, tipo de relatório, hash e atributos obtidos do InstrumentReport. As colunas exatas são expostas pelo manifesto no painel do HEDGE LAB e preservadas no cabeçalho dos CSVs.

| Família | Registros auditados BVBG.086.01 | Futuros | Opções | Registros com preço de negócio | Registros com ajuste |
|---|---:|---:|---:|---:|---:|
| DI1 | 45 | 45 | 0 | 43 | 45 |
| DOL | 2.066 | 24 | 2.042 | 15 | 24 |
| WDO | 191 | 23 | 168 | 7 | 23 |
| BGI | 798 | 13 | 785 | 24 | 13 |
| CCM | 669 | 12 | 657 | 17 | 12 |
| ICF | 142 | 8 | 134 | 7 | 8 |

> A tabela acima registra uma **cobertura de auditoria** obtida durante a inspeção dos XMLs reais. A data do InstrumentReport disponível era 17/08/2026, enquanto os boletins de preço são de 14/08/2026. A versão vigente do pipeline bloqueia a associação em `blocked_asof_mismatch`; portanto, a cobertura não é disponibilizada como DataFrame associado nem é utilizável por qualquer cálculo quantitativo. Nenhuma maturidade, tipo ou ativo-objeto é deduzido do ticker.

## 7. Coleta em código e preservação do bruto

O coletor `server/ingestion/b3OfficialDownload.ts` reproduz o fluxo oficialmente observado da página de Pesquisa por Pregão. Em 17/08/2026, ele foi executado para a data-base `2026-08-14`, verificou os ZIPs externos e internos, filtrou somente XMLs com o prefixo do `BVBG` solicitado, calculou SHA-256 de cada arquivo e preservou os pacotes externos no armazenamento de objetos do projeto.

| Boletim | Pacote preservado | SHA-256 do pacote externo recuperado pelo coletor | XMLs encontrados |
|---|---|---|---:|
| BVBG.086.01 | `/manus-storage/b3/raw/2026-08-14/BVBG.086.01/PR260814_9e931c5c.zip` | `5f1f4e67552cbc1b470ebce6ebd045b16761e048b4b4e0a40cdabbe0bf1eecd8` | 4 |
| BVBG.187.01 | `/manus-storage/b3/raw/2026-08-14/BVBG.187.01/SPRD260814_e2c9a52b.zip` | `23fce09e97b5447c06d2421b265755c05bd137ec1cf59199127ded7b50c5a75f` | 2 |

Os XMLs internos selecionados para os DataFrames conservaram os mesmos hashes registrados nas seções anteriores. A diferença entre hashes de pacotes externos recuperados em execuções distintas não altera a identidade dos XMLs normalizados; a linhagem registra ambos os níveis de arquivo.

> **Limitação impeditiva de data-base:** o download do InstrumentReport para `2026-08-14` retornou erro HTTP 500 no fluxo oficial observado. Por isso, o HEDGE LAB bloqueia programaticamente a associação com o cadastro de 17/08/2026 e não habilita cálculos de MTM, Greeks, precificação ou risco residual a partir dessa combinação. O pipeline de leitura e dos DataFrames de preços é válido e rastreável; o pipeline quantitativo continua bloqueado até haver InstrumentReport de mesma data-base ou uma regra oficialmente validada para a defasagem.

## 8. Conjunto alinhado promovido — 13/08/2026

Em 17/08/2026, a coleta oficial também confirmou a disponibilidade, no mesmo fluxo de Pesquisa por Pregão da B3, dos três boletins de **13/08/2026**. Os XMLs internos foram extraídos sem alteração, tiveram SHA-256 calculado e foram submetidos aos parsers streaming. Diferentemente do conjunto registrado na seção anterior, as três linhagens têm a mesma data-base; portanto, a função de associação por identificador proprietário retorna `valid`.

| Boletim | XML selecionado | SHA-256 do XML | Linhas normalizadas | URL oficial de recuperação |
|---|---|---|---:|---|
| BVBG.028.02 | `BVBG.028.02_BV000327202608130327114794456547280.xml` | `d2a1aca58567fbc3a1cd23c40617902d92fc1868fcb5e0a7d9df621688946e5d` | 8.437 | `IN260813.zip` |
| BVBG.086.01 | `BVBG.086.01_BV000328202608130328000001842591837.xml` | `cf823459800119a9b8f72803ef77b15845b76d06e83d3e39c670fe7b39587ab0` | 66.387 | `PR260813.zip` |
| BVBG.187.01 | `BVBG.187.01_BV000471202608130001000071916496500.xml` | `57b911da684ebb5929a857dcbc717229de3444cf419ac336bef3250b322f6538` | 2.250 | `SPRD260813.zip` |

Os CSVs reprodutíveis foram materializados em `/home/ubuntu/hedge-lab-data/curated/b3/2026-08-13`. A associação produziu **4.329** observações de `BVBG.086.01` e **1.348** observações de `BVBG.187.01` com atributos de cadastro da mesma data-base. O manifesto do aplicativo passou a expor somente esse conjunto como `valid`; combinações futuras de datas distintas continuam bloqueadas pelo mesmo controle programático.

| Família | Registros associados BVBG.086.01 | Futuros | Opções | Com negócio | Com ajuste |
|---|---:|---:|---:|---:|---:|
| DI1 | 45 | 45 | 0 | 43 | 45 |
| DOL | 2.066 | 24 | 2.042 | 16 | 24 |
| WDO | 191 | 23 | 168 | 11 | 23 |
| BGI | 798 | 16 | 782 | 24 | 16 |
| CCM | 664 | 12 | 652 | 25 | 12 |
| ICF | 240 | 6 | 226 | 15 | 6 |

> A autorização de associação não equivale à autorização automática para todo cálculo quantitativo. Cada módulo de MTM, pricing, Greeks e risco residual continuará exigindo os campos de mercado e as convenções oficialmente confirmadas para o instrumento específico. Nenhum preço, volatilidade ou outro atributo ausente é imputado.
