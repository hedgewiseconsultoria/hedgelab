import type {
  CanonicalHedgeDataframes,
  EconomicExposureDataframeRow,
  HedgeAlternativeDataframeRow,
} from "./dataframes";
import type { HedgeAlternativesResult } from "./hedgeAlternatives";

export function emptyCanonicalHedgeDataframes(): CanonicalHedgeDataframes {
  return { economic_situation_dataframe: [], risk_factor_dataframe: [], hedge_alternative_dataframe: [], hedge_sizing_dataframe: [], scenario_result_dataframe: [], b3_observation_link_dataframe: [] };
}

/**
 * Traduz um diagnóstico em DataFrames canônicos sem introduzir série, preço,
 * contrato, quantidade de hedge ou resultado de cenário inexistentes.
 */
export function materializeCanonicalHedgeDataframes(result: HedgeAlternativesResult, capturedAtUtc: string): CanonicalHedgeDataframes {
  const economicSituationId = `economic-situation::${result.exposure.exposureId}`;
  const riskFactorId = `risk-factor::${result.exposure.exposureId}`;
  const exposure: EconomicExposureDataframeRow = {
    exposure_id: result.exposure.exposureId,
    exposure_kind: result.exposure.kind,
    description: result.exposure.description,
    notional: result.exposure.notional,
    currency: result.exposure.currency,
    maturity_date: result.exposure.maturityDate,
    commodity_reference: result.exposure.commodityReference ?? null,
    indexer: result.exposure.indexer ?? null,
    interest_spread_pct_aa: result.exposure.interestSpreadPctAa ?? null,
    declared_at_utc: capturedAtUtc,
  };
  const alternatives: HedgeAlternativeDataframeRow[] = result.alternatives.map(alternative => ({
    alternative_id: `alternative::${result.exposure.exposureId}::${alternative.kind}`,
    exposure_id: result.exposure.exposureId,
    alternative_kind: alternative.kind,
    label: alternative.label,
    risk_factor: alternative.riskFactor,
    hedge_direction: alternative.hedgeDirection,
    eligibility_status: alternative.status,
    required_data: alternative.requiredData,
    blocking_reason: alternative.blockingReason,
    source_ids: alternative.sources,
    method_version: "hedge-alternatives-v1",
  }));
  return {
    economic_situation_dataframe: [{ economic_situation_id: economicSituationId, exposure_id: exposure.exposure_id, situation_kind: exposure.exposure_kind, description: exposure.description, declared_quantity: exposure.notional, declared_currency: exposure.currency, horizon_date: exposure.maturity_date, commodity_reference: exposure.commodity_reference, indexer: exposure.indexer, origin: "USER_DECLARED", captured_at_utc: capturedAtUtc }],
    risk_factor_dataframe: [{ risk_factor_id: riskFactorId, economic_situation_id: economicSituationId, risk_factor: result.diagnosis.riskFactor, adverse_move: result.diagnosis.adverseMove, economic_impact: result.diagnosis.economicImpact, hedge_direction: result.diagnosis.hedgeDirection, method_version: "economic-exposure-diagnosis-v1" }],
    hedge_alternative_dataframe: alternatives.map(alternative => ({ ...alternative, economic_situation_id: economicSituationId, risk_factor_id: riskFactorId, origin: "CATALOG_DERIVED" })),
    hedge_sizing_dataframe: alternatives.map(alternative => ({ sizing_id: `sizing::${alternative.alternative_id}`, alternative_id: alternative.alternative_id, economic_situation_id: economicSituationId, sizing_status: alternative.eligibility_status === "blocked" ? "blocked" : "pending_required_data", coverage_target_pct: null, hedge_quantity: null, hedge_unit: null, required_data: alternative.required_data, blocking_reason: alternative.blocking_reason, method_version: "hedge-sizing-canonical-v1" })),
    scenario_result_dataframe: [],
    b3_observation_link_dataframe: [],
  };
}
