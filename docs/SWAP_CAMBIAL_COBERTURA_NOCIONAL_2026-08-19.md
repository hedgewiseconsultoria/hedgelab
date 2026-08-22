# Cobertura nocional de swap cambial — 19/08/2026

## Escopo canônico

O HEDGE LAB publica uma linha de `hedge_sizing_dataframe` para `OTC_FX_SWAP` apenas como **referência nocional contratual**. A relação compara o nocional USD do contrato bilateral com a exposição USD declarada no mesmo vencimento. Nenhuma taxa de câmbio, cupom, curva, taxa implícita, custo de contraparte ou resultado econômico é estimado por esse vínculo.

| Condição cumulativa | Validação aplicada |
|---|---|
| Contrato | Instrument Master `OTC_FX_SWAP`, moedas USD/BRL, arquivo e SHA-256, status `validated_user_contract`. |
| Pernas | Indexadores doméstico e estrangeiro, início e fim das pernas declarados; o fim deve ser posterior ao início. |
| Exposição | Situação econômica `USD_PAYABLE` ou `USD_RECEIVABLE`, moeda USD e horizonte igual ao vencimento contratual. |
| Designação | Linha `SWAP_CAMBIAL_CONTRATUAL`, quantidade inteira positiva e vencimento coincidente. |
| Alternativa | Alternativa canônica `OTC_FX_SWAP` com estado `contract_required` para a mesma exposição. |

## Fórmula e limites

> `cobertura bruta (%) = quantidade contratual × nocional USD do swap ÷ nocional USD declarado da exposição × 100`

`coverage_target_pct` é limitado a 100% por exposição. Se houver sobrecobertura, o percentual bruto continua na limitação auditável. A publicação não é uma recomendação de hedge, uma cotação de swap, um valor presente, MTM, avaliação de contraparte ou resultado financeiro.

## Rejeição segura e cobertura

O DataFrame não muda se o contrato não for USD/BRL, se faltar hash, se as pernas não estiverem declaradas, se a exposição não for USD, se a designação ou o vencimento divergirem ou se a alternativa não estiver materializada. Os testes cobrem o caso completo e o bloqueio por perna ausente ou vencimento divergente; o dashboard recompõe essa cobertura antes de snapshots e exportações da sessão.
