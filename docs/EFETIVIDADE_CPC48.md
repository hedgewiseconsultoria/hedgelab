# Triagem de efetividade — CPC 48 / IFRS 9

O HEDGE LAB apresenta uma **triagem técnica**, não uma conclusão de contabilização de hedge. O CPC 48 exige que a relação tenha instrumentos e itens elegíveis; seja designada e documentada formalmente no início; e atenda aos requisitos de efetividade, incluindo relação econômica, risco de crédito não dominante e índice de hedge coerente com as quantidades efetivamente protegidas e utilizadas [1].

| Métrica apresentada | Fórmula | Uso no HEDGE LAB | Limite |
|---|---|---|---|
| Offset ratio | `−Δ instrumento / Δ item protegido` | Mostra o grau de compensação na observação | Não é teste isolado de elegibilidade |
| Inefetividade | `Δ item protegido + Δ instrumento` | Mostra a parcela não compensada em BRL | Não determina reconhecimento contábil |
| Hedge ratio nocional | `nocional instrumento / nocional item` | Expõe a razão econômica efetivamente informada | Deve ser confrontado com a documentação e a política |

> O diagnóstico não aplica automaticamente uma faixa percentual herdada de IAS 39. Ele exige a confirmação explícita de todos os critérios do CPC 48.6.4.1 e mantém a decisão de política, designação, documentação e contabilização sob responsabilidade da entidade e de seus profissionais.

| Framework declarado | Tratamento no HEDGE LAB | O que permanece fora do cálculo |
|---|---|---|
| IFRS 9 / CPC 48 | Triagem prospectiva dos critérios do item 6.4.1, com offset, inefetividade e hedge ratio nocional | Decisão de designação, contabilização e julgamento profissional |
| IAS 39 legado | Gate separado de política e documentação declarada, identificado como `IAS39_LEGACY_POLICY_CHECK` | Aplicação automática de banda, teste retrospectivo ou lançamento contábil |

O painel exige a referência da política contábil, os nocionais do item protegido e do instrumento, e exibe `nocional instrumento / nocional item` como hedge ratio. O IFRS 9 mantém capítulo específico de contabilização de hedge e permite, como política contábil, a aplicação dos requisitos de IFRS 9 ou a continuidade dos requisitos de IAS 39 em determinadas circunstâncias [2]. Essa escolha não é inferida pela plataforma.

## Referências

[1]: https://conteudo.cvm.gov.br/export/sites/cvm/menu/regulados/normascontabeis/cpc/CPC_48_Rev_14.pdf "CVM — CPC 48, item 6.4.1"
[2]: https://www.ifrs.org/issued-standards/list-of-standards/ifrs-9-financial-instruments/ "IFRS Foundation — IFRS 9 Financial Instruments"
