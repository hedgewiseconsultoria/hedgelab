import type { CanonicalHedgeDataframes, SessionInstrumentMasterRow } from "./dataframes";
import type { HedgeRow } from "./scenarioBundle";

type NdfSizingContext = { instrumentMasterRows: SessionInstrumentMasterRow[]; hedgeRows: HedgeRow[] };

/** Publica o nocional de NDF somente quando contrato, designação e horizonte econômico coincidem de modo verificável. */
export function attachCanonicalNdfSizing(dataframes: CanonicalHedgeDataframes, context: NdfSizingContext): CanonicalHedgeDataframes {
  const replacements = context.hedgeRows.flatMap(hedge => {
    if (hedge.strategy !== "NDF_CONTRATUAL" || !Number.isInteger(hedge.quantity) || hedge.quantity <= 0) return [];
    const master = context.instrumentMasterRows.find(row => "kind" in row && row.kind === "OTC_NDF" && row.instrument_id === hedge.instrument_id && row.validation_status === "validated_user_contract");
    if (!master || !("notional_base_currency" in master) || master.base_currency !== "USD" || master.quote_currency !== "BRL" || !Number.isFinite(master.notional_base_currency) || master.notional_base_currency <= 0 || master.maturity !== hedge.maturity) return [];
    const situation = dataframes.economic_situation_dataframe.find(row => row.exposure_id === hedge.exposure_id && row.declared_currency === "USD" && row.horizon_date === master.maturity);
    if (!situation || !Number.isFinite(situation.declared_quantity) || situation.declared_quantity <= 0) return [];
    const alternative = dataframes.hedge_alternative_dataframe.find(row => row.exposure_id === hedge.exposure_id && row.economic_situation_id === situation.economic_situation_id && row.alternative_kind === "OTC_NDF_OR_TERM" && row.eligibility_status === "contract_required");
    if (!alternative) return [];
    const rawCoveragePct = (hedge.quantity * master.notional_base_currency / situation.declared_quantity) * 100;
    const coverageTargetPct = Math.min(rawCoveragePct, 100);
    const limitation = rawCoveragePct > 100
      ? `O nocional contratual produz cobertura bruta de ${rawCoveragePct.toFixed(6)}%; coverage_target_pct foi limitado a 100%, preservando a sobrecobertura na limitação auditável.`
      : "Cobertura nocional NDF vinculada a contrato bilateral hasheado, designação explícita e vencimento coincidente; não representa MTM, custo financeiro ou risco de contraparte.";
    return [{ sizing_id: `sizing::${alternative.alternative_id}`, alternative_id: alternative.alternative_id, economic_situation_id: situation.economic_situation_id, sizing_status: "sized" as const, coverage_target_pct: coverageTargetPct, hedge_quantity: hedge.quantity, hedge_unit: `contrato NDF (${master.notional_base_currency.toLocaleString("en-US")} USD)`, required_data: ["contrato NDF hasheado", "designação de hedge", "nocional USD", "vencimento coincidente"], blocking_reason: limitation, method_version: "hedge-sizing-canonical-v1" as const }];
  });
  if (!replacements.length) return dataframes;
  const changed = replacements.some(next => {
    const current = dataframes.hedge_sizing_dataframe.find(row => row.sizing_id === next.sizing_id);
    return !current || JSON.stringify(current) !== JSON.stringify(next);
  });
  if (!changed) return dataframes;
  return { ...dataframes, hedge_sizing_dataframe: [...replacements, ...dataframes.hedge_sizing_dataframe.filter(current => !replacements.some(next => next.sizing_id === current.sizing_id))] };
}
