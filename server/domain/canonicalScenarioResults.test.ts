import { describe, expect, it } from "vitest";
import { attachEligibleCanonicalScenarioResults } from "./canonicalScenarioResults";
import { emptyCanonicalHedgeDataframes } from "./canonicalHedgeDataframes";

describe("attachEligibleCanonicalScenarioResults", () => {
  it("vincula o ajuste DI1 ao resultado canônico apenas quando existe alternativa DI1 elegível e cálculo com evidência", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-di1", exposure_id: "exp-di1", alternative_kind: "B3_DI1_FUTURE", label: "DI1", risk_factor: "CDI_RATE", hedge_direction: "SELL", eligibility_status: "eligible_with_market_data", required_data: ["PU"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-di1", risk_factor_id: "risk-di1", origin: "CATALOG_DERIVED" });
    const next = attachEligibleCanonicalScenarioResults(frames, { scenario_id: "scn-di1", scenario_name: "Ajuste DI1", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, [{ calculation_id: "calc-di1", scenario_id: "scn-di1", method: "B3_DI1_DAILY_VARIATION_MARGIN", formula_version: "v1", calculation_status: "SUCCESS", result: { dailyVariationMarginBrl: 123.45, lineage: { settlement: { sourceFile: "pr.xml" } } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]);
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-di1", calculation_id: "calc-di1", economic_result: 123.45, result_currency: "BRL" }]);
  });

  it("não promove cenário sem alternativa diagnosticada ou sem sucesso", () => {
    const next = attachEligibleCanonicalScenarioResults(emptyCanonicalHedgeDataframes(), { scenario_id: "scn", scenario_name: "Base", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, [{ calculation_id: "calc", scenario_id: "scn", method: "B3_DI1_DAILY_VARIATION_MARGIN", formula_version: "v1", calculation_status: "SUCCESS", result: { dailyVariationMarginBrl: 1, lineage: {} }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]);
    expect(next.scenario_result_dataframe).toEqual([]);
  });

  it("vincula NDF somente quando contrato OTC, hedge e linhagem oficial são compatíveis", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-ndf", exposure_id: "exp-usd", alternative_kind: "OTC_NDF_OR_TERM", label: "NDF", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "contract_required", required_data: ["contrato"], blocking_reason: "Contrato bilateral obrigatório", source_ids: ["USER_CONTRACT", "BCB_PTAX"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
    const scenario = { scenario_id: "scn-ndf", scenario_name: "NDF", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" };
    const calculation = { calculation_id: "calc-ndf", scenario_id: "scn-ndf", method: "NDF_SETTLEMENT_PV", formula_version: "v1", calculation_status: "SUCCESS" as const, result: { contract_id: "NDF-001", present_value_brl: 456.78, lineage: { ptaxLineage: {}, ettjLineage: {} } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" };
    const next = attachEligibleCanonicalScenarioResults(frames, scenario, [calculation], { instrumentMasterRows: [{ instrument_id: "NDF-001", kind: "OTC_NDF", validation_status: "validated_user_contract", evidence_sha256: "a".repeat(64) } as never], hedgeRows: [{ hedge_id: "hedge-1", exposure_id: "exp-usd", instrument_id: "NDF-001", strategy: "NDF_CONTRATUAL", quantity: 1, trade_date: "2026-08-01", maturity: "2026-09-01", method_version: "v1" }] });
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-ndf", calculation_id: "calc-ndf", economic_result: 456.78, result_currency: "BRL" }]);
  });

  it("vincula o fluxo de swap cambial apenas ao contrato OTC hasheado e à designação explícita", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-swap", exposure_id: "exp-usd", alternative_kind: "OTC_FX_SWAP", label: "Swap cambial", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "contract_required", required_data: ["contrato"], blocking_reason: "Contrato bilateral obrigatório", source_ids: ["USER_CONTRACT", "BCB_PTAX"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
    const scenario = { scenario_id: "scn-swap", scenario_name: "Swap cambial", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-19T00:00:00.000Z" };
    const calculation = { calculation_id: "calc-swap", scenario_id: "scn-swap", method: "BCB_TRADITIONAL_FX_SWAP_CASHFLOW_SCENARIO", formula_version: "1.0.0", calculation_status: "SUCCESS" as const, result: { contract_id: "SWAP-001", source_contract_sha256: "a".repeat(64), net_cashflow_brl: 1_250, pricing_status: "cashflow_scenario_not_contract_mtm", lineage: { bcbSwapLineage: {}, fxLineage: {}, domesticRateLineage: {} } }, warnings: [], calculated_at_utc: "2026-08-19T00:00:00.000Z" };
    const context = { instrumentMasterRows: [{ instrument_id: "SWAP-001", kind: "OTC_FX_SWAP", validation_status: "validated_user_contract", evidence_sha256: "a".repeat(64) } as never], hedgeRows: [{ hedge_id: "hedge-swap", exposure_id: "exp-usd", instrument_id: "SWAP-001", strategy: "SWAP_CAMBIAL_CONTRATUAL", quantity: 1, trade_date: "2026-08-01", maturity: "2026-10-01", method_version: "otc-contract-master-v1" }] };
    const promoted = attachEligibleCanonicalScenarioResults(frames, scenario, [calculation], context);
    expect(promoted.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-swap", calculation_id: "calc-swap", economic_result: 1_250, result_currency: "BRL" }]);
    const blocked = attachEligibleCanonicalScenarioResults(frames, scenario, [{ ...calculation, result: { ...calculation.result, source_contract_sha256: "b".repeat(64) } }], context);
    expect(blocked).toBe(frames);
  });

  it("vincula ajuste diário DOL somente quando a evidência atual coincide com a observação B3 selecionada", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-dol", exposure_id: "exp-usd", alternative_kind: "B3_DOL_FUTURE", label: "DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
    frames.b3_observation_link_dataframe = [{ observation_link_id: "obs-dol", alternative_id: "alt-dol", family: "DOL", symbol: "DOLU26", instrument_id: "ID-DOL", instrument_type: "FUTURE", maturity: "2026-09-01", option_type: null, exercise_price: null, observed_prices: { last_price: 5.4, trade_average_price: null, adjusted_quote: 5.39, adjusted_quote_tax: null }, price_source: { report_type: "BVBG.086.01", source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.086.01-current.xml", source_asof: "2026-08-13", source_hash_sha256: "b".repeat(64), normalized_csv_storage_key: "b3/normalized/current.csv", normalized_csv_sha256: "c".repeat(64), normalized_manifest_storage_key: "b3/normalized/current.manifest.json" }, instrument_source: { source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.028.02.xml", source_asof: "2026-08-13", source_hash_sha256: "d".repeat(64), normalized_csv_storage_key: "b3/normalized/instrument.csv", normalized_csv_sha256: "e".repeat(64), normalized_manifest_storage_key: "b3/normalized/instrument.manifest.json" }, association_status: "valid_same_asof", selected_at_utc: "2026-08-18T00:00:00.000Z", method_version: "b3-observation-selection-v1" }];
    const scenario = { scenario_id: "scn-dol", scenario_name: "Ajuste DOL", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" };
    const calculation = { calculation_id: "calc-dol", scenario_id: "scn-dol", method: "B3_FX_FUTURE_DAILY_SETTLEMENT_VARIATION", formula_version: "1.0.0", calculation_status: "SUCCESS" as const, result: { contract: "DOL", dailySettlementVariationBrl: 1_000, lineage: { currentB3Lineage: { sourceAsOf: "2026-08-13", sourceFile: "BVBG.086.01-current.xml", sourceHashSha256: "b".repeat(64) } } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" };
    const promoted = attachEligibleCanonicalScenarioResults(frames, scenario, [calculation]);
    expect(promoted.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-dol", calculation_id: "calc-dol", economic_result: 1_000, result_currency: "BRL" }]);
    const blocked = attachEligibleCanonicalScenarioResults(frames, scenario, [{ ...calculation, result: { ...calculation.result, lineage: { currentB3Lineage: { ...calculation.result.lineage.currentB3Lineage, sourceHashSha256: "f".repeat(64) } } } }]);
    expect(blocked).toBe(frames);
  });

  it("vincula o exercício intrínseco apenas à opção DOL selecionada com a mesma evidência B3", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-option", exposure_id: "exp-usd", alternative_kind: "B3_DOL_OPTION", label: "Opção DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" });
    frames.b3_observation_link_dataframe = [{ alternative_id: "alt-option", family: "DOL", symbol: "DOLUO26", instrument_type: "OPTION", price_source: { source_asof: "2026-08-13", source_file: "BVBG.086.01.xml", source_hash_sha256: "a".repeat(64) } } as never];
    const next = attachEligibleCanonicalScenarioResults(frames, { scenario_id: "scn-option", scenario_name: "Opção DOL", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, [{ calculation_id: "calc-option", scenario_id: "scn-option", method: "B3_DOL_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { grossExerciseBrl: 10_000, lineage: { sourceAsOf: "2026-08-13", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "a".repeat(64), underlyingSymbol: "DOLU26" } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]);
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-option", calculation_id: "calc-option", economic_result: 10_000, result_currency: "BRL" }]);
  });

  it("vincula o exercício intrínseco apenas à opção CCM selecionada com a mesma evidência B3", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-ccm-option", exposure_id: "exp-ccm", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção CCM", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-ccm", risk_factor_id: "risk-ccm", origin: "CATALOG_DERIVED" });
    frames.b3_observation_link_dataframe = [{ alternative_id: "alt-ccm-option", family: "CCM", symbol: "CCMUO26", instrument_type: "OPTION", price_source: { source_asof: "2026-08-17", source_file: "BVBG.086.01.xml", source_hash_sha256: "c".repeat(64) } } as never];
    const next = attachEligibleCanonicalScenarioResults(frames, { scenario_id: "scn-ccm-option", scenario_name: "Opção CCM", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, [{ calculation_id: "calc-ccm-option", scenario_id: "scn-ccm-option", method: "B3_CCM_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { grossExerciseBrl: 1_800, lineage: { sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "c".repeat(64), underlyingSymbol: "CCMU26" } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]);
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-ccm-option", calculation_id: "calc-ccm-option", economic_result: 1_800, result_currency: "BRL" }]);
  });

  it("vincula o exercício intrínseco apenas à opção BGI selecionada com a mesma evidência B3", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-bgi-option", exposure_id: "exp-bgi", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção BGI", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "SELL", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-bgi", risk_factor_id: "risk-bgi", origin: "CATALOG_DERIVED" });
    frames.b3_observation_link_dataframe = [{ alternative_id: "alt-bgi-option", family: "BGI", symbol: "BGIVO26", instrument_type: "OPTION", price_source: { source_asof: "2026-08-17", source_file: "BVBG.086.01.xml", source_hash_sha256: "d".repeat(64) } } as never];
    const next = attachEligibleCanonicalScenarioResults(frames, { scenario_id: "scn-bgi-option", scenario_name: "Opção BGI", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, [{ calculation_id: "calc-bgi-option", scenario_id: "scn-bgi-option", method: "B3_BGI_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { grossExerciseBrl: 3_300, lineage: { sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "d".repeat(64), underlyingSymbol: "BGIV26" } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]);
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-bgi-option", calculation_id: "calc-bgi-option", economic_result: 3_300, result_currency: "BRL" }]);
  });

  it("vincula o exercício intrínseco apenas à opção SOY selecionada na moeda USD", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-soy-option", exposure_id: "exp-soy", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção SOY", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-soy", risk_factor_id: "risk-soy", origin: "CATALOG_DERIVED" });
    frames.b3_observation_link_dataframe = [{ alternative_id: "alt-soy-option", family: "SOY", symbol: "SOYX26", instrument_type: "OPTION", price_source: { source_asof: "2026-08-17", source_file: "BVBG.086.01.xml", source_hash_sha256: "e".repeat(64) } } as never];
    const next = attachEligibleCanonicalScenarioResults(frames, { scenario_id: "scn-soy-option", scenario_name: "Opção SOY", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, [{ calculation_id: "calc-soy-option", scenario_id: "scn-soy-option", method: "B3_SOY_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { grossExerciseUsd: 340, lineage: { sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "e".repeat(64), underlyingSymbol: "SOYX26" } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]);
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-soy-option", calculation_id: "calc-soy-option", economic_result: 340, result_currency: "USD" }]);
  });

  it("vincula o exercício intrínseco apenas à opção SJC selecionada na moeda USD", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push({ alternative_id: "alt-sjc-option", exposure_id: "exp-sjc", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção SJC", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-sjc", risk_factor_id: "risk-sjc", origin: "CATALOG_DERIVED" });
    frames.b3_observation_link_dataframe = [{ alternative_id: "alt-sjc-option", family: "SJC", symbol: "SJCX26", instrument_type: "OPTION", price_source: { source_asof: "2026-08-17", source_file: "BVBG.086.01.xml", source_hash_sha256: "f".repeat(64) } } as never];
    const scenario = { scenario_id: "scn-sjc-option", scenario_name: "Opção SJC", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" };
    const calculation = { calculation_id: "calc-sjc-option", scenario_id: "scn-sjc-option", method: "B3_SJC_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formula_version: "1.0.0", calculation_status: "SUCCESS" as const, result: { grossExerciseUsd: 1_125, lineage: { sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "f".repeat(64), underlyingSymbol: "SJCX26" } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" };
    const next = attachEligibleCanonicalScenarioResults(frames, scenario, [calculation]);
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-sjc-option", calculation_id: "calc-sjc-option", economic_result: 1_125, result_currency: "USD" }]);
    const blocked = attachEligibleCanonicalScenarioResults(frames, scenario, [{ ...calculation, result: { ...calculation.result, lineage: { ...calculation.result.lineage, sourceHashSha256: "a".repeat(64) } } }]);
    expect(blocked).toBe(frames);
  });

  it("seleciona a alternativa de commodity pela família SJC observada, não pela primeira alternativa elegível", () => {
    const frames = emptyCanonicalHedgeDataframes();
    frames.hedge_alternative_dataframe.push(
      { alternative_id: "alt-bgi-option", exposure_id: "exp-bgi", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção BGI", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-bgi", risk_factor_id: "risk-bgi", origin: "CATALOG_DERIVED" },
      { alternative_id: "alt-sjc-option", exposure_id: "exp-sjc", alternative_kind: "B3_COMMODITY_OPTION", label: "Opção SJC", risk_factor: "B3_COMMODITY_PRICE", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: ["série"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "sit-sjc", risk_factor_id: "risk-sjc", origin: "CATALOG_DERIVED" },
    );
    frames.b3_observation_link_dataframe = [
      { alternative_id: "alt-bgi-option", family: "BGI", symbol: "BGIVO26", instrument_type: "OPTION", price_source: { source_asof: "2026-08-17", source_file: "BVBG.086.01.xml", source_hash_sha256: "b".repeat(64) } } as never,
      { alternative_id: "alt-sjc-option", family: "SJC", symbol: "SJCX26", instrument_type: "OPTION", price_source: { source_asof: "2026-08-17", source_file: "BVBG.086.01.xml", source_hash_sha256: "s".repeat(64) } } as never,
    ];
    const next = attachEligibleCanonicalScenarioResults(frames, { scenario_id: "scn-sjc-family", scenario_name: "Opção SJC", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: "2026-08-18T00:00:00.000Z" }, [{ calculation_id: "calc-sjc-family", scenario_id: "scn-sjc-family", method: "B3_SJC_OPTION_INTRINSIC_SETTLEMENT_SCENARIO", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { grossExerciseUsd: 450, lineage: { sourceAsOf: "2026-08-17", sourceFile: "BVBG.086.01.xml", sourceHashSha256: "s".repeat(64) } }, warnings: [], calculated_at_utc: "2026-08-18T00:00:00.000Z" }]);
    expect(next.scenario_result_dataframe).toMatchObject([{ alternative_id: "alt-sjc-option", calculation_id: "calc-sjc-family", economic_result: 450, result_currency: "USD" }]);
  });
});
