import { addBusinessDays, type BusinessCalendarId } from "./businessCalendar";

export type NdfDirection = "BUY_USD" | "SELL_USD";

export type NdfSettlementInput = {
  contractId: string;
  direction: NdfDirection;
  notionalUsd: number;
  contractedRateBrlPerUsd: number;
  fixingRateBrlPerUsd: number;
  valuationDate: string;
  remainingBusinessDays: number;
  preRatePctAa252: number;
  settlementCalendar: BusinessCalendarId;
  ptaxLineage: { sourceId: "BCB_PTAX"; sourceAsOf: string; sourceHashSha256: string | null };
  ettjLineage: { sourceId: "ANBIMA_ETTJ"; sourceAsOf: string | null; sourceHashSha256: string | null };
};

export type NdfSettlementResult = {
  method: "NDF_SETTLEMENT_SCENARIO_DISCOUNTED_PRE_252";
  formulaVersion: "1.0.0";
  pricingStatus: "settlement_scenario_not_mtm";
  mtmStatus: "blocked_missing_foreign_currency_curve";
  settlementDate: string;
  grossSettlementBrl: number;
  discountFactorPre252: number;
  presentValueBrl: number;
  direction: NdfDirection;
  calculation: string;
  lineage: Pick<NdfSettlementInput, "ptaxLineage" | "ettjLineage" | "settlementCalendar">;
  limitations: string[];
};

function requireFinitePositive(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${field} deve ser positivo e finito.`);
}

/**
 * Calcula o valor de liquidação de um NDF para uma taxa de fixing observada ou
 * cenário fornecido. Não produz MTM: para isso seriam obrigatórias curvas de
 * ambas as moedas e convenções contratuais completas, que não são presumidas.
 */
export function calculateNdfSettlementScenario(input: NdfSettlementInput): NdfSettlementResult {
  if (!input.contractId.trim()) throw new Error("O identificador do contrato NDF é obrigatório.");
  requireFinitePositive(input.notionalUsd, "O nocional em USD");
  requireFinitePositive(input.contractedRateBrlPerUsd, "A taxa contratada");
  requireFinitePositive(input.fixingRateBrlPerUsd, "A taxa de fixing");
  if (!Number.isFinite(input.preRatePctAa252) || input.preRatePctAa252 <= -100) throw new Error("A taxa PRE deve ser superior a -100% a.a.");
  if (!Number.isInteger(input.remainingBusinessDays) || input.remainingBusinessDays < 0) throw new Error("Os dias úteis remanescentes devem ser inteiro não negativo.");
  if (!input.ptaxLineage.sourceAsOf || !input.ettjLineage.sourceAsOf) throw new Error("PTAX e ETTJ exigem data-base de linhagem.");

  const sign = input.direction === "BUY_USD" ? 1 : -1;
  const grossSettlementBrl = sign * input.notionalUsd * (input.fixingRateBrlPerUsd - input.contractedRateBrlPerUsd);
  const discountFactorPre252 = 1 / Math.pow(1 + input.preRatePctAa252 / 100, input.remainingBusinessDays / 252);
  const settlementDate = addBusinessDays(input.valuationDate, Math.max(input.remainingBusinessDays, 1), input.settlementCalendar);

  return {
    method: "NDF_SETTLEMENT_SCENARIO_DISCOUNTED_PRE_252",
    formulaVersion: "1.0.0",
    pricingStatus: "settlement_scenario_not_mtm",
    mtmStatus: "blocked_missing_foreign_currency_curve",
    settlementDate,
    grossSettlementBrl,
    discountFactorPre252,
    presentValueBrl: grossSettlementBrl * discountFactorPre252,
    direction: input.direction,
    calculation: "PV = sinal × N_USD × (taxa_fixing − taxa_contratada) ÷ (1 + PRE_a.a.)^(DU/252)",
    lineage: { ptaxLineage: input.ptaxLineage, ettjLineage: input.ettjLineage, settlementCalendar: input.settlementCalendar },
    limitations: [
      "Resultado de cenário ou liquidação com taxa de fixing informada; não é MTM de NDF.",
      "O MTM permanece bloqueado sem curva oficial da moeda estrangeira, convenções completas do contrato e verificação de calendário de liquidação.",
      "A taxa PRE é aplicada exclusivamente como desconto em base 252; não substitui a curva estrangeira nem uma taxa a termo de mercado.",
    ],
  };
}
