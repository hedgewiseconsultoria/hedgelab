# Guia prático de uso — HEDGE LAB

## 1. Objetivo e sequência de trabalho

O HEDGE LAB é um laboratório de análise de risco empresarial. Ele organiza exposições declaradas, dados oficiais disponíveis, alternativas de hedge, cenários e evidências auditáveis. Use sempre a sequência abaixo para não calcular ou interpretar uma posição sem seus insumos necessários.

| Ordem | Painel | Resultado esperado |
|---:|---|---|
| 1 | Visão consolidada | Confirmar o estado da sessão e as fontes disponíveis. |
| 2 | Exposições | Registrar a obrigação, o recebível ou a exposição física real. |
| 3 | Dados de mercado | Consultar e validar as fontes oficiais e a linhagem. |
| 4 | DataFrames | Conferir as linhas que compõem a sessão. |
| 5 | Cenários | Diagnosticar alternativas e executar apenas os cálculos elegíveis. |
| 6 | Pacotes de cenário | Comparar versões locais e preservadas por hash. |
| 7 | Relatórios | Exportar o PDF auditável da sessão atual. |

> **Regra central:** o sistema não cria preço, taxa, curva, prêmio, volatilidade ou contrato de forma automática. Quando faltar dado oficial ou termo contratual, o respectivo cálculo permanece bloqueado.

## 2. Visão consolidada

Abra **Visão consolidada** na barra lateral ao iniciar uma sessão. Esse painel apresenta as ações de intercâmbio de arquivos, a situação operacional, as métricas resumidas e a disponibilidade das fontes.

Você pode exportar a sessão inteira por **Exportar pacote** ou por **Parquet + manifesto**. Utilize **Importar JSON** e **Importar Parquet** somente para restaurar material previamente exportado. A opção **Relatório PDF** cria uma memória auditável baseada no conteúdo presente naquele momento no navegador.

| Ação | Quando utilizar | Observação |
|---|---|---|
| Exportar pacote | Preservar uma sessão completa para estudo ou auditoria. | Gera um pacote JSON versionado. |
| Parquet + manifesto | Trocar DataFrames com validação de hash. | Guarde o arquivo Parquet junto com o manifesto JSON. |
| Importar JSON / Parquet | Restaurar uma sessão exportada anteriormente. | A importação substitui o estado local correspondente. |
| Atualizar IGP-M | Reconsultar a publicação oficial parametrizada da FGV. | Não cria projeções. |

## 3. Cadastro de exposições

Abra **Exposições** e registre primeiro o risco econômico, antes de escolher o derivativo. Preencha uma linha por fluxo ou exposição homogênea.

| Campo | Como preencher |
|---|---|
| Descrição | Explique o fato econômico, como “Pagamento de importação de equipamentos”. |
| Moeda | Use a moeda do fluxo, por exemplo `USD` ou `BRL`. |
| Valor nocional | Informe o valor econômico declarado, sem converter unidades automaticamente. |
| Data do fluxo | Informe a data em que ocorrerá o recebimento ou pagamento. |
| Direção econômica | Escolha **Pagável** para uma obrigação e **Recebível** para uma receita. |

Clique em **Adicionar exposição**. A linha aparecerá no DataFrame da sessão. Caso tenha um conjunto de exposições já preparado, use os controles CSV com manifesto na Visão consolidada.

Para uma dívida indexada ao CDI, mantenha a moeda em BRL e descreva o indexador na documentação/contrato usado nos módulos OTC. Para boi, milho, soja ou café, use a unidade física exatamente compatível com a ficha B3 antes de tentar dimensionar contratos. O sistema bloqueia conversões de unidade não documentadas.

## 4. Dados de mercado e evidências oficiais

Abra **Dados de mercado** para trabalhar com a coleta e a validação de fontes. O painel concentra a linhagem de BCB/PTAX, IBGE/IPCA, ANBIMA/ETTJ, FGV/IGP-M e arquivos B3.

O fluxo correto é coletar ou importar o arquivo oficial, verificar a data-base, o hash e o estado de validação e somente então usá-lo em um módulo elegível. A ausência de PTAX para determinada data é mostrada como indisponibilidade; não significa que uma taxa anterior será usada. A coleta de DI futuro também não estima curva alternativa quando a B3 não responde.

