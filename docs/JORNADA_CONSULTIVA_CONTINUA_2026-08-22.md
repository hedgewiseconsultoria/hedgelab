# Jornada consultiva contínua

## Objetivo

O fluxo primário do HEDGE LAB foi reorganizado para que uma pessoa responsável por risco empresarial consiga avançar da exposição à decisão sem atravessar telas técnicas, sem repetir dados já declarados e sem confundir uma hipótese de ensino com uma observação oficial de mercado.

| Etapa | O que a pessoa faz | O que a plataforma preenche | O que permanece bloqueado |
|---|---|---|---|
| 1. Exposição | Declara o compromisso, a variável econômica, valor ou quantidade e vencimento. | Direção econômica, horizonte e alternativas aplicáveis. | Contratos e preços não declarados. |
| 2. Operação | Escolhe a alternativa a estudar e a cobertura de 0%, 50%, 75% ou 100%. | Exposição transferida, unidade, vencimento, posição econômica e requisitos de evidência. | Quantidade efetiva de contratos, série e ajuste. |
| 3. Cenários | Informa somente as hipóteses didáticas necessárias para comparar risco sem hedge e proteção. | A operação escolhida reaparece com a mesma cobertura. | Preço B3, MTM, margem, prêmio, volatilidade e Greeks sem a respectiva evidência. |
| 4. Detalhes técnicos | Abre os módulos de ajuste, contratos e dimensionamento apenas quando necessário. | Módulos pertinentes à alternativa em análise. | Todo cálculo que ainda não tenha os insumos exigidos. |

## Ouro e demais commodities

Ao selecionar Ouro, Boi Gordo, Café, Etanol, Milho ou Soja, a jornada configura a exposição física com a unidade e a direção já declaradas. A pessoa não precisa esperar a recuperação de um boletim B3 para começar o exercício didático de preço, percentual de cobertura e risco residual.

> **Regra de evidência.** A ausência de uma série B3 de Ouro não é convertida em preço, curva ou contrato presumido. O comparador permite hipótese didática declarada; cotação, ajuste diário, MTM, prêmio e resultado efetivo continuam indisponíveis até que PriceReport e InstrumentReport válidos sejam recuperados e vinculados à mesma data-base.

## Dívida CDI e DI1

Para uma dívida CDI, o cenário passa a usar imediatamente a dívida e o horizonte declarados. Se houver vértice DI1 B3 validado, a sensibilidade apresenta o vértice e a contagem em dias úteis publicada. Se não houver, a pessoa ainda pode executar uma sensibilidade **didática** por dias corridos até o vencimento em base 365; o resultado de DI1 permanece bloqueado.

Esse comportamento elimina a espera contínua observada anteriormente, mas não altera a regra de mercado: ajuste, PU, quantidade de contratos, efetividade e resultado financeiro do DI1 exigem posição contratada e evidências compatíveis.

## Ferramentas técnicas

As ferramentas avançadas foram reposicionadas como detalhes progressivos. Elas não são necessárias para declarar a exposição, selecionar uma alternativa ou comparar um cenário. Devem ser usadas somente após a decisão didática, para registrar contratos, selecionar uma série, dimensionar uma posição ou apurar ajustes sob os insumos exigidos.

## Critério para dados oficiais

Os dados B3 são exibidos como evidência somente quando o download é válido, o arquivo não é HTML/ZIP inválido, os artefatos são compatíveis na mesma data-base e a linhagem possui hash. Enquanto uma dessas condições não existir, a interface apresenta a situação como pendente ou indisponível, sem número substituto.
