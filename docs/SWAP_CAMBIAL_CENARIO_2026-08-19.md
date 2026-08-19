# Cenário de fluxo de swap cambial — 19/08/2026

## Escopo entregue

O HEDGE LAB passa a oferecer um **cenário de fluxo** para a alternativa de swap cambial bilateral diagnosticada em exposições USD. O cartão exige que o usuário selecione um Instrument Master `OTC_FX_SWAP` previamente preservado com arquivo e SHA-256 e que exista uma designação de hedge para a mesma exposição. Ele não seleciona contrato, exposição, data-base, taxa ou calendário por inferência.

| Requisito de publicação | Verificação aplicada |
|---|---|
| Contrato bilateral | `instrument_id` explícito, tipo `OTC_FX_SWAP` e status `validated_user_contract`. |
| Evidência contratual | SHA-256 informado no snapshot deve coincidir exatamente com o hash do Instrument Master. |
| Designação | Deve existir uma linha `SWAP_CAMBIAL_CONTRATUAL` para o mesmo contrato. |
| Alternativa econômica | Deve existir alternativa `OTC_FX_SWAP`, de status `contract_required`, para a mesma exposição USD. |
| Mercado e fonte | Data-base e SHA-256 de PTAX e Selic são obrigatórios no snapshot; a referência institucional BCB também fica registrada. |

## Resultado e limites

O motor identifica o resultado como `BCB_TRADITIONAL_FX_SWAP_CASHFLOW_SCENARIO` e preserva `pricing_status = cashflow_scenario_not_contract_mtm`. Portanto, a publicação canônica é um **fluxo de cenário em BRL**: não é MTM, valor justo, margem, emolumento, custo de contraparte ou replicação das cláusulas particulares do contrato.

> Os valores de câmbio, cupom, Selic e dias úteis são parâmetros declarados do cenário e do contrato. O cartão os separa de observações oficiais e não cria cotações, curvas ou convenções substitutas.

O cálculo referencia a página institucional de swap cambial do Banco Central como origem descritiva da estrutura de comparação entre a perna cambial e a perna doméstica [1]. A evidência contratual do usuário continua sendo indispensável, pois a página institucional não especifica o contrato bilateral individual.

## Cobertura verificável

| Camada | Cobertura |
|---|---|
| Motor | Exige `contractId` não vazio e devolve esse identificador no resultado. |
| Rota | Recebe o `contractId` como campo obrigatório do cenário. |
| DataFrame canônico | Promove somente com contrato, hash, designação, alternativa e linhagem estruturada; hash divergente mantém o DataFrame inalterado. |
| Interface | Bloqueia o cálculo sem contrato designado e sem os SHA-256 de PTAX e Selic. |

## Inspeção de runtime

A prévia do dashboard em 19/08/2026 confirmou a presença do cartão **“Cenário de fluxo do swap cambial”** na sessão vazia. Sem Instrument Master OTC e designação explícita, o seletor permanece sem contrato elegível e o cálculo continua bloqueado; esse estado é intencional e não cria um contrato, uma taxa ou uma exposição de demonstração.

### Referências

[1]: https://www.bcb.gov.br/estabilidadefinanceira/swapcambial "Banco Central do Brasil — Swap cambial"
