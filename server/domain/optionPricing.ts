import { businessDaysBetween, type BusinessCalendarId } from "./businessCalendar";

/**
 * Modelo de apreçamento Black-76 para opções europeias sobre futuro/forward, aplicado às
 * séries de opção da B3 (dólar, boi gordo, milho, soja, mini soja) cujo objeto é o próprio
 * contrato futuro.
 *
 * IMPORTANTE — o que este módulo NÃO faz:
 * - As opções B3 sobre futuro são de estilo AMERICANO com liquidação diária por ajuste; a B3
 *   apreça o exercício antecipado por um modelo binomial proprietário, que este módulo não
 *   reproduz. Black-76 europeu é uma APROXIMAÇÃO, sistematicamente mais barata que o prêmio
 *   americano real quando há valor de exercício antecipado (tipicamente puts profundas ITM em
 *   ambiente de juros altos). Todo resultado deste motor é rotulado `pricingModel:
 *   "BLACK_76_EUROPEAN_APPROXIMATION"` e nunca é apresentado como o método oficial da B3.
 * - Não inventa volatilidade: a volatilidade implícita é extraída do próprio prêmio de
 *   liquidação oficial B3 (campo `adjustedQuote` do BVBG.086.01/187.01), nunca estimada,
 *   suavizada ou copiada de terceiros.
 * - A taxa livre de risco (`riskFreeRateAnnual`) segue a MESMA convenção usada no resto do
 *   produto para a curva DI1/Selic: taxa efetiva anual, base 252 dias úteis, informada como
 *   decimal (ex.: 0,12 para 12% a.a.). Internamente ela é convertida para a taxa contínua
 *   equivalente (ln(1+r)) apenas para o fechamento analítico de Black-76 — o fator de desconto
 *   resultante é IDÊNTICO a (1+r)^(-T), a mesma convenção de desconto base 252 usada em
 *   ndfSettlement.ts e fxSwapScenario.ts, garantindo consistência entre os motores do produto.
 * - Não inventa taxa de juros: a taxa livre de risco deve vir de uma fonte já validada na
 *   sessão (DI1 B3 ou Selic/CDI BCB), com sua própria linhagem.
 * - Bloqueia (lança erro) em vez de aproximar quando o prêmio observado está fora dos limites
 *   de não-arbitragem (abaixo do intrínseco ou acima do limite teórico), ou quando o tempo até
 *   o vencimento é zero ou negativo.
 */

const SQRT_2PI = Math.sqrt(2 * Math.PI);

/** Converte a taxa efetiva anual base 252 (convenção DI1/Selic do produto) na taxa contínua equivalente usada internamente pelo fechamento analítico de Black-76. */
function continuousRateFromBase252(rateAnnualBase252: number) {
  if (rateAnnualBase252 <= -1) throw new Error("A taxa livre de risco anual deve ser superior a -100%.");
  return Math.log(1 + rateAnnualBase252);
}

function normalPdf(x: number) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI;
}

/** Aproximação racional de Abramowitz & Stegun 26.2.17 (erro máximo ~7.5e-8) para N(x). */
function normalCdf(x: number) {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * absX);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-absX * absX);
  return 0.5 * (1 + sign * y);
}

export type OptionType = "CALL" | "PUT";

export type Black76Inputs = {
  optionType: OptionType;
  futuresPrice: number;
  strike: number;
  yearsToExpiry: number;
  riskFreeRateAnnual: number;
  volatilityAnnual: number;
};

export function black76Premium(input: Black76Inputs): number {
  const { optionType, futuresPrice: F, strike: K, yearsToExpiry: T, riskFreeRateAnnual, volatilityAnnual: sigma } = input;
  if (T <= 0) throw new Error("O tempo até o vencimento deve ser positivo para o modelo Black-76.");
  if (sigma <= 0) throw new Error("A volatilidade deve ser positiva para o modelo Black-76.");
  const r = continuousRateFromBase252(riskFreeRateAnnual);
  const discount = Math.exp(-r * T);
  const d1 = (Math.log(F / K) + (sigma * sigma / 2) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);
  return optionType === "CALL"
    ? discount * (F * normalCdf(d1) - K * normalCdf(d2))
    : discount * (K * normalCdf(-d2) - F * normalCdf(-d1));
}

export type Black76Greeks = {
  /** Sensibilidade do prêmio a 1,00 (100%) de variação no preço do futuro-objeto. */
  delta: number;
  /** Sensibilidade do delta a 1,00 unidade de variação no preço do futuro-objeto. */
  gamma: number;
  /** Sensibilidade do prêmio a 1 ponto percentual (0,01) de variação na volatilidade anual. */
  vegaPer1PctVol: number;
  /** Sensibilidade do prêmio à passagem de 1 dia corrido (decaimento temporal), mantendo os demais insumos fixos. */
  thetaPerCalendarDay: number;
};

