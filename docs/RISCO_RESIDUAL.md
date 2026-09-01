# Risco residual pós-hedge

O módulo calcula a exposição residual pela soma com sinais econômicos da exposição bruta e da exposição equivalente do hedge. Ele só executa quando o usuário fornece a volatilidade diária, o horizonte em dias úteis, o nível de confiança e a linhagem das fontes que sustentam os valores de entrada.

| Medida | Fórmula | Interpretação |
|---|---|---|
| Exposição residual | `E_bruta + E_hedge` | Valor econômico remanescente após o hedge equivalente |
| Cobertura | `1 − abs(E_residual / E_bruta)` | Percentual de redução da exposição, podendo ficar negativo em sobreposição |
| VaR residual | `abs(E_residual) × σ_diária × √DU × quantil normal` | Estimativa paramétrica condicionada à volatilidade informada |

> Este módulo não estima volatilidade a partir de dados não validados, não presume correlação, não substitui backtesting e não cria uma política de limites. Ele registra os parâmetros e as fontes usados em cada cálculo.
