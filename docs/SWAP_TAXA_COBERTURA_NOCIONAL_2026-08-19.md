# Cobertura nocional de swap de taxa — 19/08/2026

## Resultado canônico permitido

O HEDGE LAB publica uma linha de `hedge_sizing_dataframe` para `OTC_RATE_SWAP` exclusivamente como **referência nocional contratual**. A saída compara o nocional BRL declarado do contrato com a quantidade BRL declarada da dívida CDI, na mesma data de vencimento. Ela não converte esse quociente em uma equivalência de taxa, duration, cupom ou valor econômico.

| Condição cumulativa | Regra de validação |
|---|---|
| Contrato | Instrument Master `OTC_RATE_SWAP` com arquivo e SHA-256, status `validated_user_contract` e moedas BRL/BRL. |
| Termos | Posição nas pernas, indexador flutuante, convenção fixa, calendário de pagamentos e datas válidos no contrato. |
| Exposição | Situação `CDI_LINKED_DEBT`, moeda BRL, índice CDI e horizonte igual ao vencimento contratual. |
| Designação | Linha `SWAP_TAXA_CONTRATUAL`, quantidade inteira positiva e vencimento igual ao do contrato. |
| Alternativa | Alternativa canônica `OTC_RATE_SWAP` com estado `contract_required` para a mesma exposição. |

## Fórmula e limitação

> `cobertura bruta (%) = quantidade contratual × nocional BRL do swap ÷ nocional BRL declarado da dívida × 100`

O campo `coverage_target_pct` é limitado a 100% para representar a parcela da exposição coberta. Caso a cobertura bruta exceda 100%, o percentual integral e a sobrecobertura permanecem registrados na limitação auditável. O método não cria taxa, curva, cupom, MTM, DV01, valor justo ou resultado financeiro.

## Rejeição segura

O DataFrame canônico não é alterado quando há moeda diversa de BRL, ausência de hash, termos incompletos, exposição que não seja dívida CDI, vencimento divergente, designação ausente ou alternativa incompatível. Portanto, não existe fallback baseado em SELIC, curva DI, taxa over ou taxa fixa presumida.

## Cobertura automatizada

| Cenário | Resultado verificado |
|---|---|
| Contrato BRL hasheado + dívida CDI BRL + designação + vencimento igual | Linha canônica com cobertura nocional de 100% e limitação quantitativa explícita. |
| Índice CDI ausente ou convenção da perna fixa vazia | DataFrame permanece inalterado. |
| Integração do dashboard | Atualizações de diagnóstico, contratos e designações recompõem a cobertura antes de snapshots e exportações. |

## Visão consolidada

O dashboard também apresenta o cartão **Dívida CDI e cobertura contratual**. Ele totaliza exclusivamente as situações econômicas `CDI_LINKED_DEBT` declaradas em BRL e mostra, por vencimento, a cobertura nocional de `OTC_RATE_SWAP` já publicada. A tabela se mantém em estado pendente enquanto não houver a referência contratual elegível e conserva o bloqueio de risco de juros, curva, taxa over, MTM e DV01.
