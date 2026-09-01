# Opções de commodities B3 — confirmação de listagem e limites

A relação pública B3 de lotes padrão, datada de **08/12/2025**, e a página oficial de horários de negociação de derivativos de commodities foram consultadas em 18/08/2026. Ambas confirmam a negociação de opções de compra e venda referenciadas nos futuros **BGI**, **CCM**, **SOY** e **SJC**.

| Família | Confirmação oficial de listagem | Estado no HEDGE LAB |
|---|---|---|
| BGI | Opções de compra e venda sobre Futuro de Boi Gordo com Liquidação Financeira | Alternativa elegível condicionada a série, strike, tipo, vencimento e preço de liquidação do objeto. Sem motor de exercício até validar ficha e convenção específica. |
| CCM | Opções de compra e venda sobre Futuro de Milho com Liquidação Financeira | Mesmo bloqueio: a existência da listagem não supre série, strike, tipo, vencimento ou preço. |
| SOY | Opções sobre Futuro de Soja FOB Santos com Liquidação Financeira (Platts) | Mesmo bloqueio. A cotação do futuro em USD/t não autoriza conversões ou cálculos adicionais. |
| SJC | Opções sobre Futuro de Soja CME Group | Mesmo bloqueio. A referência ao mini contrato CME exige a convenção documentada da opção B3. |

**Fontes oficiais:**

- https://www.b3.com.br/data/files/97/55/B5/C8/2ED0B9105B12E5A9AC094EA8/Relacao%20dos%20lotes%20padrao%20dos%20contratos08_12_2025.pdf
- https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/horario-de-negociacao/derivativos/commodities/

> A documentação apenas confirma a **listagem** e o lote padrão. Ela não foi usada para supor especificação completa, preço de opção, volatilidade implícita, Greeks, prêmio, regra de exercício ou liquidação. Esses módulos permanecem bloqueados até que os campos requeridos sejam obtidos de fonte oficial específica e selecionados auditavelmente.

## Ficha específica validada — opção CCM

A ficha oficial **Opções sobre Futuro de Milho com Liquidação Financeira** foi baixada em 18/08/2026 para `ccm_opcao_especificacao.html`, com SHA-256 `513e72e4dc11b21b9f2a9300c72616941e9cbf4e864e292646c03e2dbc5b29d7`.

| Campo confirmado | Valor da ficha B3 |
|---|---|
| Código | CCM |
| Estilo | Americano |
| Tamanho | 450 sacas de 60 kg líquidos |
| Cotação do prêmio | Reais por saca, duas casas decimais |
| Variação mínima | R$ 0,01 |
| Lote padrão | 1 contrato |
| Vencimento | Dia 15 do mês, ou dia útil subsequente |
| Exercício no vencimento | Automático e condicionado à opção estar dentro do dinheiro, salvo manifestação de não exercício pelo titular |

Fonte oficial: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C89DAACE31019DC0ECE703055B.htm

> Somente o exercício intrínseco no vencimento foi habilitado com esses campos. Prêmio, MTM, volatilidade implícita e Greeks não foram calculados.

## Ficha específica validada — opção BGI

A ficha oficial **Opções sobre Futuro de Boi Gordo com Liquidação Financeira** confirma o código BGI, estilo americano, tamanho de **330 arrobas líquidas**, prêmio em reais por arroba, lote padrão de 1 contrato e exercício automático condicionado no vencimento.

Fonte oficial: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C89DAACE31019DC0ECE33903BF.htm

> A ficha foi preservada como evidência para uma etapa posterior. Nenhum motor BGI foi habilitado nesta atualização, pois a implementação deverá primeiro capturar o arquivo e seu SHA-256 e exigir observação B3 selecionada para preço, série e vencimento.

## Fichas específicas consultadas — opções de soja

| Família | Campos oficiais confirmados | Estado quantitativo |
|---|---|---|
| SOY | Opção americana; 34 toneladas métricas; prêmio em US$/t; exercício automático condicionado no vencimento. | Campos suficientes para um futuro motor de exercício intrínseco em USD, desde que a ficha seja capturada com hash e a liquidação B3 seja selecionada. |
| SJC | Opção americana sobre o Minicontrato Futuro de Soja CME Group; prêmio em US$/saca de 60 kg; lote padrão 1. A ficha oficial do futuro objeto confirma 450 sacas de 60 kg (27 t), cotadas em USD por saca. | Unidade e tamanho confirmados por ficha oficial distinta; ainda exige captura hashada, série e liquidação B3 antes de motor. |

Fontes oficiais:

- SOY: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C89DAACE31019DC0ECE7FE05C2.htm
- SJC: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C96D41D3A2016D45F70AF92752.htm
- Futuro-objeto SJC: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C96D41D3A2016D45F4569B14F0.htm
