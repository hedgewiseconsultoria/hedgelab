# Publicação manual da correção do catálogo B3

> **Para o ZIP completo:** o arquivo `hedgelab_completo_corrigido.zip` contém a árvore inteira do projeto, já com a correção aplicada. Extraia-o e use a pasta interna `hedgelab_repo` como a nova cópia completa do projeto. Não crie `hedgelab_repo` dentro de outra pasta `hedgelab_repo`; se for substituir uma cópia local existente, faça backup dela e copie todo o conteúdo da pasta interna para a raiz do repositório local.

> **Para o pacote parcial:** o arquivo `hedgelab_manual_catalogo_b3.zip` contém somente os arquivos alterados e deve ser aplicado sobre uma cópia completa já existente do projeto.

## Objetivo

Esta entrega corrige o caminho que fazia a Etapa 2 ficar aguardando ou exibindo “nenhum contrato” mesmo quando os boletins oficiais da B3 já estavam disponíveis. O servidor passa a consultar primeiro um índice compacto, verificado por SHA-256, e somente mantém o processamento pesado dos XMLs como fallback. Para a exposição de teste com horizonte **10/11/2026**, o índice oficial de 24/08/2026 seleciona o contrato **DOLX26**, com vencimento **03/11/2026** e preço de ajuste **5.228,133**.

O preço acima não é um valor criado pela aplicação: ele está no snapshot diário oficial versionado em `b3-snapshots/2026-08-24/catalog.json`, acompanhado do arquivo `catalog.json.sha256` e da linhagem dos arquivos XML usados para produzir o índice.

## Conteúdo que precisa ser enviado

| Caminho | Finalidade |
|---|---|
| `.github/workflows/b3-daily-snapshot.yml` | Gera o índice compacto junto com o snapshot diário e publica os artefatos oficiais. |
| `server/ingestion/b3SnapshotCache.ts` | Lê o índice local ou o arquivo bruto do GitHub, valida SHA-256 e usa timeout limitado. |
| `server/routers.ts` | Responde o catálogo pelo caminho rápido antes da coleta pesada. |
| `server/domain/b3MarketDataset.ts` | Mantém a seleção determinística por horizonte e tipo de instrumento. |
| `server/domain/canonicalB3ObservationLink.ts` | Permite vínculo auditável baseado em linhagem XML quando a seleção vem do índice compacto. |
| `server/domain/dataframes.ts` | Aceita ausência explícita de CSV normalizado sem inventar artefato. |
| `server/domain/scenarioBundle.ts` | Mantém a validade do bundle exportado com esse tipo de evidência. |
| `client/src/components/HedgeDashboard.tsx` | Consulta o catálogo uma única vez por diagnóstico e usa o contrato na operação selecionada. |
| `client/src/components/EligibleAlternativesComparisonCard.tsx` | Exibe contratos, vencimentos, preços e bloqueios na Etapa 2. |
| `client/src/components/HedgeAlternativeDecisionMatrixCard.tsx` | Compara a mesma exposição entre alternativas e informa o estado real de cada uma. |
| `client/src/components/HedgeDashboard.test.tsx` | Atualiza o mock da consulta de catálogo. |
| `scripts/build-b3-catalog-index.ts` | Gera o índice compacto a partir dos ZIPs oficiais recém-baixados. |
| `b3-snapshots/2026-08-24/catalog.json` | Índice compacto oficial já gerado para o snapshot disponível. |
| `b3-snapshots/2026-08-24/catalog.json.sha256` | Hash SHA-256 do índice compacto. |

O arquivo `MANUAL_DEPLOY_CATALOGO_B3.md` é apenas este manual e pode ser mantido no repositório ou omitido do deploy. Não envie `node_modules`, `dist`, `.git` ou arquivos de diagnóstico temporários.

## Procedimento recomendado

### 1. Baixar e extrair o pacote

Baixe o ZIP entregue junto com este manual e extraia seu conteúdo. Preserve os caminhos relativos exatamente como aparecem na tabela. O arquivo `catalog.json` precisa permanecer dentro de `b3-snapshots/2026-08-24/`; não o mova para a raiz do projeto.

### 2. Substituir os arquivos no repositório

A forma mais segura é abrir uma cópia local do repositório `https://github.com/hedgewiseconsultoria/hedgelab`, copiar os arquivos do pacote para os caminhos correspondentes e criar um commit na branch `main`. Se usar a interface web do GitHub, substitua os arquivos de código individualmente e faça o upload dos dois arquivos dentro de `b3-snapshots/2026-08-24/`. O arquivo compacto tem aproximadamente 10 MB; aguarde o upload terminar antes de confirmar o commit.

Use uma mensagem de commit identificável, por exemplo:

```text
fix(b3): catálogo compacto oficial por horizonte
```

Depois de confirmar o commit, verifique no GitHub se estes dois endereços existem na branch `main`:

