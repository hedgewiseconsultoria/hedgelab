# Correções do fluxo B3 — Hedge Lab

## Problemas identificados

O vínculo da operação chamava a coleta de observações, mas apenas guardava uma cotação em estado local. A seleção não era publicada no `b3_observation_link_dataframe`, portanto os dimensionadores e os pacotes de simulação não recebiam a evidência B3. Além disso, o matching aceitava somente `FUTURE`, impedindo opções, e exigia igualdade exata entre `maturity` e a data declarada, embora o cadastro B3 use o primeiro dia do mês em alguns instrumentos.

O projeto também dependia de snapshots publicados pelo GitHub Actions, mas o ZIP analisado não continha a pasta `b3-snapshots`. Sem snapshot, o servidor caía no download direto da B3, que podia manter a interface pendente até o timeout do Render.

## Alterações aplicadas

| Arquivo | Alteração |
|---|---|
| `server/routers.ts` | A rota `collectB3MarketObservations` passou a persistir CSVs e manifestos normalizados de preço e instrumento, retornando seus hashes e chaves de armazenamento para a seleção canônica. |
| `server/domain/b3MarketDataset.ts` | A associação PriceReport–InstrumentReport usa o identificador técnico e, quando ele diverge entre os boletins, faz fallback pelo símbolo oficial `TckrSymb`. Isso cobre futuros e opções de dólar, DI1 e commodities. |
| `server/domain/b3MarketDataset.test.ts` | Incluído teste explícito para a divergência de identificadores entre os boletins. |
| `client/src/components/HedgeDashboard.tsx` | O vínculo passou a selecionar `OPTION` para alternativas de opções e `FUTURE` para futuros; tenta primeiro o vencimento exato e depois o mesmo mês; publica a seleção em `b3_observation_link_dataframe`. |
| `server/ingestion/b3OfficialDownload.ts` | Em produção, o download online direto da B3 fica desabilitado por padrão. O caminho interativo usa o snapshot gratuito do GitHub; o download ao vivo fica reservado ao workflow diário ou à habilitação explícita de `B3_ALLOW_LIVE_FETCH=true`. |
| `server/ingestion/b3SnapshotCache.ts` | Mantida a validação de ZIP e SHA-256, leitura preferencial via `raw.githubusercontent.com` e timeout ampliado para arquivos B3 de dezenas de MB. |
| `server/ingestion/b3OfficialDownload.ts` | O timeout ampliado do cache é propagado também para a coleta automática no Render; arquivos parciais nunca são aceitos. |
| `client/src/components/B3ManualCollectionCard.tsx` | A atualização automática passou a carregar somente metadados, hashes e linhagem; a normalização pesada ficou sob demanda no vínculo da operação, reduzindo o tempo de abertura da Base técnica. |
| `client/src/components/EligibleAlternativesComparisonCard.tsx` | Cada alternativa passa a exibir o ativo/família e tipo B3 compatíveis dentro de “Cobertura e cenário”, distinguindo ativo elegível de série efetivamente vinculada. |
| `client/src/components/HedgeDashboard.tsx` | Ao selecionar uma alternativa B3, o vínculo da série é iniciado automaticamente; a requisição tem limite de 45 segundos e termina com estado explícito em caso de indisponibilidade. |
| `server/ingestion/bcbPtax.ts` | Mantida a consulta oficial `CotacaoDolarDia`, com tentativa auditável dos cinco dias úteis anteriores quando a data solicitada não tem publicação. A linhagem conserva a data efetiva da cotação e nenhuma taxa é inventada. |
| `server/domain/b3MarketDataset.ts` | Adicionada seleção de contratos por horizonte: vencimento exato, mesmo mês, primeiro posterior e último anterior como último recurso, sempre apenas entre observações com preço/ajuste oficial. |
| `client/src/components/LinearFuturesScenarioCard.tsx` | O cenário recebe exposição, direção, vencimento, percentual e preço/linhagem da observação B3 selecionada, em vez de iniciar desconectado com parâmetros padrão. |
| `client/src/components/HedgeAlternativeDecisionMatrixCard.tsx` | Criada matriz da mesma exposição por alternativa, mostrando contrato, evidência, estado de cálculo e bloqueios sem confundir ausência de dado com resultado. |

## Validação

A validação foi concluída com `pnpm check`, 102 arquivos de teste aprovados e 302 testes aprovados, incluindo associação por símbolo, seleção por horizonte, integração com XMLs oficiais, passagem da exposição ao simulador e matriz comparativa. O fluxo PTAX, o cache B3 e o downloader oficial foram validados especificamente após as últimas alterações. O build apresentou apenas os avisos já existentes sobre variáveis de analytics não definidas e tamanho de chunk.

## Deploy

Copie o conteúdo deste projeto para o repositório configurado no `render.yaml`. No GitHub, execute manualmente uma vez o workflow `.github/workflows/b3-daily-snapshot.yml` para popular `b3-snapshots/`; depois, o agendamento de dias úteis manterá os arquivos oficiais gratuitos atualizados. No Render, mantenha `B3_SNAPSHOT_CACHE_GITHUB_OWNER`, `B3_SNAPSHOT_CACHE_GITHUB_REPO` e `B3_SNAPSHOT_CACHE_GITHUB_BRANCH` configurados. O primeiro teste deve usar uma data-base que já possua os três arquivos no snapshot.

O app não inventa cotação quando o snapshot não existe. Nesse caso, a operação permanece bloqueada quanto aos dados oficiais e informa a indisponibilidade, evitando travamento e evitando que um preço substituto seja tratado como dado da B3.
