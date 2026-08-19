# Inventário oficial de instrumentos de hedge — evidências iniciais

Este inventário organiza as fontes oficiais necessárias para que o HEDGE LAB avalie alternativas de hedge a partir de uma exposição declarada. Ele não presume liquidez, disponibilidade de série contratual, elegibilidade contábil ou adequação a uma empresa específica. Cada resultado deve manter a data-base, o arquivo ou contrato de origem, o hash e os termos que fundamentam o cálculo.

## Juros — DI1 e FRA de DI1

O contrato futuro DI1 tem como ativo subjacente a taxa média diária de DI entre a data de negociação, inclusive, e o vencimento, exclusive. A B3 define cotação em taxa efetiva anual de base 252 dias úteis, vencimento na primeira sessão de negociação do mês de vencimento e valor de 100.000 pontos no vencimento [1]. A mesma fonte informa que o preço de ajuste do DI futuro é calculado por VWAP em janela de 10 minutos, devendo o HEDGE LAB consumir o ajuste publicado, e não tentar reproduzir a formação de preço da bolsa [1].

| Alternativa | Fonte oficial confirmada | Dados mínimos para elegibilidade | Limite atual |
|---|---|---|---|
| Futuro DI1 | Página de produto B3; BVBG.187.01/BVBG.086.01; cadastro BVBG.028.02 | Série, vencimento, ajuste/taxa, data-base, arquivo, hash, calendário de dias úteis | A curva só poderá usar vértices efetivamente materializados e validados no mesmo pregão. |
| FRA de DI1 com PU neutro | Operação estruturada divulgada pela B3 [2] | Dois vencimentos DI1, quantidades e regra oficial da estrutura | A composição, a razão e o resultado só serão calculados depois de confirmar as especificações completas na fonte oficial acessível. |
| Swap DI ou taxa prefixada | Registro B3 de derivativos de balcão e arquivo público de taxas de mercado para swaps | Contrato, indexadores, datas, nocionais, taxas e arquivo/fonte correspondentes | Não haverá MTM bilateral sem contrato e convenções de desconto completos. |
| Opção sobre futuro de DI | Página de produto B3 | Tipo de série, futuro DI subjacente, vencimento, strike, prêmio e posição | O modelo não calcula volatilidade ou Greeks sem observações e modelo aprovados. |

A B3 declara que o contrato de swap permite a troca da natureza das taxas de aplicações e captações, visando reduzir custo de passivos ou proteger contra flutuações adversas de taxas [9]. Para opções sobre DI, a B3 define que o subjacente é um contrato futuro DI posterior ao vencimento da opção; cada opção equivale a um contrato futuro DI e é europeia [10]. Essas relações devem ser verificadas contra a série efetivamente materializada no cadastro e nos preços B3 antes de qualquer cálculo.

## Câmbio — termo/NDF, futuros e opções

Para o contrato a termo de moeda sem entrega física, a B3 informa que a operação é de compra ou venda de moeda estrangeira em data futura por paridade predeterminada. A liquidação financeira corresponde à diferença entre a paridade e a cotação de referência no vencimento; tamanho, prazo e taxa de câmbio são negociados entre as partes [3]. A fonte ainda relaciona modalidades simples, paridade, asiática e termo de termo, além de recursos como limitador, prêmio pré-pago e shift forward [3].

| Alternativa | Fonte oficial confirmada | Dados mínimos para elegibilidade | Limite atual |
|---|---|---|---|
| Termo/NDF de moeda registrado | Página de produto B3 e documento contratual/registro | Par de moedas, direção, nocional, taxa, fixing/referência, vencimento, regra de liquidação e evidência contratual | Não inferir taxa a termo, fixing, garantia ou fluxo contratual ausente. |
| DOL/WDO e opções de câmbio | Arquivos B3 de preços e cadastro; páginas de produto B3 | Série contratual, vencimento, ajuste/preço, strike e tipo quando aplicável | Prêmio, volatilidade e Greeks exigem dados observáveis e modelo aprovado. |

O contrato futuro DOL é padronizado para BRL por USD, tem tamanho de USD 50.000, cotação em BRL por USD 1.000 e ajuste diário com base em preço de ajuste B3. O contrato também especifica a PTAX de venda do BCB como preço de ajuste na data de fixing [11]. A opção listada sobre dólar tem objeto BRL por USD, tamanho de USD 50.000, prêmio em BRL por USD 1.000, estilo europeu e exercício automático quando estiver dentro do dinheiro nas condições contratuais [12].

## Commodities — boi gordo, milho e soja

