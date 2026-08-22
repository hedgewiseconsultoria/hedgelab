# HEDGE LAB — Arquitetura de Referência da Fase 1

> **Nota de evolução:** esta versão registrou a arquitetura inicial. A decisão posterior do usuário de não usar infraestrutura de banco de dados substitui as definições de persistência deste documento pela arquitetura vigente em [`ARQUITETURA_DATAFRAMES.md`](./ARQUITETURA_DATAFRAMES.md).

**Status:** aprovado para implementação de arquitetura, sem especificações de contratos ou endpoints de mercado presumidos.

## 1. Propósito e princípios

O HEDGE LAB será uma aplicação web corporativa para planejamento, simulação e documentação de hedge. Ela não será uma plataforma de negociação, não enviará ordens e não apresentará dados ilustrativos como se fossem dados de mercado. Cada cálculo persistirá a versão da fórmula, as premissas, os identificadores dos dados de entrada, a fonte e o instante de extração.

O produto adotará quatro princípios de engenharia. **Primeiro**, a fonte primária será sempre o órgão oficial indicado para cada série. **Segundo**, nenhuma convenção de contrato, unidade, lote, vencimento, índice, campo ou endpoint será codificada sem validação documental prévia. **Terceiro**, os dados brutos serão imutáveis e separados dos dados normalizados. **Quarto**, resultados quantitativos serão reproduzíveis a partir de uma versão de cenário e dos registros de mercado referenciados.

## 2. Arquitetura proposta

| Camada | Responsabilidade | Tecnologia disponível | Regra de integridade |
|---|---|---|---|
| Interface | Dashboard, cadastro de exposições, simuladores, comparação e relatórios | React, TypeScript, Tailwind e componentes reutilizáveis | Exibir origem, data-base e limitações junto de métricas de mercado. |
| API de domínio | Validação de entradas, autorização, consultas e comandos | Express e tRPC | Toda mutação será autenticada e validada com esquemas tipados. |
| Persistência | Dados de usuários, exposições, cenários, resultados, versões e metadados | MySQL/TiDB com Drizzle | Datas de negócio em UTC no banco; versão imutável para cada simulação concluída. |
| Armazenamento de evidências | Arquivos brutos, arquivos curados, relatórios e artefatos de coleta | Armazenamento de objetos do projeto | O banco guarda chave, URL, hash, origem e estado; não armazena bytes de arquivos. |
| Ingestão | Coletar, preservar, inspecionar, normalizar e validar artefatos públicos | Serviços TypeScript acionados manualmente nesta etapa | O coletor só aceita URL ou arquivo cuja fonte tenha sido cadastrada e validada. |
| Analytics | Curvas, instrumentos, dimensionamento, cenário, risco residual e relatório | Módulos TypeScript puros, testáveis e versionados | Uma função de cálculo recebe entradas explícitas e devolve resultado mais memória de cálculo. |

> **Decisão de implementação:** a referência do escopo a Streamlit será atendida por uma interface web React/TypeScript equivalente. O ambiente já disponibiliza autenticação, persistência e API tipada para uma plataforma multiusuário auditável; introduzir um servidor Python paralelo não seria compatível com a hospedagem gerenciada do projeto. Esta substituição altera a tecnologia de interface, não o objetivo funcional nem a rastreabilidade requerida.

## 3. Estrutura de diretórios proposta

```text
hedge-lab/
├── client/src/
│   ├── components/             # componentes reutilizáveis de interface
│   ├── pages/                  # dashboard e páginas de domínio
│   ├── features/               # formulários e visualizações por domínio
│   └── lib/                    # formatação, visualização e cliente tipado
├── server/
│   ├── routers/                # procedimentos tRPC por domínio
│   ├── services/               # serviços orquestradores
│   ├── domain/                 # modelos, regras e cálculos puros
│   ├── ingestion/              # fontes, coletores, parsers e normalizadores
│   ├── reports/                # composição de memória de cálculo e PDF
│   └── *.test.ts               # testes unitários e de integração
├── drizzle/
│   ├── schema.ts               # definição declarativa do banco
│   └── migrations/             # migrações geradas e aplicadas
├── shared/
│   ├── types.ts                # contratos compartilhados
│   └── constants/              # somente constantes não financeiras
├── docs/
│   ├── ARQUITETURA_FASE_1.md
│   ├── FONTES_OFICIAIS.md      # evidências verificadas de fonte, layout e uso
│   └── FORMULAS_E_PREMISSAS.md # fórmulas com versão, definição e inputs
└── todo.md
```