| Fonte / módulo | Uso permitido | Não faz automaticamente |
|---|---|---|
| BCB PTAX | Cenários cambiais e NDF quando houver cotação válida. | Substituir cotação ausente. |
| BCB SGS 11 | Fator acumulado de taxa over com sequência válida. | Annualizar ou preencher dias ausentes. |
| BCB SGS 1178 | Série anualizada base 252 observada. | Derivá-la da SGS 11. |
| IBGE IPCA | Acumulado por quociente de números-índice oficiais. | Projetar competências não publicadas. |
| ANBIMA ETTJ | Referência visual e linhagem de curva. | Precificar instrumento sem convenções completas. |
| B3 | Arquivos, contratos, observações e cenários elegíveis. | Inventar preço, margem, PU, volatilidade ou Greeks. |

## 5. DataFrames

Abra **DataFrames** para verificar o conteúdo estrutural da sessão: Instrument Master, exposições, hedges, cenários, cálculos e linhagem. Esse painel é útil antes de exportar uma sessão, ao restaurar um pacote ou ao conferir se um instrumento/contrato foi efetivamente vinculado.

Uma contagem igual a zero significa que aquela família ainda não foi carregada ou publicada na sessão; não é uma estimativa de mercado. Para preservar uma trilha auditável, use sempre exportação acompanhada de manifesto e hash quando o arquivo for compartilhado com outra pessoa.

## 6. Cenários e alternativas de hedge

Abra **Cenários** somente depois de registrar a exposição e confirmar quais dados e documentos estão disponíveis. O fluxo recomendável é:

1. Execute o diagnóstico de situação econômica para identificar o fator de risco e a direção adversa.
2. Consulte as alternativas elegíveis, sem tratar instrumentos bloqueados como recomendação.
3. Selecione explicitamente observações B3 e contratos apenas quando houver compatibilidade de família, símbolo, vencimento, data-base e hash.
4. Execute o módulo aplicável: cenário FX/PTAX, NDF com contrato, ajuste DI1, ajuste DOL/WDO, exercício intrínseco de opção ou referência nocional de swap, conforme os insumos disponíveis.
5. Leia as limitações do resultado antes de comparar estratégias.

O painel pode apresentar futuros, NDF, swaps, opções e estruturas de DI. Isso não significa que todos possuam precificação completa. Por exemplo, prêmio, volatilidade implícita e Greeks das opções continuam bloqueados sem observações e métodos compatíveis; MTM, DV01 e curvas derivadas também não são inferidos.

> **Cenário didático não é observação de mercado.** Informe parâmetros de cenário de forma explícita e mantenha a data-base das observações oficiais separada dos choques hipotéticos.

## 7. Pacotes de cenário e histórico local

Abra **Pacotes de cenário** para consultar o histórico gravado no navegador e comparar versões já hasheadas. Cada execução elegível pode gerar um snapshot; o aplicativo mantém até 20 versões por perfil local.

Escolha uma **Versão base** e uma **Versão de comparação** para verificar alterações de exposição por moeda. O comparador não recalcula preços ou risco; ele confronta somente os bundles já preservados. Exporte os pacotes importantes, porque o histórico fica no navegador e pode ser apagado quando os dados do navegador forem limpos.

## 8. Relatórios

Abra **Relatórios** e clique em **Gerar relatório PDF** quando a sessão estiver conferida. O PDF reúne as exposições, a linhagem disponível, os hashes, a memória de cálculo existente, limitações e o carimbo de geração.

Antes de gerar, confirme que a exposição, o contrato e a fonte correta estão na sessão. Um PDF reproduz o estado atual; ele não consulta novos preços nem corrige dados ausentes após a geração.

## 9. Como encerrar uma sessão de curso

No encerramento, gere o PDF e exporte o pacote JSON ou o conjunto Parquet+manifesto. Nomeie os arquivos com a empresa/caso e a data-base da análise. Como o HEDGE LAB não usa banco de dados ou login, o conteúdo é local ao navegador e não deve ser considerado armazenamento permanente.

## 10. Limites importantes

O HEDGE LAB é uma ferramenta didática e de rastreabilidade. Ele não substitui validação de mesa, contrato, política de risco, contabilidade de hedge, custódia, corretora ou aprovação corporativa. Use os resultados como suporte à análise e preserve as evidências de fonte e as premissas que fundamentaram cada decisão.

| Situação | Comportamento esperado |
|---|---|
| Fonte oficial indisponível | Aviso específico; sem taxa ou curva substituta. |
| Contrato ou unidade ausente | Instrumento/cálculo bloqueado. |
| Preço ou volatilidade ausente | MTM, prêmio ou Greeks não são estimados. |
| Dados do navegador limpos | Histórico local pode ser perdido; use exportações. |
| Plano gratuito do Render inativo | O primeiro acesso pode demorar enquanto o serviço reinicia. |
