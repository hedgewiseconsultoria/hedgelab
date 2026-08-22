# Cobertura de commodities B3 — validação inicial

Esta nota registra as características oficiais confirmadas antes da expansão do HEDGE LAB. A referência temporal da consulta é 22 de agosto de 2026. Nenhum preço, prêmio, taxa ou resultado de hedge é inferido desta documentação.

| Ativo | Futuro B3 | Opção B3 | Unidade e cotação confirmadas | Liquidação do futuro |
|---|---|---|---|---|
| Café Arábica 4/5 | ICF | OPF ICF | 100 sacas de 60 kg; US$/saca | Física |
| Café Conilon Robusta | CNL | OPF CNL | 100 sacas de 60 kg; R$/saca | Física |
| Etanol Hidratado | ETH | OPF ETH | 30 m³ / 30.000 litros; R$/m³ | Financeira |
| Ouro | GLD | OPF GLD | 1 onça; US$/onça | Financeira, pelo LBMA Gold Price PM |
| Boi Gordo | BGI | OPF BGI | Evidência de ficha B3 já preservada no projeto | Conforme ficha preservada |
| Milho Financeiro | CCM | OPF CCM | Evidência de ficha B3 já preservada no projeto | Conforme ficha preservada |
| Soja FOB Santos | SOY | OPF SOY | Evidência de ficha B3 já preservada no projeto | Conforme ficha preservada |
| Soja referenciada no mini de soja CME | SJC | OPF SJC | Evidência de ficha B3 já preservada no projeto | Conforme ficha preservada |

As páginas de horário de negociação da B3 confirmam a negociação dos futuros e opções de ICF, CNL, BGI, ETH, CCM, SOY, SJC e GLD. A inclusão na interface deve separar a posição física de compra ou venda da posição do instrumento derivativo: a direção não será presumida pelo sistema.

## Evidência preservada no projeto

| Contrato | Artefato | SHA-256 | Captura |
|---|---|---|---|
| ICF | `icf_futuro_especificacao.html` | `5c20426108acee119e25778b71fad00a9319558f5512d91d850d4959fba4d1ce` | 22/08/2026 |
| CNL | `cnl_futuro_especificacao.html` | `d504dfc4f980ab08429b4e0322dc1c1e113ead18b4fe215cf1aa4d02493d2efe` | 22/08/2026 |
| ETH | `eth_futuro_especificacao.html` | `4f141013e565ae1671dd2293e2cce13c6b5b7b3327a256a98fafaaefbb8326e0` | 22/08/2026 |
| GLD | `gld_futuro_especificacao.html` | `923b06ce046d7b7d097e08ddf24feb66a516c9bda024278740181898aadb4098` | 22/08/2026 |

As quatro fichas acima sustentam apenas o cadastro econômico e o dimensionamento físico homogêneo. A existência de uma série, preço, prêmio ou liquidez permanece condicionada a uma observação B3 compatível e com a mesma data-base.

## Fontes oficiais

1. [Horário de negociação de derivativos de commodities — B3](https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/horario-de-negociacao/derivativos/commodities/)
2. [Futuro de Café Arábica Tipo 4/5 — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE49B513B.htm)
3. [Futuro de Café Conilon Robusta — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE4C25165.htm)
4. [Futuro de Etanol Hidratado com Liquidação Financeira — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CD95C8AFE30196115C01732650.htm)
5. [Futuro de Ouro com Liquidação Financeira — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC982C97FE01982D320A3A5A93.htm)
6. [Futuro de Boi Gordo com Liquidação Financeira — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE4755111.htm)
7. [Futuro de Milho com Liquidação Financeira — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490CA6D41D4C7016D45F3CB0A38F0.htm)
8. [Futuro de Soja FOB Santos — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE55D520D.htm)
9. [Futuro de Soja referenciado no Mini de Soja CME — B3](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C96D41D3A2016D45F4569B14F0.htm)
