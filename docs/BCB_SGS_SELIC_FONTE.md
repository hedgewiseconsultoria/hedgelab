# Fonte oficial BCB — séries SGS 11 e 1178 (Selic)

O Portal de Dados Abertos do Banco Central do Brasil identifica o recurso `json_serie-sgs-11` como **Taxa de juros — Selic**. A interface JSON do serviço BCData/SGS usa o padrão `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo_serie}/dados?formato=json&dataInicial={dd/MM/aaaa}&dataFinal={dd/MM/aaaa}`. O portal determina o uso de filtros para séries diárias e limita as consultas por período a dez anos [1].

Para a série 11, o recurso oficial oferece como exemplo `https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json&dataInicial=01/01/2023&dataFinal=31/12/2023`. A aplicação a expõe como observação diária oficial e não aplica capitalização, anualização ou acumulação automática.

## Série anualizada oficial SGS 1178

O BCB também publica a **série SGS 1178 — Taxa de juros: Selic anualizada base 252**. O conjunto é diário, tem unidade em percentual ao ano e representa a taxa média ajustada das operações compromissadas de um dia útil lastreadas em títulos públicos federais custodiados no Selic [2]. Portanto, o HEDGE LAB coleta a 1178 diretamente pela API oficial; não a calcula a partir da série 11.

| Série | Natureza tratada pelo produto | Uso permitido | Tratamento bloqueado |
|---|---|---|---|
| SGS 11 | Observação diária retornada pelo BCB | Consulta, coleta auditável, payload bruto, DataFrame e linhagem | Anualização, acumulação ou substituição automática por taxa anual |
| SGS 1178 | Observação diária anualizada em base 252 retornada pelo BCB | Consulta e coleta auditável como fonte anualizada oficial | Inferir curva, preço, MTM ou convenção de instrumento sem dados e documentação específicos |

> A disponibilidade de uma observação anualizada oficial elimina a necessidade de derivar a 1178 da série 11, mas não valida por si só o uso da taxa em desconto, precificação, contabilização ou risco de uma exposição concreta.

Qualquer motor que demande taxa anualizada deve declarar o identificador `BCB_SGS_1178_SELIC_AA252`, preservar a data-base, o hash e a linhagem da observação e permanecer sujeito às convenções econômicas e contratuais do instrumento.

## Referências

[1]: https://dadosabertos.bcb.gov.br/dataset/11-taxa-de-juros---selic/resource/b73edc07-bbac-430c-a2cb-b1639e605fa8 "Banco Central do Brasil — SGS 11: Taxa de juros - Selic"
[2]: https://dadosabertos.bcb.gov.br/dataset/1178-taxa-de-juros---selic-anualizada-base-252 "Banco Central do Brasil — SGS 1178: Taxa de juros - Selic anualizada base 252"
[3]: https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados/ultimos/10?formato=json "Banco Central do Brasil — API BCData/SGS 1178"
