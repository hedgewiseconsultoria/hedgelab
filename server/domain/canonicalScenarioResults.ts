import type { CanonicalHedgeDataframes, CanonicalScenarioResultRow } from "./dataframes";
import type { SessionInstrumentMasterRow } from "./dataframes";
import type { CalculationRow, HedgeRow, ScenarioRow } from "./scenarioBundle";

type SessionContext = { instrumentMasterRows?: SessionInstrumentMasterRow[]; hedgeRows?: HedgeRow[] };

/**
 * Publica apenas resultados cuja alternativa e cuja evidência já são elegíveis.
 * Cenários lineares didáticos não são promovidos. Cada ramo exige que a fonte e,
 * quando aplicável, o contrato e a designação correspondam ao cálculo registrado.
 */
export function attachEligibleCanonicalScenarioResults(dataframes: CanonicalHedgeDataframes, scenario: ScenarioRow, calculations: CalculationRow[], context: SessionContext = {}): CanonicalHedgeDataframes {
  const di1Alternative = dataframes.hedge_alternative_dataframe.find(row => row.alternative_kind === "B3_DI1_FUTURE" && row.eligibility_status === "eligible_with_market_data");
  const additions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (!di1Alternative || calculation.method !== "B3_DI1_DAILY_VARIATION_MARGIN" || calculation.calculation_status !== "SUCCESS") return [];
    const amount = calculation.result.dailyVariationMarginBrl;
    const lineage = calculation.result.lineage;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${di1Alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: di1Alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "BRL", limitation: "Ajuste diário DI1 vinculado a evidências B3 declaradas; não representa MTM, DV01, FRA ou curva interpolada.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const ndfAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "NDF_SETTLEMENT_PV" || calculation.calculation_status !== "SUCCESS") return [];
    const contractId = calculation.result.contract_id;
    const amount = calculation.result.present_value_brl;
    const lineage = calculation.result.lineage;
    if (typeof contractId !== "string" || typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    const master = context.instrumentMasterRows?.find(row => "kind" in row && row.kind === "OTC_NDF" && row.instrument_id === contractId && row.validation_status === "validated_user_contract");
    if (!master || !("evidence_sha256" in master) || typeof master.evidence_sha256 !== "string") return [];
    const hedge = context.hedgeRows?.find(row => row.instrument_id === contractId && row.strategy === "NDF_CONTRATUAL");
    if (!hedge) return [];
    const alternative = dataframes.hedge_alternative_dataframe.find(row => row.exposure_id === hedge.exposure_id && row.alternative_kind === "OTC_NDF_OR_TERM" && row.eligibility_status === "contract_required");
    if (!alternative) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "BRL", limitation: "Cenário de liquidação NDF vinculado a contrato OTC hasheado, hedge designado e linhagem PTAX/ETTJ; não representa MTM.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const fxSwapAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "BCB_TRADITIONAL_FX_SWAP_CASHFLOW_SCENARIO" || calculation.calculation_status !== "SUCCESS") return [];
    const contractId = calculation.result.contract_id;
    const contractHash = calculation.result.source_contract_sha256;
    const amount = calculation.result.net_cashflow_brl;
    const pricingStatus = calculation.result.pricing_status;
    const lineage = calculation.result.lineage;
    if (typeof contractId !== "string" || typeof contractHash !== "string" || typeof amount !== "number" || !Number.isFinite(amount) || pricingStatus !== "cashflow_scenario_not_contract_mtm" || !lineage || typeof lineage !== "object") return [];
    const master = context.instrumentMasterRows?.find(row => "kind" in row && row.kind === "OTC_FX_SWAP" && row.instrument_id === contractId && row.validation_status === "validated_user_contract");
    if (!master || !("evidence_sha256" in master) || master.evidence_sha256 !== contractHash) return [];
    const hedge = context.hedgeRows?.find(row => row.instrument_id === contractId && row.strategy === "SWAP_CAMBIAL_CONTRATUAL");
    if (!hedge) return [];
    const alternative = dataframes.hedge_alternative_dataframe.find(row => row.exposure_id === hedge.exposure_id && row.alternative_kind === "OTC_FX_SWAP" && row.eligibility_status === "contract_required");
    if (!alternative) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "BRL", limitation: "Cenário de fluxo de swap cambial vinculado a contrato OTC hasheado, hedge designado e linhagens BCB declaradas; não representa MTM, valor justo, margem ou custo de contraparte.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const fxFutureAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "B3_FX_FUTURE_DAILY_SETTLEMENT_VARIATION" || calculation.calculation_status !== "SUCCESS") return [];
    const contract = calculation.result.contract;
    const amount = calculation.result.dailySettlementVariationBrl;
    const lineage = calculation.result.lineage;
    if ((contract !== "DOL" && contract !== "WDO") || typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    const currentEvidence = (lineage as Record<string, unknown>).currentB3Lineage;
    if (!currentEvidence || typeof currentEvidence !== "object") return [];
    const alternativeKind = contract === "DOL" ? "B3_DOL_FUTURE" : "B3_WDO_FUTURE";
    const alternative = dataframes.hedge_alternative_dataframe.find(row => row.alternative_kind === alternativeKind && row.eligibility_status === "eligible_with_market_data");
    if (!alternative) return [];
    const selectedObservation = dataframes.b3_observation_link_dataframe?.find(row => row.alternative_id === alternative.alternative_id && row.family === contract && row.instrument_type === "FUTURE");
    if (!selectedObservation) return [];
    const currentEvidenceRecord = currentEvidence as Record<string, unknown>;
    if (currentEvidenceRecord.sourceAsOf !== selectedObservation.price_source.source_asof || currentEvidenceRecord.sourceFile !== selectedObservation.price_source.source_file || currentEvidenceRecord.sourceHashSha256 !== selectedObservation.price_source.source_hash_sha256) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "BRL", limitation: "Ajuste diário DOL/WDO vinculado à observação B3 selecionada e a duas evidências B3 declaradas; não representa MTM, margem, emolumentos ou custos financeiros.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const optionAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "B3_DOL_OPTION_INTRINSIC_SETTLEMENT_SCENARIO" || calculation.calculation_status !== "SUCCESS") return [];
    const amount = calculation.result.grossExerciseBrl;
    const lineage = calculation.result.lineage;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    const evidence = lineage as Record<string, unknown>;
    const alternative = dataframes.hedge_alternative_dataframe.find(row => row.alternative_kind === "B3_DOL_OPTION" && row.eligibility_status === "eligible_with_market_data");
    if (!alternative) return [];
    const selectedObservation = dataframes.b3_observation_link_dataframe?.find(row => row.alternative_id === alternative.alternative_id && row.family === "DOL" && row.instrument_type === "OPTION");
    if (!selectedObservation) return [];
    if (evidence.sourceAsOf !== selectedObservation.price_source.source_asof || evidence.sourceFile !== selectedObservation.price_source.source_file || evidence.sourceHashSha256 !== selectedObservation.price_source.source_hash_sha256) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "BRL", limitation: "Resultado limitado ao exercício intrínseco, vinculado à observação B3 de opção selecionada e ao preço de liquidação declarado; prêmio, MTM, volatilidade implícita e Greeks permanecem bloqueados.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const cornOptionAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "B3_CCM_OPTION_INTRINSIC_SETTLEMENT_SCENARIO" || calculation.calculation_status !== "SUCCESS") return [];
    const amount = calculation.result.grossExerciseBrl;
    const lineage = calculation.result.lineage;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    const evidence = lineage as Record<string, unknown>;
    const selectedObservation = dataframes.b3_observation_link_dataframe?.find(row => row.family === "CCM" && row.instrument_type === "OPTION");
    const alternative = selectedObservation ? dataframes.hedge_alternative_dataframe.find(row => row.alternative_id === selectedObservation.alternative_id && row.alternative_kind === "B3_COMMODITY_OPTION" && row.eligibility_status === "eligible_with_market_data") : undefined;
    if (!alternative) return [];
    if (!selectedObservation || evidence.sourceAsOf !== selectedObservation.price_source.source_asof || evidence.sourceFile !== selectedObservation.price_source.source_file || evidence.sourceHashSha256 !== selectedObservation.price_source.source_hash_sha256) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "BRL", limitation: "Resultado limitado ao exercício intrínseco da opção CCM, vinculado à observação B3 selecionada; prêmio, MTM, volatilidade implícita e Greeks permanecem bloqueados.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const cattleOptionAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "B3_BGI_OPTION_INTRINSIC_SETTLEMENT_SCENARIO" || calculation.calculation_status !== "SUCCESS") return [];
    const amount = calculation.result.grossExerciseBrl;
    const lineage = calculation.result.lineage;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    const evidence = lineage as Record<string, unknown>;
    const selectedObservation = dataframes.b3_observation_link_dataframe?.find(row => row.family === "BGI" && row.instrument_type === "OPTION");
    const alternative = selectedObservation ? dataframes.hedge_alternative_dataframe.find(row => row.alternative_id === selectedObservation.alternative_id && row.alternative_kind === "B3_COMMODITY_OPTION" && row.eligibility_status === "eligible_with_market_data") : undefined;
    if (!alternative) return [];
    if (!selectedObservation || evidence.sourceAsOf !== selectedObservation.price_source.source_asof || evidence.sourceFile !== selectedObservation.price_source.source_file || evidence.sourceHashSha256 !== selectedObservation.price_source.source_hash_sha256) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "BRL", limitation: "Resultado limitado ao exercício intrínseco da opção BGI, vinculado à observação B3 selecionada; prêmio, MTM, volatilidade implícita e Greeks permanecem bloqueados.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const soyOptionAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "B3_SOY_OPTION_INTRINSIC_SETTLEMENT_SCENARIO" || calculation.calculation_status !== "SUCCESS") return [];
    const amount = calculation.result.grossExerciseUsd;
    const lineage = calculation.result.lineage;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    const evidence = lineage as Record<string, unknown>;
    const selectedObservation = dataframes.b3_observation_link_dataframe?.find(row => row.family === "SOY" && row.instrument_type === "OPTION");
    const alternative = selectedObservation ? dataframes.hedge_alternative_dataframe.find(row => row.alternative_id === selectedObservation.alternative_id && row.alternative_kind === "B3_COMMODITY_OPTION" && row.eligibility_status === "eligible_with_market_data") : undefined;
    if (!alternative) return [];
    if (!selectedObservation || evidence.sourceAsOf !== selectedObservation.price_source.source_asof || evidence.sourceFile !== selectedObservation.price_source.source_file || evidence.sourceHashSha256 !== selectedObservation.price_source.source_hash_sha256) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "USD", limitation: "Resultado limitado ao exercício intrínseco da opção SOY em USD, vinculado à observação B3 selecionada; prêmio, MTM, volatilidade implícita e Greeks permanecem bloqueados.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const sjcOptionAdditions: CanonicalScenarioResultRow[] = calculations.flatMap(calculation => {
    if (calculation.method !== "B3_SJC_OPTION_INTRINSIC_SETTLEMENT_SCENARIO" || calculation.calculation_status !== "SUCCESS") return [];
    const amount = calculation.result.grossExerciseUsd;
    const lineage = calculation.result.lineage;
    if (typeof amount !== "number" || !Number.isFinite(amount) || !lineage || typeof lineage !== "object") return [];
    const evidence = lineage as Record<string, unknown>;
    const selectedObservation = dataframes.b3_observation_link_dataframe?.find(row => row.family === "SJC" && row.instrument_type === "OPTION");
    const alternative = selectedObservation ? dataframes.hedge_alternative_dataframe.find(row => row.alternative_id === selectedObservation.alternative_id && row.alternative_kind === "B3_COMMODITY_OPTION" && row.eligibility_status === "eligible_with_market_data") : undefined;
    if (!alternative) return [];
    if (!selectedObservation || evidence.sourceAsOf !== selectedObservation.price_source.source_asof || evidence.sourceFile !== selectedObservation.price_source.source_file || evidence.sourceHashSha256 !== selectedObservation.price_source.source_hash_sha256) return [];
    return [{ scenario_result_id: `scenario-result::${scenario.scenario_id}::${alternative.alternative_id}::${calculation.calculation_id}`, scenario_id: scenario.scenario_id, alternative_id: alternative.alternative_id, calculation_id: calculation.calculation_id, result_status: "SUCCESS", economic_result: amount, result_currency: "USD", limitation: "Resultado limitado ao exercício intrínseco da opção SJC em USD, vinculado à observação B3 selecionada; prêmio, MTM, volatilidade implícita e Greeks permanecem bloqueados.", generated_at_utc: calculation.calculated_at_utc }];
  });
  const allAdditions = [...additions, ...ndfAdditions, ...fxSwapAdditions, ...fxFutureAdditions, ...optionAdditions, ...cornOptionAdditions, ...cattleOptionAdditions, ...soyOptionAdditions, ...sjcOptionAdditions];
  if (!allAdditions.length) return dataframes;
  const nextResults = [...allAdditions, ...dataframes.scenario_result_dataframe.filter(existing => !allAdditions.some(next => next.scenario_result_id === existing.scenario_result_id))];
  return { ...dataframes, scenario_result_dataframe: nextResults };
}
