# Calendários oficiais e convenções de dias úteis — 2026

O HEDGE LAB mantém calendários separados por finalidade. O calendário de negociação da B3 é aplicado a instrumentos negociados em bolsa; a tabela de feriados nacionais bancários da ANBIMA é aplicada a convenções financeiras que dependem de dias úteis bancários. A aplicação não cria feriados estaduais, municipais ou de anos não publicados pelas fontes abaixo.

| Calendário | Uso no produto | Datas adicionais de 2026 relevantes | Fonte oficial |
|---|---|---|---|
| `B3_TRADING_2026` | Pregão, instrumentos listados e D+1 baseado em sessão de negociação | 24 e 31 de dezembro não têm sessão; 18 de fevereiro conta como dia útil com horário especial. | B3, comunicado de 09/01/2026 [1] |
| `ANBIMA_BANKING_2026` | Dias úteis bancários de curvas e convenções financeiras | 24 e 31 de dezembro não constam na tabela de feriados nacionais bancários; a aplicação não os exclui nesse calendário. | ANBIMA, tabela 2026 [2] |

> A contagem implementada usa o intervalo **(data inicial, data final]**: exclui a data inicial e inclui a final. Assim, `D+1` é o primeiro dia útil posterior à data de negociação no calendário explicitamente escolhido.

Cada função recusa datas fora de 2026. Essa restrição é intencional: evita estender um conjunto de feriados por inferência quando a fonte oficial ainda não foi atualizada.

## Referências

[1]: https://www.b3.com.br/pt_br/noticias/calendario-de-negociacao-da-b3-confira-o-funcionamento-da-bolsa-em-2026.htm "B3 — Calendário de negociação de 2026"
[2]: https://www.anbima.com.br/feriados/fer_nacionais/2026.asp "ANBIMA — Feriados nacionais de 2026"
