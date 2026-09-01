# Redeploy estável do HEDGE LAB no Render

Esta atualização corrige os principais riscos que levavam o serviço a ficar indisponível: o servidor passa a ouvir **exatamente** a porta definida pelo Render, expõe uma rota de saúde leve em `/healthz`, limita a memória do armazenamento temporário e evita que a atualização automática B3 retenha arquivos grandes ou aguarde indefinidamente.

## Arquivos a enviar ao GitHub

Substitua o conteúdo do repositório pelo pacote leve entregue, mantendo os arquivos e pastas do projeto. O pacote já exclui `node_modules`, `dist`, `.git`, `.audit-sources` e logs. Os arquivos mais relevantes desta estabilização são:

| Arquivo | Papel |
|---|---|
| `server/_core/index.ts` | Porta explícita e rota `/healthz`. |
| `server/storage.ts` | Limite seguro para objetos temporários em memória. |
| `server/routers.ts` | Coleta B3 automática curta e sem retenção de ZIP bruto; DI1 filtrado durante o parsing. |
| `server/ingestion/b3OfficialDownload.ts` | Tentativas e timeout configuráveis. |
| `render.yaml` | Configuração reproduzível do serviço Render. |

## Configuração do Web Service

No painel do Render, abra o serviço **HEDGE LAB** e confirme os seguintes valores na aba de configuração:

| Campo | Valor |
|---|---|
| Environment | `Node` |
| Build Command | `corepack enable && pnpm install --frozen-lockfile && pnpm build` |
| Start Command | `pnpm start` |
| Health Check Path | `/healthz` |
| Node Version | `22.13.0` |

> Não defina manualmente a variável `PORT`. O Render a fornece automaticamente e o HEDGE LAB agora a utiliza sem trocar para outra porta.

## Ordem de implantação

Primeiro envie os arquivos atualizados ao branch conectado ao Render. Em seguida, no serviço Render, selecione **Manual Deploy → Deploy latest commit**. Aguarde o log informar `Server running on http://localhost:10000/` — a porta exibida pode variar porque é definida pelo Render — e a verificação de saúde ficar verde.

Depois abra `https://SEU-SERVICO.onrender.com/healthz`. A resposta esperada é:

```json
{"status":"ok","service":"hedge-lab"}
```

Somente depois abra a página principal. Na primeira abertura, a B3 pode ficar temporariamente indisponível; nesse caso, a aplicação deve permanecer aberta e mostrar o boletim como indisponível, sem 502, sem HTML em chamadas tRPC e sem preços substitutos. A nova tentativa manual utiliza uma janela maior que a atualização automática.

## Critério de confirmação

Considere o deploy estabilizado quando `/healthz` responder `200`, a página inicial abrir, o cadastro de pagamento USD mostrar alternativas e a atualização B3 retornar disponibilidade ou bloqueio orientativo, nunca erro 502.
