# Revalidação oficial B3 — 18/08/2026

## Referência temporal

A consulta foi executada em **18/08/2026**. A página oficial de pesquisa por pregão listava, em 17/08/2026, atualizações para os três arquivos empregados pelo pipeline: **BVBG.086.01 (PriceReport)** às 20:38 no portal em português/20:32 no portal em inglês, **BVBG.187.01 (DerivativesSimplifiedPriceReport)** às 20:29 e **BVBG.028.02 (Instruments File)** às 18:44.[^search]

| Verificação | Evidência oficial | Resultado |
|---|---|---|
| Fluxo público de arquivos | [Pesquisa por pregão — B3](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/pesquisa-por-pregao/) | Continua a disponibilizar seleção por arquivo e data retroativa para download. |
| Hub de Dados Públicos | [Public Data Hub — B3](https://www.b3.com.br/en_us/data/public-data-hub/) | Direciona derivativos para **Daily bulletins → Search by trading session**, confirmando o fluxo público vigente. |
| Boletim de preços | [Search by trading session — B3](https://www.b3.com.br/en_us/market-data-and-indices/data-services/market-data/historical-data/newsletters/search-by-trading-session/search-by-trading-session/) | Lista BVBG.086.01 PriceReport e BVBG.187.01 DerivativesSimplifiedPriceReport. |
| Cadastro de instrumentos | Mesma pesquisa oficial | Lista BVBG.028.02 Instruments File. |
| Layout de preço | [Layout dos arquivos — B3](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/layout-dos-arquivos/) | Associa BVBG.086.01 e BVBG.187.01 ao catálogo de preços `Catalogo_precos_v1.3.pdf`. |
| Layout de cadastro | Mesma página de layouts | Associa BVBG.028.02 ao `Catalogo-de-Mensagens-Cadastro-de-Instrumento-Versao-2.6.pdf`. |

> A extração textual da página expõe os itens como `{contentId}` e não revela o identificador de download no HTML estático. Portanto, esta etapa **não substitui** a revalidação do download de arquivos XML reais, seus hashes e campos materializados na mesma data-base. O pipeline continua proibido de inferir campos ou alterar parser sem essa inspeção de arquivo real.

## Download e materialização realizados

O endpoint oficial efetivamente aceitou `filelist=PR260817.zip,`, `filelist=SPRD260817.zip,` e `filelist=IN260817.zip,`. Os pacotes ZIP possuem um ZIP interno; foram extraídos apenas os XMLs mais recentes de cada pacote em diretório externo ao projeto. O parser streaming existente foi executado sobre os três XMLs, com os hashes abaixo inseridos na linhagem do teste de integração real.

| Relatório | XML materializado | SHA-256 do XML | Cabeçalho observado | Linhas normalizadas | Status do parser |
|---|---|---|---|---:|---|
| BVBG.086.01 | `BVBG.086.01_BV000328202608170328000002029263039.xml` | `c4fc55fcc6a56f23f3830b95ae5b6622dbdc53f6badf1b211c50dfccf7f44408` | `BVMF.217.01`; 66.812 mensagens; criação `2026-08-17T20:29:15` | 66.812 | válido |
| BVBG.187.01 | `BVBG.187.01_BV000471202608170001000071926533860.xml` | `d800ffd848112c550b84b1d41288eb4af88794552bd68c4d297639334784aa2d` | `BVMF.217.01`; 2.291 mensagens; criação `2026-08-17T19:26:53` | 2.291 | válido |
| BVBG.028.02 | `BVBG.028.02_BV000327202608170327130766122944845.xml` | `d86eaa2680f41c1755e4526bb43260f280c54affa6dbead7ac536970fc642f52` | `bvmf.100.02`; 196.698 mensagens; criação `2026-08-17T18:40:30` | 8.282 instrumentos | aviso explícito do parser |

### Cobertura encontrada no DataFrame real

| Família | PriceReport | SimplifiedPriceReport | InstrumentReport |
|---|---:|---:|---:|
| DI1 | 45 | 45 | 45 |
| DOL | 2.070 | 506 | 2.066 |
| WDO | 191 | 38 | 191 |
| BGI | 807 | 308 | 797 |
| CCM | 670 | 288 | 666 |
| SOY | 3 | 3 | 5 |
| SJC | 249 | 47 | 249 |

### Tipos observados no cadastro de instrumentos

O parser normalizado classificou os registros a seguir diretamente do BVBG.028.02. A coluna **outros** não é promovida a futuro ou opção; ela permanece como classificação explícita do parser e não deve ser usada para dimensionamento.

| Família normalizada | Futuros | Opções | Outros |
|---|---:|---:|---:|
| DI1 | 45 | 0 | 0 |
| DOL | 24 | 2.042 | 2.042 |
| WDO | 23 | 168 | 168 |
| BGI | 9 | 788 | 788 |
| CCM | 8 | 658 | 658 |
| SOY | 3 | 2 | 2 |
| SJC | 7 | 242 | 242 |

Os testes de integração real concluíram com sucesso para os três XMLs. O resumo reprodutível foi materializado fora do repositório em `/home/ubuntu/b3-revalidation/summary-2026-08-17.json`; o script `scripts/revalidateB3Live.mts` apenas repete a normalização sobre esses arquivos já baixados e não integra preço de mercado simulado ao produto.

## Decodificação de XML e resiliência de coleta

Em 18/08/2026, o endpoint oficial retornou novamente o arquivo `BVBG.086.01_BV000328202608130328000001842591837.xml` para a data-base **13/08/2026**, com SHA-256 `cf823459800119a9b8f72803ef77b15845b76d06e83d3e39c670fe7b39587ab0` e prólogo `encoding="utf-8"`. A normalização em streaming foi reexecutada contra esse arquivo real e concluiu válida, com mais de 60 mil registros, incluindo DI1, DOL, WDO, BGI e CCM.

Durante a inspeção da coleta DI1, o decodificador binário estrito interrompeu um XML por byte não válido em UTF-8. A etapa de entrada passou, portanto, a ler a declaração de codificação do próprio XML e a entregar texto ao SAX; para um XML declarado em UTF-8 que contenha byte legado fora dos campos estruturais mapeados, a substituição é restrita ao texto inválido. Os bytes brutos continuam preservados e hashados **antes** do parser. Testes unitários isolados cobrem tanto a declaração ISO-8859-1 quanto essa tolerância; não há alteração, inferência ou correção de valores de mercado.

[^search]: As páginas oficiais foram consultadas sem cache em 18/08/2026. As atualizações apresentadas na tabela se referem ao conteúdo exibido pela B3, não a preços de mercado ou a uma nova série materializada pelo sistema.
