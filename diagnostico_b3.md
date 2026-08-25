# Diagnóstico inicial B3

O ZIP não contém a pasta `b3-snapshots/`; contém apenas o workflow e o código que espera que esses snapshots sejam publicados por GitHub Actions. O `render.yaml` aponta para `hedgewiseconsultoria/hedgelab`, branch `main`.

O cache atual consulta a API de conteúdo do GitHub para cada ZIP e para o sidecar SHA-256. Sem arquivos publicados, cai para o download online da B3. O download online possui timeout padrão de 60.000 ms e até três tentativas.

O botão de vínculo em `HedgeDashboard.tsx` chama `collectB3MarketObservations` com `asOf = lastWeekday()`, portanto depende de o snapshot daquele dia existir. Depois, procura somente `instrumentType === "FUTURE"` e `maturity === selectedSituation.horizon_date`. Isso não cobre alternativas de opção, que deveriam procurar `OPTION`, nem cobre vencimentos declarados como data de pagamento quando a série B3 possui outra convenção de vencimento.

O componente de coleta automática usa `collectB3Reports` e, enquanto a mutação está pendente, a UI mostra estado de carregamento. O caminho do servidor ainda pode tentar a B3 online quando o snapshot GitHub não está disponível.

O `B3_REAL_SNAPSHOT` presente no projeto contém somente metadados de cobertura, não preços individuais. Portanto, ele não pode ser usado como cotação substituta.

Correções planejadas: tornar o modo offline/cache explícito e seguro, evitar fallback online por padrão no caminho do usuário, melhorar leitura direta do raw GitHub com timeout único, permitir selecionar snapshot disponível/último dia útil, corrigir matching de FUTURE/OPTION e vencimento, e adicionar testes para os caminhos de sucesso, ausência de snapshot e não travamento.
