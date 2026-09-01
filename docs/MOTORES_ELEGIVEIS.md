# Motores quantitativos elegíveis e bloqueios

O HEDGE LAB só executa cálculos quando os insumos necessários são declarados e rastreáveis. O **cenário NDF** calcula o valor de liquidação para uma taxa de fixing ou cenário e desconta o fluxo por uma taxa PRE informada em base 252; não apresenta MTM sem curva estrangeira oficial e termos completos do contrato. A **opção de dólar B3** calcula apenas o exercício intrínseco, pois a B3 condiciona o exercício à diferença positiva entre preço de liquidação do contrato-objeto e strike para calls, ou à diferença inversa para puts [1].

| Motor | Dados obrigatórios | Saída autorizada | Bloqueios explícitos |
|---|---|---|---|
| NDF | Contrato identificado, PTAX, ETTJ, taxa de fixing/cenário, PRE e calendário | Liquidação bruta e valor presente de cenário | MTM sem curva de moeda estrangeira e convenções completas |
| Opção de dólar B3 | Tipo, posição, número de contratos, strike e preço de liquidação B3 com arquivo/hash | Valor intrínseco de exercício | Prêmio MTM, volatilidade implícita e Greeks |
| DOL/WDO | Nocional, contrato e regra de arredondamento | Dimensionamento por equivalência de nocional | Preço de ajuste, margem, custo de carregamento e MTM |
| Variação de ajuste DOL/WDO | Dois ajustes B3, ambos com data-base, arquivo e hash | Resultado diário de ajuste | MTM completo, margem, custos e vínculo com exposição |
| Margem de variação DI1 | Preço de ajuste B3; e, conforme o estado, taxa negociada + DU ou ajuste anterior + taxas DI, todos com arquivo/hash/data-base; vértices DI1 B3 opcionais para reconciliação | Margem diária liquidada na sessão seguinte para posição iniciada hoje ou em aberto, com referência de curva registrada no snapshot | Formação de preço B3 sem anexo mensal/livro de ofertas; curva DI estimada, PU inferido, MTM, DV01 e FRA |
| Swap cambial tradicional BCB | Nocional, FX inicial/final, cupom, Selic, DU e linhagem BCB | Cenário de fluxo entre as pernas | MTM de contrato bilateral, curvas e convenções OTC |

> O manual de preços de futuros da B3 informa que o preço de ajuste de DI1 é uma taxa anualizada e segue uma sequência de procedimentos baseada em negócios, ofertas válidas e, quando necessário, interpolação [2]. O HEDGE LAB não reproduz essa metodologia sem o anexo mensal e o livro de ofertas exigidos pela B3.

Quando a curva de vértices DI1 validada está carregada na sessão, o módulo de ajuste diário apenas registra sua **data-base**, **calendário**, **quantidade de vértices**, **arquivo** e **hash** no parâmetro `curve_reference` do snapshot. Essa reconciliação não altera o PU informado, nem gera taxa de correção, preço teórico, MTM, DV01, FRA ou interpolação. Portanto, o ajuste continua condicionado às suas próprias evidências B3 e à fórmula contratual selecionada.

## Sessão, pacote de cenário e Parquet

O pacote de sessão exporta os DataFrames de exposição, linhagem, cenário e cálculos somente quando eles existem no estado efetivamente executado no navegador. Em particular, o cenário cambial por PTAX somente é incluído após haver exposição em USD, PTAX carregada e resultados de estresse e VaR paramétrico disponíveis. O JSON do pacote pode ser restaurado na própria sessão somente após validação do esquema, da linhagem e do hash pelo servidor; a restauração preenche os mesmos DataFrames auditáveis do fluxo Parquet. O manifesto Parquet inclui o pacote JSON hasheado e as contagens por DataFrame; a importação rejeita qualquer divergência entre os bytes Parquet, as contagens declaradas e o bundle de cenário.

O CSV auditável é destinado exclusivamente ao **DataFrame de exposições**. Ele é exportado com manifesto `1.0.0`, SHA-256, colunas, contagem de linhas e linhagem disponível; a importação exige o par `.csv` e `.csv.manifest.json` e substitui apenas as exposições após conferir conteúdo, estrutura e hash. Instrument Master, hedges, cenários e cálculos continuam exigindo JSON ou Parquet, pois um CSV de exposições não preserva as relações e os tipos heterogêneos da sessão integral.

Os DataFrames de **Instrument Master** e de **hedge** permanecem vazios enquanto a sessão não contiver uma seleção de instrumento proveniente do arquivo BVBG.028.02 validado e uma designação de hedge associada. O sistema não preenche esses registros a partir de nomes genéricos de produtos, contratos incompletos ou estimativas. Da mesma forma, não cria um cenário-base artificial quando nenhum módulo quantitativo foi executado.

> A ausência de linhas nesses DataFrames significa ausência de estado confirmado na sessão, e não uma posição nula ou uma conclusão de risco.

O histórico de simulações é mantido localmente por um identificador de perfil escolhido no navegador. Ele **não representa histórico por usuário autenticado**, não é sincronizado entre dispositivos e não é enviado ao servidor. Quando executados com seus insumos válidos, os módulos de estresse FX, VaR residual, liquidação NDF e triagem de efetividade podem produzir snapshots com parâmetros, resultados e limitações para o pacote de cenário e para o relatório PDF. A comparação entre versões confronta somente os DataFrames já registrados; ela não recalcula fontes oficiais ou altera conclusões anteriores.