A B3 descreve o futuro de boi gordo com liquidação financeira como instrumento de gestão do risco de oscilação de preço, com uso por produtores, empresas de corte e tradings [7]. A página de horários da B3 confirma os identificadores de negociação `BGI` para futuro de boi gordo, `CCM` para futuro de milho financeiro, `SOY` para futuro de soja FOB Santos com liquidação financeira (Platts) e `SJC` para futuro de soja referenciado no mini de soja CME. A mesma fonte relaciona opções sobre futuros `BGI`, `CCM`, `SOY` e `SJC`, além das respectivas janelas de apuração de preço de ajuste [8].

| Alternativa | Fonte oficial confirmada | Dados mínimos para elegibilidade | Limite atual |
|---|---|---|---|
| Futuro e opção de boi gordo | Página B3 do produto; arquivo de preços e cadastro; página de horários | Série, vencimento, unidade/quantidade física da exposição, ajuste, posição, strike e tipo para opção | A conversão entre exposição física e contratos depende da especificação oficial da série materializada no cadastro. |
| Futuro e opção de milho financeiro | Página B3 de horários; arquivo de preços e cadastro | Série `CCM`, vencimento, unidade da exposição, ajuste e dados de opção quando aplicáveis | Não inferir preço físico local, base geográfica ou prêmio de opção sem fonte específica. |
| Futuro e opção de soja | Página B3 de horários; arquivo de preços e cadastro | Série `SOY` ou `SJC`, referência econômica, vencimento, ajuste e dados de opção quando aplicáveis | Não tratar `SOY` e `SJC` como equivalentes: a referência publicada é distinta. |

## Arquivos e canais de dados

A Pesquisa por Pregão da B3 lista os arquivos BVBG.086.01 (PriceReport), BVBG.187.01 (Simplified Price Report — Derivatives) e BVBG.028.02 (Instruments File), que devem permanecer a base primária para preços e identificação de instrumentos listados [4]. A página de Ajustes do Pregão informa que, desde 10/12/2025, os dados migraram para o Boletim Diário de Mercado, no capítulo Cotações, tabelas de negócios consolidados [5]. Para taxas referenciais, a B3 informa a disponibilização no arquivo “Mercado de Derivativos — Taxas de Mercado para Swaps”, acessível pelo fluxo de Pesquisa por Pregão desde 12/2025 [6].

Em consulta ao **Hub de Dados Públicos** em 18/08/2026, a própria B3 mantém, na seção Derivativos, links para o Boletim Diário do Mercado, a Pesquisa por Pregão, cotações de derivativos e preços referenciais. Portanto, o HEDGE LAB preserva a Pesquisa por Pregão como canal de arquivos BVBG e registra o Hub como a navegação oficial que a referencia [13].

## Referências

[1]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/futuro-de-taxa-media-de-depositos-interfinanceiros-de-um-dia.htm "B3 — Futuro de Taxa Média de Depósitos Interfinanceiros de Um Dia"
[2]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/operacao-estruturada-de-fra-de-di1-pu-neutro.htm "B3 — Operação Estruturada de FRA de DI1 (PU Neutro)"
[3]: https://www.b3.com.br/pt_br/produtos-e-servicos/registro/derivativos-de-balcao/contrato-a-termo-de-moeda.htm "B3 — Contrato a Termo de Moeda"
[4]: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/pesquisa-por-pregao/ "B3 — Pesquisa por Pregão"
[5]: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/derivativos/s_ajuspreg/ "B3 — Ajustes do Pregão"
[6]: https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/consultas/mercado-de-derivativos/precos-referenciais/taxas-referenciais-bm-fbovespa/ "B3 — Taxas referenciais BM&FBOVESPA"
[7]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE4755111.htm "B3 — Futuro de Boi Gordo com Liquidação Financeira"
[8]: https://www.b3.com.br/pt_br/solucoes/plataformas/puma-trading-system/para-participantes-e-traders/horario-de-negociacao/derivativos/commodities/ "B3 — Horário de negociação: Commodities"
[9]: https://www.b3.com.br/pt_br/produtos-e-servicos/registro/derivativos-de-balcao/contrato-de-swap.htm "B3 — Contrato de Swap"
[10]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/opcoes-sobre-futuro-de-di.htm "B3 — Opções sobre Futuro de DI"
[11]: https://www.b3.com.br/lumis/portal/file/fileDownload.jsp?fileId=8A828D2951C9C3770152216F25B93F9C "B3 — Contrato Futuro de Taxa de Câmbio de Reais por Dólar Comercial"
[12]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/opcoes-sobre-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Opções sobre Taxa de Câmbio de Reais por Dólar Comercial"
[13]: https://www.b3.com.br/pt_br/dados/hub-de-dados-publicos/ "B3 — Hub de Dados Públicos"
