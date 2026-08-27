# Auditoria da evolução funcional do Hedge Lab

## Diagnóstico atual

A aplicação já recupera observações oficiais B3 e seleciona séries compatíveis por horizonte. Entretanto, a operação principal ainda trata a quantidade de contratos como entrada didática, em vez de derivá-la automaticamente da exposição e da unidade econômica do contrato. Isso aparece no `LinearFuturesScenarioCard`, que inicia `hedgeContracts` em zero e exige preço inicial/preço de cenário preenchidos manualmente.

As telas de alternativas mostram contratos compatíveis, mas não exibem de maneira uniforme a quantidade sugerida, o tamanho econômico por contrato, a exposição coberta, o residual e o preço que será utilizado na operação. Nos futuros de dólar e commodities, os dimensionadores existentes já calculam quantidade nocional/física, mas estão isolados na área técnica. Nos módulos de opções, a ficha de prêmio/MTM/Greeks exige que o usuário redigite série, strike, objeto, prêmio, datas e linhagens, embora a série e o prêmio possam estar no catálogo B3. NDF e swap já possuem cenários com PTAX/ETTJ ou termos contratuais, mas continuam separados da exposição diagnosticada e requerem entrada manual.

## Regra de integração pretendida

Para cada alternativa elegível, a operação deve calcular automaticamente, quando houver especificação oficial ou termo contratual suficiente:

| Saída | Futuros B3 | Opções B3 | NDF | Swap cambial |
|---|---|---|---|---|
| Quantidade de contratos | Exposição protegida dividida pela unidade oficial, com política de arredondamento | Nocional do objeto dividido pelo multiplicador/unidade oficial; quando delta não estiver disponível, marcar como referência nocional | Nocional contratual informado no contrato validado | Nocional/quantidade informado no contrato validado |
| Série e vencimento | Catálogo B3 por horizonte | Catálogo B3 por horizonte, com strike e tipo quando observados | Contrato bilateral e vencimento | Contrato bilateral e vencimento |
| Preço automático | Ajuste/preço observado no snapshot B3 | Prêmio da série observada; strike e objeto do Instrument Report | PTAX/curva oficial mais termos do contrato | PTAX/curva oficial mais termos do contrato |
| Custo/resultado | Cenário de variação usando preço observado | Prêmio, intrínseco e, se insumos completos, MTM/Greeks | Fluxo de liquidação e valor presente | Fluxo líquido contratual |
| Margem | Estimativa teórica máxima pública por unidade, multiplicada pela posição; não é CORE | Estimativa teórica máxima por posição quando a fonte publicar o instrumento | Não aplicável como margem B3; sinalizar garantia/contraparte contratual | Não aplicável como margem B3; sinalizar garantia/contraparte contratual |

A ausência de um campo oficial deve bloquear somente a saída que depende dele. Por exemplo, uma opção pode mostrar quantidade nocional, strike e prêmio observado, mas não deve afirmar Greeks ou MTM se a taxa, a data anterior ou a linhagem exigida estiverem ausentes.

## Margem de garantia

A página oficial da B3 define a **margem teórica máxima** como o valor requerido para uma unidade do instrumento, em determinada data e sem garantias. Esse arquivo público pode sustentar uma estimativa por contrato. A margem efetiva de uma carteira, contudo, é calculada pelo CORE e depende da composição do portfólio, cenários de risco, posições e garantias. O Margin Simulator da B3 é o canal próprio para esse cálculo de portfólio.

Portanto, a interface deve usar os rótulos abaixo:

* **MT B3 de referência:** margem teórica máxima publicada para a unidade do instrumento, com data-base e arquivo/hash; não é multiplicada automaticamente pela quantidade.
* **Margem da carteira:** resultado total copiado do simulador oficial B3 para a mesma carteira, posição, preço e data.
* **Margem média auxiliar:** margem da carteira dividida pela quantidade de contratos, apenas para leitura; não substitui o resultado do simulador.
* **CORE não calculado:** aviso obrigatório de que o valor do simulador é uma estimativa de chamada e que a margem efetiva continua sujeita à corretora e à carteira real.
* **Não aplicável B3:** NDF e swap OTC não devem receber uma “margem B3” inventada; podem mostrar que a garantia/colateral depende do contrato e da contraparte.

## Fontes oficiais

[1]: https://www.b3.com.br/pt_br/produtos-e-servicos/compensacao-e-liquidacao/clearing/administracao-de-riscos/modelo-de-risco/margem-teorica-maxima/ "B3 — Margem teórica máxima"
[2]: https://www.b3.com.br/pt_br/solucoes/plataformas/gestao-de-risco/risk-services/margin-simulator/ "B3 — Margin Simulator"

A implementação deve preservar a linhagem de cada número: arquivo oficial, data-base, hash e campo de origem. Preço, prêmio, strike, multiplicador e margem sem essa linhagem devem aparecer como ausentes, parametrizados ou bloqueados, nunca como observação oficial.

## Arquivo oficial de margem localizado

A página oficial de Pesquisa por Pregão identifica o arquivo como `MT{YYMMDD}.zip`, descrito como “Margem Teórica Máxima para Posições em Aberto e Valor Mínimo de Ativos Depositados em Garantia”. O download é feito pelo endpoint público `https://www.b3.com.br/pesquisapregao/download?filelist=MTYYMMDD.zip,`. Em teste, `MT250825.zip` respondeu com ZIP válido de aproximadamente 5,6 MB. O arquivo externo contém um segundo `MT250825.zip`, que deve ser aberto e parseado pelo workflow. A página oficial informa que o valor é por unidade de instrumento e sem garantias; o cálculo de carteira permanece distinto do CORE.


## Implementação funcional adicionada

A operação principal agora calcula a quantidade de contratos pela unidade oficial do produto, respeita o lote mínimo negociável — cinco contratos para DOL e um para WDO nas fichas cadastradas — e arredonda para cima para não subcobrir o percentual escolhido. Para opções, o preço observado permanece unitário e o cartão calcula separadamente o custo total do prêmio como prêmio observado × unidade do contrato × número de contratos. Strike e tipo (call/put) são exibidos quando constarem na observação B3.

A MT B3 vem do arquivo oficial, associado por `instrumentId` e preservado no catálogo compacto com hash do arquivo, mas permanece como **referência técnica**, não como margem operacional multiplicável por contratos. A margem da posição no fluxo principal é o total informado a partir do [simulador oficial B3](https://simulador.b3.com.br/), para a mesma carteira, série, quantidade, direção, preço e data. Sem esse resultado, a margem operacional permanece bloqueada, sem percentual ou fator inventado; a tela calcula a margem média por contrato apenas como informação auxiliar.

NDF e swap cambial passaram a aparecer diretamente na operação selecionada. O NDF recebe nocional e direção iniciais derivados da exposição, mas taxa contratada, fixing, PRE, dias úteis e identificador continuam editáveis porque são termos do contrato bilateral. O swap exige o contrato/termos do usuário e não recebe margem B3; a garantia depende da contraparte.

O catálogo de 24/08/2026 foi regenerado com 4.515 observações de preço/instrumento e 145.834 linhas do MT oficial. O arquivo MT é salvo em `b3-snapshots/{asOf}/B3_MARGIN_MAXIMUM/MTYYMMDD.zip` e o workflow diário passa a baixá-lo antes de gerar o catálogo.

Esses valores não constituem recomendação, oferta, chamada de margem ou garantia de resultado. Para contratação real, a corretora e a B3 podem aplicar regras de risco, netting, garantias e chamadas diferentes da Margem Teórica Máxima.
