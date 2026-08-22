# Disponibilidade de boletins B3 — 22 de agosto de 2026

A página oficial de **Pesquisa por pregão** da B3 exibiu, para a data-base de **21/08/2026**, os controles de download de `PR{YYMMDD}.zip`, `SPRD{YYMMDD}.zip` e `IN{YYMMDD}.zip`. A página permanece, portanto, a origem pública de referência para os arquivos BVBG.086.01, BVBG.187.01 e BVBG.028.02.

| Evidência observada | Resultado |
|---|---|
| Página oficial | `https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/pesquisa-por-pregao/` |
| Data-base exibida | 21/08/2026 |
| Arquivos disponibilizados | PR, SPRD e IN para a mesma data-base |
| Endpoint de download usado pelo projeto | `https://www.b3.com.br/pesquisapregao/download?filelist=<arquivo>,` |
| Transporte observado no ambiente de validação | HTTP 200 iniciou transferência de `IN260821.zip`, porém excedeu 25 segundos antes do recebimento integral do arquivo; nenhum artefato foi aceito ou publicado. |

> O recebimento parcial de um ZIP não é evidência de mercado. O HEDGE LAB deve tratar esse caso como **indisponibilidade temporária**, executar apenas retentativas limitadas e manter dados, séries, curvas e cálculos dependentes bloqueados até a validação completa do arquivo oficial e de seus hashes.

## Verificação visual local

Na pré-visualização local, a Central do Consultor apresentou explicitamente `0/5` evidências oficiais enquanto a sessão não possuía fontes válidas, com a indicação de que indisponibilidades não geram dados substitutos. O painel de Base técnica abriu sem erro técnico visível; as fontes em atualização mantiveram o estado de carregamento em vez de exibir valores inexistentes.
