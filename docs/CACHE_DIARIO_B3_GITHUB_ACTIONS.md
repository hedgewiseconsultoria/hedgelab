# Cache diário de boletins B3 via GitHub Actions

## Por que isso existe

O HEDGE LAB nunca inventa preço, série ou cotação. Os boletins oficiais da B3
(`BVBG.028.02` — instrumentos, `BVBG.086.01` — preços, `BVBG.187.01` — preços simplificados) são
públicos e gratuitos, mas baixá-los **durante a requisição do usuário** é lento e não é confiável
no plano gratuito do Render (timeouts observados acima de 25s para arquivos de alguns MB).

A solução não é usar um feed pago nem inventar dado: é buscar o mesmo arquivo público **fora**
do caminho da requisição, uma vez por dia, e deixá-lo pronto para leitura rápida.

## Como funciona

1. `.github/workflows/b3-daily-snapshot.yml` roda de segunda a sexta às 18:30 (horário de
   Brasília), sem custo, usando GitHub Actions.
2. `scripts/collect-b3-daily-snapshot.mjs` baixa os três boletins oficiais direto da B3 (mesma
   URL pública que o app usaria ao vivo) e grava os bytes **exatamente como recebidos**, mais um
   sidecar `.sha256`, em `b3-snapshots/{AAAA-MM-DD}/{tipo}/`.
3. O workflow commita esses arquivos no repositório.
4. No servidor, `server/ingestion/b3SnapshotCache.ts` tenta ler esse mesmo arquivo (via API do
   GitHub) **antes** de tentar um download ao vivo. Se o hash não confere ou o snapshot não
   existe para a data pedida, ele simplesmente devolve `null` e o app cai para o download ao
   vivo já existente — nenhum comportamento novo é obrigatório, e nada é inventado.

Como os bytes salvos são idênticos aos que a B3 serviria ao vivo, o parser, a validação de hash e
a linhagem (`lineage`) funcionam sem nenhuma alteração — a única diferença visível é o campo
`retrievalSource` (`"live"` ou `"github_snapshot_cache"`) no resultado da coleta.

## Configuração necessária

### Repositório público (configuração atual do HEDGE LAB — `hedgewiseconsultoria/hedgelab`)
Nenhuma variável de autenticação é obrigatória: leitura anônima da API do GitHub funciona para
repositórios públicos. O `render.yaml` já vem com `B3_SNAPSHOT_CACHE_GITHUB_OWNER`,
`B3_SNAPSHOT_CACHE_GITHUB_REPO` e `B3_SNAPSHOT_CACHE_GITHUB_BRANCH` pré-preenchidos.

> Atenção: a API do GitHub tem um limite de 60 requisições/hora por IP para chamadas anônimas.
> Isso é suficiente para o volume esperado (poucas leituras por dia, uma por tipo de boletim),
> mas se o app começar a bater nesse limite, o caminho normal é gerar um token de leitura (veja
> abaixo) — a leitura autenticada sobe o limite para 5.000/hora mesmo em repositório público.

### Se o repositório se tornar privado no futuro
1. Crie um **fine-grained personal access token** em
   github.com → Settings → Developer settings → Fine-grained tokens, com:
   - Repository access: apenas este repositório.
   - Permissions: **Contents → Read-only** (nada além disso).
2. No Render, adicione a variável de ambiente do serviço web:

   | Variável | Valor |
   |---|---|
   | `B3_SNAPSHOT_CACHE_GITHUB_TOKEN` | o token gerado acima |

3. O workflow em si **não precisa** desse token: `actions/checkout` + `GITHUB_TOKEN` automático
   do Actions já tem permissão de escrita no próprio repositório (`permissions: contents: write`
   no workflow cobre isso), pública ou privada.

Sem essas variáveis configuradas, o app continua funcionando exatamente como antes (download ao
vivo a cada requisição) — a ausência de configuração nunca quebra nada, apenas deixa de acelerar.

## Testando localmente

```bash
node scripts/collect-b3-daily-snapshot.mjs
```

Isso grava `b3-snapshots/` localmente sem commitar nada — útil para conferir se a coleta está
funcionando antes de depender do agendamento do Actions.
