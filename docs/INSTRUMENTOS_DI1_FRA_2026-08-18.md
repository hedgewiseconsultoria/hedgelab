# Instrumentos DI1 e FRA — evidência oficial inicial

Em 18/08/2026, foram consultadas as páginas oficiais da B3 para **Opções sobre Futuro de DI** e para a **Operação Estruturada de FRA de DI1 (PU Neutro)**.

| Instrumento | Fato confirmado na fonte oficial | Estado quantitativo no HEDGE LAB |
| --- | --- | --- |
| Opção sobre Futuro de DI | A B3 informa códigos D11–D19, estilo europeu, prêmio em R$ com duas casas decimais, lote padrão de 5 contratos, liquidação física por abertura de posição DI1 e relação de uma opção para um futuro DI1. | A ficha e o vínculo de uma opção para seu futuro-objeto são auditáveis; dimensionamento de dívida, PU, taxa, prêmio, MTM, DV01, volatilidade implícita e Greeks continuam bloqueados. |
| FRA de DI1 (PU Neutro) | A B3 define a estrutura como negociação simultânea de dois vencimentos DI1 em naturezas opostas, com quantidades calibradas para neutralizar os PUs; não é um novo contrato nem mantém posição em aberto ao fim do dia. | Permanece bloqueado para cálculo de quantidade, PU, taxa, DV01, resultado e cobertura até que a regra operacional e as duas observações DI1 sejam explicitamente selecionadas e validadas. |

> As páginas consultadas confirmam a existência e a descrição dos instrumentos, mas não autorizam inferir razão de contratos, PU neutro, prêmio, preço, sensibilidade, resultado financeiro, ou convenções não expostas no artefato hashado da sessão.

| Artefato preservado | SHA-256 | Uso permitido |
| --- | --- | --- |
| `.audit-sources/b3-interest/di1_opcao_especificacao.html` | `81b35c6cd34d281eec1700209fe15248e5258d46493771d770b6ab684fb9933d` | Comprovar a página de produto e manter métricas de opção bloqueadas até especificação completa e série selecionada. |
| `.audit-sources/b3-interest/fra_di1_pu_neutro_especificacao.html` | `aefab19e0c8e8bb00e1d44ee4425f72fbc811aa0782623754f5c58a495b33e5a` | Comprovar a estrutura de dois DI1 em naturezas opostas; não inferir razão, PU ou resultado. |

## Fontes oficiais

1. [B3 — Opções sobre Futuro de DI](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/opcoes-sobre-futuro-de-di.htm)
2. [B3 — Operação Estruturada de FRA de DI1 (PU Neutro)](https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/operacao-estruturada-de-fra-de-di1-pu-neutro.htm)
