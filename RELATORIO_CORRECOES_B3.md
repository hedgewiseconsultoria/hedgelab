# Correções do fluxo B3 — Hedge Lab

## Problemas identificados

O vínculo da operação chamava a coleta de observações, mas apenas guardava uma cotação em estado local. A seleção não era publicada no `b3_observation_link_dataframe`, portanto os dimensionadores e os pacotes de simulação não recebiam a evidência B3. Além disso, o matching aceitava somente `FUTURE`, impedindo opções, e exigia igualdade exata entre `maturity` e a data declarada, embora o cadastro B3 use o primeiro dia do mês em alguns instrumentos.

O projeto também dependia de snapshots publicados pelo GitHub Actions, mas o ZIP analisado não continha a pasta `b3-snapshots`. Sem snapshot, o servidor caía no download direto da B3, que podia manter a interface pendente até o timeout do Render.

## Alterações aplicadas

| Arquivo | Alteração |
|---|---|
| `server/routers.ts` | A rota `collectB3MarketObservations` passou a persistir CSVs e manifestos normalizados de preço e instrumento, retornando seus hashes e chaves de armazenamento para a seleção canônica. |
| `client/src/components/HedgeDashboard.tsx` | O vínculo passou a selecionar `OPTION` para alternativas de opções e `FUTURE` para futuros; tenta primeiro o vencimento exato e depois o mesmo mês; publica a seleção em `b3_observation_link_dataframe`. |
| `server/ingestion/b3OfficialDownload.ts` | Em produção, o download online direto da B3 fica desabilitado por padrão. O caminho interativo usa o snapshot gratuito do GitHub; o download ao vivo fica reservado ao workflow diário ou à habilitação explícita de `B3_ALLOW_LIVE_FETCH=true`. |
| `server/ingestion/b3SnapshotCache.ts` | Mantida a validação de ZIP e SHA-256 e a compatibilidade com o endpoint de conteúdo do GitHub. |
| `client/src/components/B3ManualCollectionCard.tsx` | A atualização automática passou a carregar somente metadados, hashes e linhagem; a normalização pesada ficou sob demanda no vínculo da operação, reduzindo o tempo de abertura da Base técnica. |
| `server/ingestion/bcbPtax.ts` | Mantida a consulta oficial `CotacaoDolarDia`, com tentativa auditável dos cinco dias úteis anteriores quando a data solicitada não tem publicação. A linhagem conserva a data efetiva da cotação e nenhuma taxa é inventada. |

## Validação

A validação foi concluída com `pnpm check`, 102 arquivos de teste aprovados e 299 testes aprovados. O fluxo PTAX, o cache B3 e o downloader oficial foram validados especificamente após as últimas alterações. O build apresentou apenas os avisos já existentes sobre variáveis de analytics não definidas e tamanho de chunk.

## Deploy

Copie o conteúdo deste projeto para o repositório configurado no `render.yaml`. No GitHub, execute manualmente uma vez o workflow `.github/workflows/b3-daily-snapshot.yml` para popular `b3-snapshots/`; depois, o agendamento de dias úteis manterá os arquivos oficiais gratuitos atualizados. No Render, mantenha `B3_SNAPSHOT_CACHE_GITHUB_OWNER`, `B3_SNAPSHOT_CACHE_GITHUB_REPO` e `B3_SNAPSHOT_CACHE_GITHUB_BRANCH` configurados. O primeiro teste deve usar uma data-base que já possua os três arquivos no snapshot.

O app não inventa cotação quando o snapshot não existe. Nesse caso, a operação permanece bloqueada quanto aos dados oficiais e informa a indisponibilidade, evitando travamento e evitando que um preço substituto seja tratado como dado da B3.
