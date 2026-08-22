# IPCA acumulado por número-índice — 19/08/2026

## Decisão metodológica

O HEDGE LAB calcula a inflação acumulada com a variável **2266 — número-índice do IPCA** da tabela/agregado 1737 do SIDRA. A escolha decorre dos metadados oficiais, que identificam a tabela como a série histórica de número-índice e variações do IPCA, com periodicidade mensal; os mesmos metadados classificam a variável 2266 como `Número-índice`. [1]

O portal do IBGE descreve a atualização entre duas competências como o produto do valor inicial pelo quociente entre o número-índice do mês final e o número-índice do mês anterior ao mês inicial. [2] O motor reproduz somente esse quociente para a taxa acumulada, sem aplicar correção monetária a um valor, sem construir índice próprio e sem recompor percentuais mensais arredondados.

> `fator acumulado = número-índice do mês final ÷ número-índice do mês anterior ao mês inicial`
>
> `inflação acumulada (%) = (fator acumulado − 1) × 100`

| Elemento | Regra do HEDGE LAB |
|---|---|
| Fonte | API de agregados do IBGE, tabela 1737, variável 2266. |
| Data solicitada | Competência inicial e final, ambas em `AAAAMM`, informadas pelo usuário. |
| Observações usadas | Apenas o índice do mês anterior ao início e o índice do mês final. |
| Localidade | Mesmo identificador de localidade IBGE nas duas observações. |
| Integridade | Cada observação deve ter fonte, arquivo, data-base e SHA-256 válidos. |
| Registro | O snapshot preserva o período-base, os dois números-índice, o fator, o percentual e as duas linhagens. |

## Bloqueios explícitos

O cálculo é recusado se qualquer índice estiver ausente, não for positivo, vier de localidade divergente, não estiver marcado como válido ou não possuir hash. O módulo também não projeta IPCA, não preenche competências, não usa IGP-M como substituto, não cria taxa implícita e não constitui parecer para reajuste contratual.

## Cobertura verificável

| Camada | Verificação |
|---|---|
| Coletor | Confere, nos metadados, o agregado 1737 e a unidade `Número-índice` da variável 2266. |
| Domínio | Calcula pelo quociente de índice final e índice-base imediatamente anterior. |
| Rota | Busca somente as duas competências necessárias na fonte oficial. |
| Interface | Exige intervalo explícito, mostra os dois arquivos e hashes e apresenta o bloqueio sem fallback. |
| Sessão | Publica `IBGE_IPCA_1737_2266_INDEX_RATIO` como cálculo auditável em snapshots e exportações. |

## Referências

[1]: https://servicodados.ibge.gov.br/api/v3/agregados/1737/metadados "IBGE — Metadados do agregado 1737"

[2]: https://www.ibge.gov.br/explica/inflacao.php "IBGE Explica — Inflação e Calculadora do IPCA"