```text
https://raw.githubusercontent.com/hedgewiseconsultoria/hedgelab/main/b3-snapshots/2026-08-24/catalog.json
https://raw.githubusercontent.com/hedgewiseconsultoria/hedgelab/main/b3-snapshots/2026-08-24/catalog.json.sha256
```

### 3. Conferir as variáveis do Render

No serviço web `hedgelab`, abra **Environment** e confirme as variáveis abaixo. Como o repositório é público, não é necessário token para ler os snapshots.

| Variável | Valor |
|---|---|
| `NODE_VERSION` | `22.13.0` |
| `B3_SNAPSHOT_CACHE_GITHUB_OWNER` | `hedgewiseconsultoria` |
| `B3_SNAPSHOT_CACHE_GITHUB_REPO` | `hedgelab` |
| `B3_SNAPSHOT_CACHE_GITHUB_BRANCH` | `main` |

Não configure `B3_SNAPSHOT_CACHE_ROOT` no Render. Essa variável é usada somente pelo workflow para ler arquivos locais durante a geração do índice; em produção, o servidor deve ler o `catalog.json` publicado no GitHub.

O `render.yaml` versionado mantém estes comandos:

```text
Build Command: npm install -g corepack@latest && corepack enable && pnpm install --frozen-lockfile && pnpm build
Start Command: pnpm start
Health Check Path: /healthz
```

### 4. Fazer o redeploy

Após o commit aparecer na branch `main`, abra o serviço no Render e escolha **Manual Deploy → Deploy latest commit** caso o auto-deploy esteja desativado. Aguarde o status **Live** e confirme primeiro o endpoint de saúde:

```text
https://hedgelab.onrender.com/healthz
```

Depois abra `https://hedgelab.onrender.com/exposicoes`, registre uma exposição em USD com data futura, execute o diagnóstico e confira a Etapa 2. Para uma exposição com horizonte `2026-11-10`, o card do futuro de dólar deve mostrar o contrato `DOLX26`, vencimento `2026-11-03` e o preço de ajuste oficial, em vez de permanecer indefinidamente em “Catálogo B3 sendo carregado”.

### 5. Verificação da resposta do catálogo

Se precisar separar problema de deploy de problema de dados, abra no navegador ou no terminal o endpoint tRPC equivalente ao catálogo, usando esta entrada JSON codificada na query `input`:

```json
{"0":{"json":{"asOf":"2026-08-24","requests":[{"family":"DOL","horizonDate":"2026-11-10","instrumentType":"FUTURE"}]}}}
```

A resposta correta deve conter `associationStatus: "valid"`, `retrievalSource: "github_snapshot_cache"`, uma observação `symbol: "DOLX26"` e `adjustedQuote: 5228.133`. Se aparecer `B3_CATALOG_SNAPSHOT_UNAVAILABLE`, confira os dois arquivos no GitHub e as quatro variáveis de ambiente do Render. Se a resposta ficar pendente por dezenas de segundos, o serviço ainda está executando uma versão anterior ou não está lendo o caminho compacto.

## Como o fluxo passa a funcionar

Depois do diagnóstico, o frontend envia uma única consulta com as famílias e os horizontes das alternativas geradas. O backend valida o hash do índice compacto, filtra a família e aplica a regra de seleção: primeiro vencimento exato, depois mesmo mês e, por fim, o próximo vencimento posterior. A operação selecionada reutiliza o candidato do catálogo e publica sua linhagem oficial, sem repetir a coleta de XML.

A interface diferencia três situações. **Efetivo** significa que existe observação oficial compatível e preço/ajuste observável. **Didático** significa que a alternativa pode ser estudada com parâmetros declarados, mas não possui evidência B3 suficiente para MTM ou resultado efetivo. **Bloqueado** significa que a fonte, o contrato, a associação ou o preço obrigatório estão ausentes; nesse caso a aplicação mostra a razão e não substitui a falta por um preço inventado.

## Validação feita antes da entrega

A correção foi verificada localmente com o check de TypeScript, a suíte completa e o build de produção. O endpoint local com o índice compacto respondeu em aproximadamente 0,09 segundo para o caso DOL, retornando `DOLX26` e o ajuste oficial `5228.133`. A suíte registrou 302 testes aprovados e 6 ignorados; o build terminou com sucesso, mantendo apenas os avisos já existentes sobre Analytics opcional e tamanho do bundle.

## Diagnóstico da versão anterior

A versão publicada durante a reprodução reconhecia a fonte B3, mas o caminho do catálogo ainda executava a coleta pesada dos XMLs durante a requisição. No Render Free, essa operação podia permanecer pendente por mais de dois minutos. A correção tira o processamento do caminho interativo: o workflow diário gera o índice compacto fora da requisição, o servidor valida o arquivo leve e a tela recebe contratos compatíveis em baixa latência.
