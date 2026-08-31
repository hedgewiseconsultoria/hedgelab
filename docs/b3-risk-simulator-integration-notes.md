# Integração com o simulador de risco B3

Data da verificação: 2026-08-27.

Fonte pública: https://simulador.b3.com.br/

O simulador disponibiliza `GET https://simulador.b3.com.br/api/cors-app/web/V1.0/ReferenceData`, que retorna `ReferenceData.referenceDataToken` e a lista de símbolos válidos. O cálculo é feito por `POST https://simulador.b3.com.br/api/cors-app/web/V1.0/RiskCalculation`.

O payload observado no JavaScript público do simulador usa:

```json
{
  "ReferenceData": { "referenceDataToken": "..." },
  "LiquidityResource": { "value": 0 },
  "RiskPositionList": [
    {
      "Security": { "symbol": "WDOV26" },
      "SecurityGroup": { "positionTypeCode": 0 },
      "Position": {
        "longQuantity": 75,
        "longPrice": 5196.31,
        "tradeDate": "2026-08-26"
      }
    }
  ]
}
```

O retorno validado para a posição acima foi HTTP 200 com `Risk.riskWithoutCollateral = 6011.5703541171115`, `Risk.totalDeficitSurplus = -6011.5703541171115` e `Risk.scenarioId = 9997`.

A chamada direta sem cabeçalhos de origem/referência retornou HTTP 403. A mesma chamada com `Accept: application/json`, `Origin: https://simulador.b3.com.br`, `Referer: https://simulador.b3.com.br/` e User-Agent compatível retornou HTTP 200. Isso é uma proteção de origem/anti-bot do serviço público, não um dado de autenticação do usuário.

O próprio simulador informa na página que calcula uma chamada potencial de margem para uma carteira hipotética e que o resultado efetivo sempre será determinado pela corretora responsável pelas posições.

O Hedge Lab usa `riskWithoutCollateral` como margem calculada para a carteira correspondente, exibe a fonte e bloqueia o valor quando a consulta falhar. A consulta é feita pelo navegador por meio do endpoint CORS público; a tentativa de chamada Node direta foi removida porque o serviço respondeu HTTP 403 fora do contexto do navegador. A Margem Teórica Máxima B3 não deve ser multiplicada automaticamente por contratos como substituta do simulador.
