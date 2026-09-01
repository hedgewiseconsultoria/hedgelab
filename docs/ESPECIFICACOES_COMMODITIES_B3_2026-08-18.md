# Especificações oficiais B3 — commodities

As páginas abaixo foram consultadas e baixadas em **2026-08-18T05:08:32.000Z**. Os arquivos HTML originais foram preservados fora do artefato de produção em `.audit-sources/b3-commodities/`; seus hashes SHA-256 identificam a evidência usada pelo Instrument Master. Nenhuma série, vencimento, preço, margem ou regra de dimensionamento foi inferida a partir destas fichas.

| Família | Produto e código B3 | Campos materializados | URL oficial | Arquivo | SHA-256 |
|---|---|---|---|---|---|
| BGI | Futuro de Boi Gordo com Liquidação Financeira | 330 arrobas; R$/arroba; variação mínima R$ 0,05; lote 1; liquidação financeira; vencimento na última sessão do mês | https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE4755111.htm | `bgi_futuro_especificacao.html` | `e365bcaaf714904f23ecb977a26eaa6ca76fb33bdc581c23ab7d65a7ee661999` |
| CCM | Futuro de Milho com Liquidação Financeira | 450 sacas de 60 kg (27 t); R$/saca; variação mínima R$ 0,01; lote 1; liquidação financeira; vencimento dia 15 ou próxima sessão | https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490CA6D41D4C7016D45F3CB0A38F0.htm | `ccm_futuro_especificacao.html` | `ce71aa7b8f26c2ca73334d9e7090114b38db8a86d663b85962ae01847f3a25ad` |
| SOY | Futuro de Soja FOB Santos com Liquidação Financeira (Platts) | 34 t; US$/t; variação mínima US$ 0,20/t; lote 1; liquidação financeira; vencimento no 16º dia do mês anterior ao mês de referência, ou próxima sessão | https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE55D520D.htm | `soy_futuro_especificacao.html` | `c3add86aadf8a22cadd501228abc31e89d334ed73bc72038fe81ddce02f98115` |
| SJC | Futuro de Soja com Liquidação Financeira Referenciado no Mini de Soja CME | 450 sacas de 60 kg (27 t); US$/saca; variação mínima US$ 0,01; lote 1; preço de ajuste do mini contrato de soja CME; vencimento no 2º dia útil anterior ao mês de vencimento | https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C96D41D3A2016D45F4569B14F0.htm | `sjc_futuro_especificacao.html` | `fb45eaf85485547fb6f811e8c1a86fae83f81587adb026b7d2a741f808698a0d` |

> A página oficial de horários de negociação da B3, https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/horario-de-negociacao/derivativos/commodities/, confirmou a presença de futuros e opções para BGI, CCM, SOY e SJC. Esta confirmação de listagem não substitui a seleção explícita de símbolo e vencimento no pipeline normalizado.

## Limites operacionais

As especificações acima habilitam o cadastro do produto com evidência oficial. O HEDGE LAB continua bloqueando a escolha automática de série, preço de ajuste, margem, custo financeiro e dimensionamento de commodity até que a observação normalizada PriceReport–InstrumentReport, a unidade da exposição e os parâmetros necessários estejam explicitamente selecionados e validados.