export function black76Greeks(input: Black76Inputs): Black76Greeks {
  const { optionType, futuresPrice: F, strike: K, yearsToExpiry: T, riskFreeRateAnnual, volatilityAnnual: sigma } = input;
  if (T <= 0) throw new Error("O tempo até o vencimento deve ser positivo para o modelo Black-76.");
  if (sigma <= 0) throw new Error("A volatilidade deve ser positiva para o modelo Black-76.");
  const r = continuousRateFromBase252(riskFreeRateAnnual);
  const discount = Math.exp(-r * T);
  const sqrtT = Math.sqrt(T);
  const d1 = (Math.log(F / K) + (sigma * sigma / 2) * T) / (sigma * sqrtT);
  const pdfD1 = normalPdf(d1);
  const premium = black76Premium(input);

  const delta = optionType === "CALL" ? discount * normalCdf(d1) : -discount * normalCdf(-d1);
  const gamma = (discount * pdfD1) / (F * sigma * sqrtT);
  const vega = F * discount * pdfD1 * sqrtT;
  // θ = ∂V/∂t = r·V − e^{-rT}·F·φ(d1)·σ / (2√T) — derivado do Black-76 (ver comentário do módulo);
  // validado por diferenças finitas em optionPricing.test.ts. `r` aqui é a taxa contínua equivalente.
  const thetaAnnual = r * premium - (discount * F * pdfD1 * sigma) / (2 * sqrtT);
  return { delta, gamma, vegaPer1PctVol: vega / 100, thetaPerCalendarDay: thetaAnnual / 365 };
}

export type ImpliedVolatilityResult = {
  volatilityAnnual: number;
  iterations: number;
  converged: boolean;
};

/**
 * Extrai a volatilidade implícita anual pelo prêmio de liquidação B3 observado, via
 * Newton-Raphson com salvaguarda de bisseção. Nunca retorna um valor sem convergência
 * numérica dentro da tolerância — lança erro nesse caso, em vez de aproximar.
 */
export function black76ImpliedVolatility(input: {
  optionType: OptionType;
  futuresPrice: number;
  strike: number;
  yearsToExpiry: number;
  riskFreeRateAnnual: number;
  observedPremium: number;
}): ImpliedVolatilityResult {
  const { optionType, futuresPrice: F, strike: K, yearsToExpiry: T, riskFreeRateAnnual, observedPremium } = input;
  if (T <= 0) throw new Error("O tempo até o vencimento deve ser positivo para extrair volatilidade implícita.");
  if (!Number.isFinite(observedPremium) || observedPremium < 0) throw new Error("O prêmio observado deve ser um número finito e não negativo.");
  const r = continuousRateFromBase252(riskFreeRateAnnual);
  const discount = Math.exp(-r * T);
  const intrinsic = discount * Math.max(optionType === "CALL" ? F - K : K - F, 0);
  const theoreticalCeiling = optionType === "CALL" ? discount * F : discount * K;
  if (observedPremium < intrinsic - 1e-9) throw new Error("O prêmio de liquidação B3 observado está abaixo do valor intrínseco descontado — viola não-arbitragem; volatilidade implícita não é extraída.");
  if (observedPremium > theoreticalCeiling + 1e-9) throw new Error("O prêmio de liquidação B3 observado excede o limite teórico do modelo — volatilidade implícita não é extraída.");
  if (observedPremium - intrinsic < 1e-8) throw new Error("O prêmio de liquidação B3 observado não contém valor temporal residual — volatilidade implícita não é numericamente identificável neste vencimento.");

  let low = 1e-6;
  let high = 5.0; // 500% a.a. — teto generoso para mercados de commodity/câmbio brasileiros.
  const maxIterations = 100;
  const tolerance = 1e-8;

  let sigma = 0.3;
  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const premium = black76Premium({ optionType, futuresPrice: F, strike: K, yearsToExpiry: T, riskFreeRateAnnual, volatilityAnnual: sigma });
    const diff = premium - observedPremium;
    if (diff > 0) high = sigma; else low = sigma;
    if (Math.abs(diff) < tolerance) return { volatilityAnnual: sigma, iterations: iteration, converged: true };
    const { vegaPer1PctVol } = black76Greeks({ optionType, futuresPrice: F, strike: K, yearsToExpiry: T, riskFreeRateAnnual, volatilityAnnual: sigma });
    const vega = vegaPer1PctVol * 100;
    const newtonStep = vega > 1e-10 ? sigma - diff / vega : NaN;
    sigma = Number.isFinite(newtonStep) && newtonStep > low && newtonStep < high ? newtonStep : (low + high) / 2;
  }
  throw new Error("O solver de volatilidade implícita não convergiu dentro da tolerância numérica após 100 iterações.");
}

/** Conta dias úteis (base 252) entre a data-base e o vencimento e converte para fração de ano — mesma convenção usada pela curva DI1/ETTJ do produto. */
export function yearsToExpiryBase252(valuationDate: string, expiryDate: string, calendarId: BusinessCalendarId) {
  const businessDays = businessDaysBetween(valuationDate, expiryDate, calendarId);
  if (businessDays <= 0) throw new Error("A data de vencimento deve ser posterior à data-base para o cálculo de prêmio/Greeks.");
  return businessDays / 252;
}
