# Referência contratual de swap de taxa — 19/08/2026

## Escopo

O HEDGE LAB agora aceita, no **Instrument Master OTC**, uma referência de `OTC_RATE_SWAP` para uma exposição econômica vinculada a CDI. O fluxo preserva somente os termos declarados pelo usuário e o arquivo contratual hasheado; ele não converte esse cadastro em preço, risco, recomendação ou resultado financeiro.

| Elemento contratual | Regra aplicada no cadastro |
|---|---|
| Evidência | Arquivo do contrato preservado e SHA-256 obrigatório. |
| Identificador e nocional | Identificador não vazio e nocional positivo, expressos em BRL para este instrumento bilateral. |
| Pernas | Posição declarada, indexador da perna flutuante e convenção da perna fixa obrigatórios. |
| Datas | Datas de contratação, início, fim e vencimento validadas; o fim das pernas deve ser posterior ao início. |
| Pagamentos | Calendário de pagamentos informado textualmente a partir do contrato; não há calendário presumido. |
| Designação | Se uma exposição for escolhida de forma explícita, a sessão registra `SWAP_TAXA_CONTRATUAL` com quantidade contratual `1`. |

## Limites quantitativos

> Este módulo é uma referência de contrato bilateral. **Precificação, MTM, curva, taxa over, DV01, valor justo, efetividade financeira e resultado de cenário permanecem bloqueados.**

O status `validated_user_contract` confirma apenas que os campos essenciais e a evidência foram recebidos pela sessão. Ele não confirma a interpretação jurídica do contrato, a adequação da cobertura, a disponibilidade de curva, nem a elegibilidade contábil.

## Rastreabilidade e exportação

O registro é incorporado ao DataFrame de Instrument Master, ao bundle JSON e ao pacote Parquet. A restauração exige o mesmo schema, o hash SHA-256 do documento e os termos serializados. Assim, o conteúdo não é reconstruído por nome genérico, por dados de B3 ou por uma taxa de mercado.

## Cobertura automatizada

| Camada | Verificação |
|---|---|
| Domínio | Aceita somente as duas pernas, datas, calendário e contrato hasheado; rejeita convenção fixa ausente. |
| Rota | Aceita `OTC_RATE_SWAP` com união discriminada de termos e preserva `validated_user_contract`. |
| Pacote | Exporta e reimporta o contrato em BRL via Parquet sem perder tipo ou moeda. |
| Interface | Exibe campos próprios de swap de taxa, oculta os campos cambiais e mantém visível o aviso de bloqueio quantitativo. |