## 4. Modelo de dados lógico

| Entidade | Chave e relações | Finalidade |
|---|---|---|
| `data_sources` | chave própria; uma fonte possui várias extrações | Catálogo controlado de fontes oficiais, URL validada, documento de referência e status de validação. |
| `data_extractions` | pertence a `data_sources` | Data/hora UTC, período solicitado, hash, localização do arquivo, resultado de validação e mensagem de erro quando houver. |
| `instruments` | chave estável; pode referenciar instrumento subjacente | Instrument Master interno; os atributos financeiros só são preenchidos após confirmação documental. |
| `market_observations` | instrumento + data-base + extração | Séries normalizadas com tipo econômico explícito, unidade e referência à extração. |
| `business_exposures` | pertence ao usuário | Exposição econômica informada, moeda, direção, nocional, fluxo projetado, datas e estado. |
| `hedge_positions` | exposição + instrumento + versão de cenário | Posição hipotética, quantidade, preço utilizado, custo, maturidade e convenção declarada. |
| `scenario_sets` | pertence ao usuário; possui versões | Conjunto nomeado de choques e hipóteses de mercado. |
| `scenario_versions` | pertence a `scenario_sets`; imutável | Snapshot de parâmetros, fontes, entradas e resultados de uma execução. |
| `calculation_runs` | pertence a uma versão | Versão do método, inputs, resultados, alertas, evidências e memória de cálculo estruturada. |
| `generated_reports` | referencia execução e versão | Artefato PDF, hash, fonte, data/hora de geração e chave de armazenamento. |

## 5. Contrato de dados e linhagem

O pipeline terá as etapas **fonte → extração → bruto → inspeção de layout → parser específico → normalização → validação → dado curado → cálculo**. Não haverá parser universal que presuma colunas. Cada parser declarará quais cabeçalhos realmente encontrou, quais campos foram normalizados, quais foram descartados e por qual razão.

Os conjuntos lógicos requeridos pelo escopo serão representados por tabelas e, quando um arquivo curado for gerado, por artefatos Parquet equivalentes. Os nomes `instrument_master.parquet`, `market_data.parquet`, `option_master.parquet` e `option_market.parquet` não serão criados vazios nem preenchidos com valores fictícios. Eles serão produzidos somente depois de uma extração oficial bem-sucedida e validada.

## 6. Estratégia de coleta de dados oficiais

A Fase 2 estabelecerá a evidência documental e técnica para cada fonte, antes de existir qualquer chamada de coleta. A estratégia de cada conector será idêntica quanto à segurança e diferente quanto ao parser:

| Domínio | Fonte exclusiva autorizada | Artefato a validar antes da implementação | Saída esperada |
|---|---|---|---|
| Câmbio de referência | Banco Central do Brasil | Serviço, série ou documentação oficial do PTAX | Observações com data-base, taxa, unidade, origem e instante de extração. |
| Derivativos e convenções | B3 | Arquivos públicos, manuais, especificações de contrato e layout vigente | Instrument Master, preços e ajustes normalizados sem inferência de atributos. |
| Curvas e referências de renda fixa | ANBIMA e, quando aplicável, B3 | Metodologia e artefato público da curva utilizada | Vértices, taxa, unidade, base e identificador da extração. |
| Inflação IPCA | IBGE | Serviço ou tabela oficial de IPCA mantida pelo IBGE | Série, competência, valor, unidade e origem. |
| Inflação IGP-M | FGV IBRE | Publicação oficial da FGV IBRE, como exceção autorizada exclusivamente para IGP-M | Série, competência, valor, unidade, origem FGV e marcação explícita da exceção. |

Nenhuma rotina será programada contra endereço suposto. A documentação de cada fonte registrará o endereço efetivamente acessado, a finalidade, o layout observado, a licença/condição de uso disponível e o teste de recuperação.

## 7. Convenções e motores quantitativos