O PDF auditável apresenta a memória de cálculo e os avisos de cada módulo que efetivamente compõe a sessão no instante de geração, além do carimbo UTC e da linhagem disponível. Seu conteúdo não substitui documentação de designação, validação contábil, política da entidade ou responsabilidade técnica.

## Coleta manual de fontes oficiais

Além do fluxo B3, a interface permite iniciar coletas manuais para **PTAX/BCB**, **Selic SGS 11/BCB**, **Selic SGS 1178 anualizada base 252/BCB**, **IPCA/IBGE**, **ETTJ/ANBIMA** e **IGP-M/FGV**. Cada execução preserva, em armazenamento de objetos e sem banco de dados, o payload oficial bruto, o DataFrame CSV normalizado, um manifesto de artefato, a URL de origem, data/hora de extração, hash SHA-256, versão de parser e o estado de validação. Para IGP-M, a URL deve pertencer ao domínio oficial `portal.fgv.br`; para ETTJ, o cartão usa a página pública oficial publicada pela ANBIMA. A SGS 1178 é coletada diretamente do BCB; o produto não a deriva da SGS 11.

> A coleta manual não habilita por si só qualquer cálculo bloqueado. O artefato registrado prova origem e transformação; a elegibilidade quantitativa continua exigindo os insumos, a mesma data-base e as convenções específicas do motor.

## Limitações de cobertura conhecidas

| Tema | Estado atual | Condição para habilitação |
|---|---|---|
| Vértices de DI futuro | O pipeline agora produz vértices DI1 a partir de `adjustedQuoteTax` B3 associado ao cadastro de instrumentos na mesma data-base; não interpola nem reproduz a formação de preço da bolsa. | Calendários oficiais para todo o horizonte e convenção aprovada para interpolação, taxas forward, desconto ou MTM. |
| Taxa over e exposição de juros | Há ajuste diário DI1 para os dois estados contratuais, mas não há motor consolidado de risco de juros nem conversão automática para taxa over. | Definição oficial aplicável ao índice, à convenção de capitalização, ao calendário e ao instrumento econômico da exposição. |
| Séries Selic SGS 11 e 1178 | As duas fontes oficiais podem ser consultadas e coletadas com hash e linhagem. A 1178 é fonte anualizada base 252 direta; a 11 continua diária e não recebe transformação automática. | Para desconto, curvas, preço ou risco de juros, declarar instrumento econômico, convenção de capitalização, calendário e regra de uso da taxa. |
| Curvas em moeda estrangeira | Não são inferidas, estimadas ou combinadas com a ETTJ local. | Curva oficial ou contratualmente acordada, data-base e convenções de desconto documentadas. |
| MTM de NDF, swap e futuros | Bloqueado para contratos OTC; para futuros, somente resultados específicos de ajuste ou margem são admitidos quando há insumos B3 rastreáveis. | Termos completos, preços de ajuste compatíveis, curvas necessárias e regras de cálculo auditáveis. |
| Greeks e prêmio de opções | Não calculados. O motor de opção limita-se ao valor intrínseco com entradas identificadas. | Série B3 identificada, volatilidade observável, prêmio/ajuste e modelo aprovado pela governança. |
| Contabilização de hedge | A triagem de efetividade não produz lançamento contábil ou conclusão automática. | Documentação formal de designação, política contábil, testes requeridos e revisão responsável. |
| Histórico local | Mantido no navegador por perfil, limitado a 20 versões, sem sincronização entre dispositivos. | Serviço de persistência aprovado pelo usuário e regras de acesso, retenção e auditoria correspondentes. |
| Verificação visual da interface | As rotas expostas foram inspecionadas em 17/08/2026 nos viewports de 1280×720 e 375×812: dashboard principal, página de recuperação 404, cartão de diagnóstico de exposição, cartão de vértices DI1, laboratório de cenário parametrizado e ajuste diário DI1 nos estados iniciado hoje e em aberto. Navegação móvel, cartões e grades se refluem; tabelas largas usam contêiner com rolagem horizontal. | A inspeção não substitui teste em dispositivo físico nem cobre tabelas populadas com todas as colunas; esse fluxo deve ser revalidado quando houver dados de sessão representativos. |

> A presença de um painel ou de uma entrada de cálculo não remove nenhum bloqueio. Todo resultado exibido deve continuar acompanhado dos parâmetros, da linhagem e das limitações registradas no bundle e no PDF.

## Referências

[1]: https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/opcoes-sobre-taxa-de-cambio-de-reais-por-dolar-comercial.htm "B3 — Opções sobre Taxa de Câmbio de Reais por Dólar Comercial"
[2]: https://www.b3.com.br/data/files/D8/54/DE/8F/9194F910CEC024F9AC094EA8/Futures%20Pricing%20Manual%20V41.pdf "B3 — Futures Pricing Manual v41"
[3]: https://www.b3.com.br/lumis/portal/file/fileDownload.jsp?fileId=8A828D2951C9C37701522236A4117D18 "B3 — One-Day Interbank Deposit Futures Contract (DI1)"
