# HEDGE LAB — Status da Entrega e Limitações Conhecidas

**Data de referência:** 19 de agosto de 2026, GMT-3.  
**Modelo de operação:** DataFrames em sessão e pacotes JSON verificáveis; não há persistência relacional de posições ou cenários na experiência implementada.

## Escopo implementado

| Domínio | Entrega | Controle de rastreabilidade |
|---|---|---|
| Câmbio | Consulta PTAX USD do BCB por data, com compra, venda, data/hora oficial e hash do payload. | URL da chamada, data-base, instante de extração, versão de parser e SHA-256. |
| Inflação | Consulta da variação mensal do IPCA na tabela 1737 do IBGE. | Metadados do agregado, variável, unidade, período, fonte e hash. |
| IGP-M | Leitura parametrizada de tabela de publicação da FGV, permitida exclusivamente para IGP-M. | URL, hash, competência e destaque explícito da exceção FGV no PDF. |
| Curvas | Leitura da ETTJ pública da ANBIMA, com vértices e unidade `%a.a./252`. | Data de referência, URL, hash e versão de parser. |
| Instrumentos B3 | Parser incremental do `BVBG.028.02` validado contra arquivo real de cadastro de instrumentos. | Arquivo bruto, hash, origem e campos observados. |
| Exposições | Cadastro local com moeda, direção econômica, nocional e data de fluxo. | DataFrame exportável no pacote de cenário. |
| Hedge cambial | Dimensionamento nocional para DOL e WDO, com contrato e política de arredondamento explícitos. | Método, versão, fonte da especificação, residual e notas de cálculo. |
| Risco | Cenário de choque cambial por PTAX e VaR normal paramétrico com volatilidade, horizonte e confiança fornecidos pelo usuário. | Fórmula, versão e premissas explícitas. |
| Auditoria | Exportação de pacote JSON com hash e PDF com fontes, hashes, memória de cálculo, limitações e carimbo UTC. | Integridade verificada no reimportar do pacote. |

## Limitações deliberadas

> O produto bloqueia, em vez de estimar, resultados que dependeriam de fonte, layout, preço, metodologia ou convenção ainda não validados.

| Capacidade pendente | Motivo do bloqueio atual | Comportamento da aplicação |
|---|---|---|
| Preços e ajustes de derivativos B3 | Os layouts reais dos boletins `BVBG.086.01` e `BVBG.187.01` ainda não foram recuperados e inspecionados. | MTM, Greeks, preço de opções, ajustes e risco residual não são calculados. |
| DI, NDF, swap e opções | Faltam entradas de preço ou documentação de método de apreçamento específica para a implementação pretendida. | Módulos permanecem indisponíveis, sem valores sintéticos. |
| Hedge accounting | A qualificação exige política, designação e validação técnica da entidade. | O sistema produz evidência e não emite conclusão contábil. |
| Histórico por usuário | A diretriz do produto eliminou banco de dados. | Histórico é tratado por pacotes JSON exportados/importados e comparação local. |
| Carga manual de B3 na interface | Arquivos oficiais podem ter centenas de megabytes; a submissão pela interface ainda não foi habilitada na hospedagem atual. | O parser incremental está pronto para arquivo oficial, mas a carga guiada permanece pendente. |

## Referências oficiais

As fontes, layouts e convenções validados estão detalhados em [`FONTES_OFICIAIS.md`](./FONTES_OFICIAIS.md), incluindo as referências do BCB, B3, ANBIMA, IBGE, FGV, CPC e IFRS. A arquitetura de DataFrames e os contratos de exportação estão em [`ARQUITETURA_DATAFRAMES.md`](./ARQUITETURA_DATAFRAMES.md) e [`CONTRATOS_DATAFRAMES.md`](./CONTRATOS_DATAFRAMES.md). A matriz atualizada de cálculos publicados, bloqueios quantitativos e auditoria de interface está em [`COBERTURA_QUANTITATIVA_E_INTERFACE_2026-08-19.md`](./COBERTURA_QUANTITATIVA_E_INTERFACE_2026-08-19.md).
