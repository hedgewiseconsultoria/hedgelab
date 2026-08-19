export type B3Evidence = { sourceId: "B3_PUBLIC_FILES" | "B3_CONTRACT"; sourceAsOf: string | null; sourceFile: string; sourceHashSha256: string };

export type Di1VariationMarginInput = {
  position: "PU_BUYER" | "PU_SELLER";
  contracts: number;
  positionState: "INITIATED_TODAY" | "OUTSTANDING_FROM_PREVIOUS_DAY";
  settlementPuToday: number;
  tradeRatePct?: number;
  businessDaysToDayBeforeExpiration?: number;
  settlementPuPreviousDay?: number;
  diRatesPctForCorrection?: number[];
  settlementLineage: B3Evidence;
  previousSettlementLineage?: B3Evidence;
  diRateLineage?: B3Evidence;
};

export type Di1VariationMarginResult = {
  method: "B3_DI1_DAILY_VARIATION_MARGIN";
  formulaVersion: "B3_DI1_CONTRACT_2026_08";
  tradePu: number | null;
  correctionFactor: number | null;
  settlementPuToday: number;
  dailyVariationMarginBrl: number;
  cashSettlement: "next_trading_session";
  calculation: string;
  lineage: { settlement: B3Evidence; previousSettlement: B3Evidence | null; diRate: B3Evidence | null; contract: B3Evidence };
};

const DI1_CONTRACT_EVIDENCE: B3Evidence = {
  sourceId: "B3_CONTRACT", sourceAsOf: null, sourceFile: "di1_contrato_oficial.pdf", sourceHashSha256: "2cbc8dd4c9806b24cfb41e1ff11bceda4cba14883141f475e41930a7468db981",
};

function assertEvidence(evidence: B3Evidence | undefined, label: string) {
  if (!evidence || !evidence.sourceFile || !/^[a-f0-9]{64}$/.test(evidence.sourceHashSha256)) throw new Error(`${label} exige arquivo oficial e hash SHA-256.`);
}

function roundPu(value: number) { return Math.round(value * 1000) / 1000; }

/** Fórmulas ADt, PO e FCt do contrato DI1 publicado pela B3. M = BRL 1 por ponto. */
export function calculateDi1VariationMargin(input: Di1VariationMarginInput): Di1VariationMarginResult {
  if (!Number.isInteger(input.contracts) || input.contracts <= 0) throw new Error("A quantidade de contratos DI1 deve ser inteira e positiva.");
  if (!Number.isFinite(input.settlementPuToday) || input.settlementPuToday <= 0) throw new Error("O preço de ajuste DI1 do dia deve ser positivo e finito.");
  assertEvidence(input.settlementLineage, "O preço de ajuste do dia");
  const sign = input.position === "PU_BUYER" ? 1 : -1;
  if (input.positionState === "INITIATED_TODAY") {
    if (input.tradeRatePct === undefined || input.businessDaysToDayBeforeExpiration === undefined || !Number.isFinite(input.tradeRatePct) || !Number.isInteger(input.businessDaysToDayBeforeExpiration) || input.businessDaysToDayBeforeExpiration < 0) throw new Error("A posição iniciada hoje exige taxa negociada e número de dias úteis até a véspera do vencimento.");
    const tradeRatePct = input.tradeRatePct!;
    const businessDaysToDayBeforeExpiration = input.businessDaysToDayBeforeExpiration!;
    const tradePu = roundPu(100_000 / Math.pow(1 + tradeRatePct / 100, businessDaysToDayBeforeExpiration / 252));
    return { method: "B3_DI1_DAILY_VARIATION_MARGIN", formulaVersion: "B3_DI1_CONTRACT_2026_08", tradePu, correctionFactor: null, settlementPuToday: input.settlementPuToday, dailyVariationMarginBrl: sign * (input.settlementPuToday - tradePu) * input.contracts, cashSettlement: "next_trading_session", calculation: "ADt = sinal × (PAt − PO) × M × N; PO = 100.000 ÷ (1 + i/100)^(n/252); M = BRL 1", lineage: { settlement: input.settlementLineage, previousSettlement: null, diRate: null, contract: DI1_CONTRACT_EVIDENCE } };
  }
  if (input.settlementPuPreviousDay === undefined || !Number.isFinite(input.settlementPuPreviousDay) || input.settlementPuPreviousDay <= 0 || !input.diRatesPctForCorrection?.length) throw new Error("A posição em aberto exige ajuste anterior e ao menos uma taxa DI para o fator de correção.");
  assertEvidence(input.previousSettlementLineage, "O preço de ajuste anterior");
  assertEvidence(input.diRateLineage, "A taxa DI");
  const settlementPuPreviousDay = input.settlementPuPreviousDay!;
  const correctionFactor = input.diRatesPctForCorrection.reduce((factor, diRatePct) => {
    if (!Number.isFinite(diRatePct) || diRatePct <= -100) throw new Error("Cada taxa DI deve ser finita e superior a -100%.");
    return factor * Math.pow(1 + diRatePct / 100, 1 / 252);
  }, 1);
  return { method: "B3_DI1_DAILY_VARIATION_MARGIN", formulaVersion: "B3_DI1_CONTRACT_2026_08", tradePu: null, correctionFactor, settlementPuToday: input.settlementPuToday, dailyVariationMarginBrl: sign * (input.settlementPuToday - settlementPuPreviousDay * correctionFactor) * input.contracts, cashSettlement: "next_trading_session", calculation: "ADt = sinal × [PAt − (PAt−1 × FCt)] × M × N; FCt = produto(1 + DI/100)^(1/252); M = BRL 1", lineage: { settlement: input.settlementLineage, previousSettlement: input.previousSettlementLineage!, diRate: input.diRateLineage!, contract: DI1_CONTRACT_EVIDENCE } };
}
