# HEDGE LAB — Arquitetura sem Banco de Dados

**Decisão confirmada:** a primeira versão não utilizará infraestrutura de banco de dados. A aplicação criará e manipulará apenas os DataFrames necessários para cada coleta e simulação, preservando a linhagem enquanto a sessão estiver ativa e oferecendo exportação explícita dos artefatos ao usuário.

## 1. Modelo operacional

Cada ação de coleta iniciará por uma fonte cadastrada e aprovada. O serviço obtém o artefato oficial, cria um DataFrame bruto, valida o layout realmente recebido e, somente se a validação for aceita, produz DataFrames normalizados. Nenhuma série será inventada, nenhuma coluna será deduzida de documentação desatualizada e nenhum resultado será persistido silenciosamente em uma base relacional.

| Momento | Estrutura em memória | Conteúdo mínimo | Saída opcional |
|---|---|---|---|
| Extração | `raw_dataframe` | Linhas e campos exatamente recebidos, URL de origem, data/hora UTC, hash e formato. | CSV/JSON bruto identificado pela fonte. |
| Normalização | `instrument_master_dataframe` | Identificador, símbolo, família, subjacente, vencimento, unidade, status e referência de origem quando disponíveis no arquivo oficial. | CSV/JSON e, quando houver compatibilidade validada, Parquet. |
| Mercado | `market_data_dataframe` | Data-base, instrumento, tipo de observação, preço/taxa/PU/volume separados, unidade e referência de extração. | CSV/JSON e, quando houver compatibilidade validada, Parquet. |
| Exposição e hedge | `exposure_dataframe` e `hedge_dataframe` | Entradas econômicas declaradas pelo usuário, instrumento selecionado, quantidade, método e premissas. | Pacote JSON de cenário. |
| Cenário e cálculo | `scenario_dataframe` e `calculation_dataframe` | Choques, inputs, outputs, avisos de cobertura, versão da fórmula e memória de cálculo. | Pacote JSON e relatório auditável. |
| Evidência | `lineage_dataframe` | Fonte, arquivo, hash, instante de extração, campos lidos, validações e versão do método. | Manifesto JSON anexado ao relatório. |

## 2. Limites de persistência deliberados

Sem banco de dados e sem serviço de armazenamento permanente, os DataFrames pertencem à execução atual. O painel apresentará histórico apenas enquanto a sessão permanecer ativa. Para manter um cenário, o usuário deverá exportar o pacote de simulação; uma importação posterior restaurará os DataFrames e permitirá compará-los. A interface chamará isso de **arquivo de cenário exportado**, nunca de histórico persistente por usuário.

> A ausência de persistência durável impede prometer histórico multiusuário, controle de versão remoto ou recuperação automática de arquivos. Estes itens serão substituídos, nesta versão, por exportação/importação versionada e por manifestos de rastreabilidade no próprio pacote gerado.

## 3. Estrutura de código

```text
server/
├── domain/                 # cálculos puros que recebem e devolvem DataFrames
├── ingestion/              # fontes, transportes, parsers, normalizadores e validadores
├── reports/                # composição da memória de cálculo a partir dos DataFrames
├── routers/                # endpoints tipados sem acesso a banco de dados
└── *.test.ts               # testes de regra, parser e integração
client/src/
├── features/               # tabela de DataFrames, simuladores e importação/exportação
├── pages/                  # dashboard e fluxo de trabalho
└── lib/                    # formatação e utilitários de exportação
docs/                       # fontes, arquitetura, fórmulas e limitações
```

## 4. Rastreabilidade sem banco

Toda função quantitativa receberá um objeto de contexto contendo `sourceId`, `sourceUrl`, `extractedAtUtc`, `sourceHash`, `schemaVersion`, `formulaVersion` e `assumptions`. Esse contexto viajará com o DataFrame e será serializado no manifesto de exportação e no relatório. A ausência de qualquer campo obrigatório bloqueará a geração de resultado classificado como auditável.

## 5. Uso de arquivos

Os arquivos não serão tratados como banco de dados oculto. O projeto gerará artefatos apenas quando o usuário solicitar uma exportação ou relatório. Formatos disponíveis inicialmente serão JSON e CSV, por serem inspecionáveis e transportáveis. A geração de Parquet permanece condicionada a uma biblioteca compatível e a um teste realizado com DataFrame oriundo de fonte oficial; até esse teste, o produto não alegará produzir Parquet.

## 6. Consequências para a experiência de uso

O dashboard reflete os DataFrames da sessão. O usuário poderá carregar uma fonte, visualizar sua cobertura, construir uma exposição, calcular cenários e exportar um pacote de trabalho. Caso não exista DataFrame oficial carregado, a interface mostrará estado vazio e explicará qual fonte falta; ela não recorrerá a dados de demonstração como se fossem dados de mercado.

## 7. Critério de aceite

A primeira entrega baseada nesta arquitetura será aceita quando a aplicação conseguir: (i) receber ou recuperar um artefato oficial; (ii) formar DataFrames bruto e normalizado; (iii) expor cobertura, fonte e erros de validação; e (iv) exportar o DataFrame e o manifesto de rastreabilidade sem depender de banco de dados.
