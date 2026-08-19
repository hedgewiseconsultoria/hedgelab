import type { CanonicalHedgeDataframes, SessionInstrumentMasterRow } from "./dataframes";
import type { HedgeRow } from "./scenarioBundle";

type RateSwapSizingContext = { instrumentMasterRows: SessionInstrumentMasterRow[]; hedgeRows: HedgeRow[] };
type RateSwapTerms = { payerLeg: "PAY_FIXED_RECEIVE_FLOATING" | "RECEIVE_FIXED_PAY_FLOATING"; floatingLegIndex: string; fixedLegConvention: string; paymentSchedule: string; startDate: string; endDate: string };

function isRateSwapTerms(value: unknown): value is RateSwapTerms {
  if (!value || typeof value !== "object") return false;
  const terms = value as Record<string, unknown>;
  return (terms.payerLeg === "PAY_FIXED_RECEIVE_FLOATING" || terms.payerLeg === "RECEIVE_FIXED_PAY_FLOATING")
    && typeof terms.floatingLegIndex === "string" && terms.floatingLegIndex.trim().length > 0
    && typeof terms.fixedLegConvention === "string" && terms.fixedLegConvention.trim().length > 0
    && typeof terms.paymentSchedule === "string" && terms.paymentSchedule.trim().length > 0
    && typeof terms.startDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(terms.startDate)
    && typeof terms.endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(terms.endDate)
    && terms.endDate > terms.startDate;
}

/** Publica somente a equivalência nocional de um swap de taxa já contratado; não calcula taxa, cupom, curva, MTM ou resultado. */
export function attachCanonicalRateSwapSizing(dataframes: CanonicalHedgeDataframes, context: RateSwapSizingContext): CanonicalHedgeDataframes {
  const replacements = context.hedgeRows.flatMap(hedge => {
    if (hedge.strategy !== "SWAP_TAXA_CONTRATUAL" || !Number.isInteger(hedge.quantity) || hedge.quantity <= 0) return [];
    const master = context.instrumentMasterRows.find(row => "kind" in row && row.kind === "OTC_RATE_SWAP" && row.instrument_id === hedge.instrument_id && row.validation_status === "validated_user_contract");
    if (!master || !("notional_base_currency" in master) || master.base_currency !== "BRL" || master.quote_currency !== "BRL" || !Number.isFinite(master.notional_base_currency) || master.notional_base_currency <= 0 || master.maturity !== hedge.maturity || !isRateSwapTerms(master.terms)) return [];
    const situation = dataframes.economic_situation_dataframe.find(row => row.exposure_id === hedge.exposure_id && row.situation_kind === "CDI_LINKED_DEBT" && row.declared_currency === "BRL" && row.indexer === "CDI" && row.horizon_date === master.maturity);
    if (!situation || !Number.isFinite(situation.declared_quantity) || situation.declared_quantity <= 0) return [];
    const alternative = dataframes.hedge_alternative_dataframe.find(row => row.exposure_id === hedge.exposure_id && row.economic_situation_id === situation.economic_situation_id && row.alternative_kind === "OTC_RATE_SWAP" && row.eligibility_status === "contract_required");
    if (!alternative) return [];
    const rawCoveragePct = (hedge.quantity * master.notional_base_currency / situation.declared_quantity) * 100;
    const coverageTargetPct = Math.min(rawCoveragePct, 100);
    const limitation = rawCoveragePct > 100
      ? `O nocional contratual produz cobertura bruta de ${rawCoveragePct.toFixed(6)}%; coverage_target_pct foi limitado a 100%, preservando a sobrecobertura na limitação auditável. Não representa taxa, cupom, curva, MTM, DV01 ou resultado financeiro.`
      : "Referência nocional de swap de taxa vinculada a contrato bilateral hasheado, designação explícita e vencimento coincidente; não representa taxa, cupom, curva, MTM, DV01 ou resultado financeiro.";
    return [{ sizing_id: `sizing::${alternative.alternative_id}`, alternative_id: alternative.alternative_id, economic_situation_id: situation.economic_situation_id, sizing_status: "sized" as const, coverage_target_pct: coverageTargetPct, hedge_quantity: hedge.quantity, hedge_unit: `contrato de swap de taxa (${master.notional_base_currency.toLocaleString("en-US")} BRL)`, required_data: ["contrato de swap de taxa hasheado", "pernas e convenções declaradas", "designação de hedge", "exposição CDI em BRL", "vencimento coincidente"], blocking_reason: limitation, method_version: "hedge-sizing-canonical-v1" as const }];
  });
  if (!replacements.length) return dataframes;
  const changed = replacements.some(next => {
    const current = dataframes.hedge_sizing_dataframe.find(row => row.sizing_id === next.sizing_id);
    return !current || JSON.stringify(current) !== JSON.stringify(next);
  });
  if (!changed) return dataframes;
  return { ...dataframes, hedge_sizing_dataframe: [...replacements, ...dataframes.hedge_sizing_dataframe.filter(current => !replacements.some(next => next.sizing_id === current.sizing_id))] };
}
