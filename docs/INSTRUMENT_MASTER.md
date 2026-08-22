# Instrument Master e evidência de contrato

O Instrument Master separa **especificações oficiais de instrumentos listados** de contratos OTC. DOL e WDO receberam campos econômicos somente porque suas páginas oficiais foram preservadas e hasheadas. NDFs e swaps cambiais não recebem taxa, calendário, cupom, fixing ou regra de liquidação por suposição: o registro exige arquivo contratual, hash e termos informados.

| Instrumento | Estado | Campos econômicos disponíveis | Evidência |
|---|---|---|---|
| DOL | Especificação oficial carregada | USD 50.000 por contrato; BRL por USD 1.000; tick de BRL 0,50; vencimento no primeiro dia útil do mês; liquidação financeira. | B3 [1], `dol_futuro_especificacao.html`, SHA-256 `f02d3bb764bf08e6cfbc4a53290c264c434e76a5d5c77d77f26cd547e89c1725` |
| WDO | Especificação oficial carregada | USD 10.000 por contrato; BRL por USD 1.000; tick de BRL 0,50; vencimento no primeiro dia útil do mês; liquidação financeira. | B3 [2], `wdo_futuro_especificacao.html`, SHA-256 `bce59bd1f5091f725a5afdf5a5823d326dc4d439d13a76ec405e0750efa648ff` |
| Opção de câmbio B3 | Especificação oficial carregada | Código DOL; estilo europeu; USD 50.000; prêmio em BRL por USD 1.000; tick BRL 0,001; lote de 5; exercício automático condicional. | B3 [3], `opcao_dolar_especificacao.html`, SHA-256 `da607cbfa32d61d815cf7fd379810baf37bfef9df76741f9467313cc7c32b111` |
| Futuro de DI | Especificação oficial carregada | Código DI1; PU de BRL 100.000 no vencimento; taxa efetiva a.a. com composição diária em base 252; lote de 1; liquidação financeira. | B3 [4], `di1_futuro_especificacao.html`, SHA-256 `603578db1996f865109cff0a5f9a4e7cc3c84f15a926a4b9bda757566b399ba2` |
| NDF / swap cambial OTC | Contrato do usuário obrigatório | Nocional, moedas, pernas/taxas, datas e liquidação. | Arquivo contratual hasheado e validado pelo usuário. |

> O master autoriza o armazenamento estruturado do contrato; não autoriza precificação automática. Um motor só poderá prosseguir quando os termos obrigatórios e os dados de mercado rastreáveis estiverem disponíveis.

## Referências

[1]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Futuro de Taxa de Câmbio de Reais por Dólar Comercial"
[2]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-mini-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Futuro Mini de Taxa de Câmbio de Reais por Dólar Comercial"
[3]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/opcoes-sobre-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Opções sobre Taxa de Câmbio de Reais por Dólar Comercial"
[4]: https://www.b3.com.br/en_us/products-and-services/trading/interest-rates/one-day-interbank-deposit-futures.htm "B3 — One-day Interbank Deposit Futures"
