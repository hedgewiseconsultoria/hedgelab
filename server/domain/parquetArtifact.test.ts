import { describe, expect, it } from "vitest";
import { createParquetDataFrameArtifact, createParquetScenarioArtifact, readParquetDataFrameArtifact, readParquetScenarioArtifact } from "./parquetArtifact";

describe("artefato Parquet de DataFrame", () => {
  it("preserva linhas, manifesto e hash verificável", async () => {
    const artifact = await createParquetDataFrameArtifact([{ exposure_id: "EXP-1", notional: 100, nested: { source: "BCB" } }]);
    expect(artifact.manifest.rows).toBe(1);
    expect(artifact.manifest.sha256).toMatch(/^[a-f0-9]{64}$/);
    await expect(readParquetDataFrameArtifact(artifact.bytes, artifact.sha256)).resolves.toEqual([{ exposure_id: "EXP-1", notional: 100, nested: { source: "BCB" } }]);
  });

  it("preserva o dimensionamento DOL publicado em round-trip de sessão", async () => {
    const dataframes = {
      instrument_master_dataframe: [],
      exposure_dataframe: [{ exposure_id: "exp-usd", description: "Importação", currency: "USD", direction: "PAYABLE", notional: 100_000, cashflow_date: "2026-12-15", created_at_utc: "2026-08-18T00:00:00.000Z" }],
      hedge_dataframe: [], scenario_dataframe: [], calculation_dataframe: [], lineage_dataframe: [],
      economic_situation_dataframe: [{ economic_situation_id: "eco-usd", exposure_id: "exp-usd", situation_kind: "USD_PAYABLE", description: "Importação", declared_quantity: 100_000, declared_currency: "USD", horizon_date: "2026-12-15", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-18T00:00:00.000Z" }],
      risk_factor_dataframe: [{ risk_factor_id: "risk-usd", economic_situation_id: "eco-usd", risk_factor: "USD_BRL", adverse_move: "alta", economic_impact: "custo", hedge_direction: "BUY", method_version: "economic-exposure-diagnosis-v1" }],
      hedge_alternative_dataframe: [{ alternative_id: "alt-dol", exposure_id: "exp-usd", alternative_kind: "B3_DOL_FUTURE", label: "DOL", risk_factor: "USD_BRL", hedge_direction: "BUY", eligibility_status: "eligible_with_market_data", required_data: [], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", economic_situation_id: "eco-usd", risk_factor_id: "risk-usd", origin: "CATALOG_DERIVED" }],
      hedge_sizing_dataframe: [{ sizing_id: "sizing::alt-dol", alternative_id: "alt-dol", economic_situation_id: "eco-usd", sizing_status: "sized", coverage_target_pct: 100, hedge_quantity: 3, hedge_unit: "contrato DOL", required_data: ["especificação oficial B3 de DOL"], blocking_reason: "A política de arredondamento CEILING gerou sobrecobertura nocional bruta de 125.000000%; o campo coverage_target_pct foi limitado a 100% para atender ao contrato canônico.", method_version: "hedge-sizing-canonical-v1" }],
      scenario_result_dataframe: [],
      b3_observation_link_dataframe: [{ observation_link_id: "obs-dol", alternative_id: "alt-dol", family: "DOL", symbol: "DOLU26", instrument_id: "ID-DOL", instrument_type: "FUTURE", maturity: "2026-09-01", option_type: null, exercise_price: null, observed_prices: { last_price: 5.4, trade_average_price: null, adjusted_quote: 5.39, adjusted_quote_tax: null }, price_source: { report_type: "BVBG.086.01", source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.086.01.xml", source_asof: "2026-08-18", source_hash_sha256: "a".repeat(64), normalized_csv_storage_key: "b3/normalized/price.csv", normalized_csv_sha256: "c".repeat(64), normalized_manifest_storage_key: "b3/normalized/price.manifest.json" }, instrument_source: { source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.028.02.xml", source_asof: "2026-08-18", source_hash_sha256: "b".repeat(64), normalized_csv_storage_key: "b3/normalized/instrument.csv", normalized_csv_sha256: "d".repeat(64), normalized_manifest_storage_key: "b3/normalized/instrument.manifest.json" }, association_status: "valid_same_asof", selected_at_utc: "2026-08-18T00:00:00.000Z", method_version: "b3-observation-selection-v1" }],
    } as const;
    const artifact = await createParquetScenarioArtifact({ bundleId: "dol-roundtrip", exportedAtUtc: "2026-08-18T00:00:00.000Z", dataframes: dataframes as never });
    const restored = await readParquetScenarioArtifact(artifact.bytes, artifact.manifest);
    expect(restored.dataframes.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alt-dol", sizing_status: "sized", coverage_target_pct: 100, hedge_quantity: 3 }]);
    expect(restored.dataframes.b3_observation_link_dataframe).toMatchObject([{ alternative_id: "alt-dol", symbol: "DOLU26", maturity: "2026-09-01", instrument_source: { source_hash_sha256: "b".repeat(64) } }]);
  });
});