A base de 252 dias úteis, taxa over, liquidação D+1, PU, DV01, fluxo de caixa, NDF, swap, futuro e opção serão tratados como **parâmetros e métodos explicitamente nomeados**, não como constantes implícitas. A regra concreta será habilitada apenas quando a documentação oficial correspondente tiver sido registrada em `FONTES_OFICIAIS.md` e coberta por teste.

Os módulos de opções e de efetividade contábil serão lançados gradualmente. Enquanto não houver dados oficiais adequados para preços, volatilidade, ativo-objeto e demais inputs, a interface exibirá indisponibilidade ou dados claramente identificados como ilustrativos, sem representar qualquer cálculo como preço de mercado ou avaliação contábil.

## 8. Dependências

| Categoria | Decisão da Fase 1 | Motivo |
|---|---|---|
| Persistência e API | Drizzle, MySQL/TiDB, tRPC e Zod já presentes no projeto | Mantêm contratos tipados e validação de dados em toda a aplicação. |
| Visualização | React, Tailwind, componentes de interface e Recharts já presentes | Permitem dashboard responsivo, tabelas e gráficos sem dependência financeira não auditada. |
| Coleta e normalização | APIs nativas de rede do Node e funções TypeScript | Evitam dependência desnecessária e permitem registrar respostas e metadados. |
| PDF | A definir após validar o formato de relatório e o mecanismo compatível com a hospedagem | A geração não será simulada; o pacote será escolhido e testado antes da entrega da funcionalidade. |
| Parquet | A definir após validar a compatibilidade do artefato e o fluxo de persistência | A definição só será introduzida quando houver um conjunto real da fonte oficial para validar a escrita e leitura. |

## 9. Estratégia de testes

Os testes serão escritos antes ou junto dos módulos de domínio. Parsers usarão arquivos de fixture mínimos, identificados como sintéticos e nunca exibidos como dados de mercado. As integrações de coleta usarão respostas oficialmente recuperadas e armazenadas como artefatos de evidência quando a fonte permitir; não haverá teste que finja uma resposta oficial.

| Nível | Verificação |
|---|---|
| Unitário | Validação de esquema, conversões autorizadas, fórmulas, sinais econômicos, datas, hash e versionamento imutável. |
| Integração | Fonte oficialmente acessada → arquivo bruto → parser → normalização → validação → persistência → cálculo. |
| Contrato | Cabeçalhos e campos observados versus campos exigidos pelo parser; alteração de layout falha de forma explícita. |
| Interface | Estados de carregamento, ausência de dados, erro de fonte, rastreabilidade e comparação de versões. |
| Regressão | Casos de DOL/WDO, DI e cenários somente após as convenções correspondentes serem confirmadas. |

## 10. Milestones de implementação

| Marco | Escopo de aceite | Dependência de fonte |
|---|---|---|
| 1. Arquitetura | Este documento, modelo lógico, controle de escopo e estrutura inicial. | Nenhuma inferência de contrato. |
| 2. Coleta B3 | Recuperação real, preservação do bruto e inspeção do layout de um artefato oficial. | B3 validada. |
| 3–5. Instrumentos, mercado e qualidade | Instrument Master e Market Data reais, com cobertura e falhas visíveis. | Layout e campos B3 validados. |
| 6. DOL/WDO | Exposição → dimensionamento → residual → cenários → P&L com entradas rastreáveis. | Especificação B3 do contrato e dados reais. |
| 7. DI | Taxa, PU, DV01, hedge e cenários conforme convenções confirmadas. | Especificação B3 e documentação de convenções. |
| 8–14. Opções, commodities, volatilidade, hedge ratio e basis | Módulos habilitados apenas à medida que existir fonte e definição suficientes. | Fontes e metodologia por módulo. |
| 15–17. Cenários, estratégias, combustíveis e energia | Cenários genéricos, comparativo e modelos de risco de proxy. | Dados de cada fator confirmados. |
| 18–20. Interface, relatórios e testes finais | Dashboard, histórico versionado, PDF auditável e validação completa. | Todos os módulos aceitos. |

## 11. Limites explícitos da Fase 1

Esta fase não afirma recuperação de dado de mercado, compatibilidade de layout, preço de contrato, cálculo de hedge, adoção de uma convenção de derivativo ou aderência automática à contabilização de hedge. Ela estabelece a arquitetura para que todas essas afirmações sejam verificadas posteriormente, por fonte e por execução.
