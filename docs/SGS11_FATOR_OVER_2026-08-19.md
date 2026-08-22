# Fator acumulado da taxa over SGS 11 — 19/08/2026

O HEDGE LAB adiciona o método `BCB_SGS_11_DAILY_OVER_COMPOUND`. Ele capitaliza somente as observações diárias retornadas pela série SGS 11 no intervalo informado, conferindo a continuidade contra o calendário bancário ANBIMA 2026 já versionado na sessão.

> `fator over = ∏ (1 + taxa diária SGS 11 ÷ 100)`

| Salvaguarda | Aplicação |
|---|---|
| Fonte | A série deve ser `BCB_SGS_11_SELIC`, com resposta válida e SHA-256. |
| Continuidade | Há uma observação SGS 11 para cada dia útil bancário entre início e fim. |
| Calendário | `ANBIMA_BANKING_2026`, rastreado com URL e descrição no resultado. |
| Escopo | Datas inicial e final precisam pertencer a 2026 e ser dias úteis bancários. |
| Bloqueios | Feriado, fim de semana, lacuna, duplicidade, annualização, curva, interpolação, MTM e taxa contratual não são inferidos. |

O cartão do dashboard registra data inicial, data final, fator, percentual, observações e linhagens BCB/ANBIMA em snapshot da sessão. Esse resultado é um fator over observado, e não uma curva de juros, taxa anualizada, preço de instrumento, valor presente ou recomendação de hedge.

## Referência

[1]: https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json "Banco Central do Brasil — API SGS, série 11"
