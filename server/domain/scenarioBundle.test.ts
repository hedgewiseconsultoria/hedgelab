import { describe, expect, it } from "vitest";
import { createScenarioBundle, dataframeToCsv, importScenarioBundle } from "./scenarioBundle";

const instrument = {
  instrument_id: "300000055524",
  symbol: "DI1F41",
  isin: "BRBMEFD1I8T4",
  family: "DI1" as const,
  asset_class: "derivatives" as const,
  instrument_type: "FUTURE" as const,
  underlying_id: "9800334",
  underlying_symbol: null,
  maturity: "2041-01-02",
  currency: "BRL",
  contract_size: null,
  tick_size: null,
  settlement_type: null,
  status: "active" as const,
  source: "B3_PUBLIC_FILES" as const,
  source_file: "fixture.xml",
  asof: "2026-08-17",
  source_contract_multiplier: 1,
  source_asset_quotation_quantity: 1,
  contract_size_status: "not_inferred_from_bvbg_028_02" as const,
};

function validBundleInput() {
  return {
    bundleId: "cenario-001",
    exportedAtUtc: "2026-08-17T18:00:00.000Z",
    dataframes: {
      instrument_master_dataframe: [instrument],
      exposure_dataframe: [
        {
          exposure_id: "exp-1",
          description: "Recebível em dólares",
          currency: "USD",
          direction: "RECEIVABLE" as const,
          notional: 50000,
          cashflow_date: "2026-09-01",
          created_at_utc: "2026-08-17T18:00:00.000Z",
        },
      ],
      hedge_dataframe: [
        {
          hedge_id: "hedge-1",
          exposure_id: "exp-1",
          instrument_id: "300000055524",
          strategy: "FUTURO_DI",
          quantity: 1,
          trade_date: "2026-08-17",
          maturity: "2041-01-02",
          method_version: "notional-mapping-v1",
        },
      ],
      scenario_dataframe: [
        {
          scenario_id: "base",
          scenario_name: "Base",
          fx_shock_pct: 0,
          rate_shock_bps: 0,
          volatility_shock_pct: null,
          created_at_utc: "2026-08-17T18:00:00.000Z",
        },
      ],
      calculation_dataframe: [
        {
          calculation_id: "calc-1",
          scenario_id: "base",
          method: "PENDENTE_DE_DADOS_DE_MERCADO",
          formula_version: "0.0.0",
          calculation_status: "BLOCKED" as const,
          result: {},
          warnings: ["Dados de preço ainda não carregados."],
          calculated_at_utc: "2026-08-17T18:00:00.000Z",
        },
      ],
      lineage_dataframe: [
        {
          source_id: "B3_PUBLIC_FILES",
          source_url:
            "https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/historico/boletins-diarios/pesquisa-por-pregao/pesquisa-por-pregao/",
          source_file: "fixture.xml",
          extracted_at_utc: "2026-08-17T18:00:00.000Z",
          source_asof: "2026-08-17",
          source_hash_sha256: "test-only",
          parser_version: "test-v1",
          validation_status: "valid" as const,
        },
      ],
      economic_situation_dataframe: [{ economic_situation_id: "economic-situation::exp-1", exposure_id: "exp-1", situation_kind: "USD_RECEIVABLE" as const, description: "Recebível em dólares", declared_quantity: 50_000, declared_currency: "USD" as const, horizon_date: "2026-09-01", commodity_reference: null, indexer: null, origin: "USER_DECLARED" as const, captured_at_utc: "2026-08-17T18:00:00.000Z" }],
      risk_factor_dataframe: [{ risk_factor_id: "risk-factor::exp-1", economic_situation_id: "economic-situation::exp-1", risk_factor: "USD_BRL" as const, adverse_move: "queda de USD/BRL", economic_impact: "redução da receita em BRL", hedge_direction: "SELL" as const, method_version: "economic-exposure-diagnosis-v1" as const }],
      hedge_alternative_dataframe: [{ alternative_id: "alternative::exp-1::B3_DOL_FUTURE", exposure_id: "exp-1", alternative_kind: "B3_DOL_FUTURE" as const, label: "Futuro de dólar comercial (DOL)", risk_factor: "USD_BRL" as const, hedge_direction: "SELL" as const, eligibility_status: "eligible_with_market_data" as const, required_data: ["série DOL"], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"] as const, method_version: "hedge-alternatives-v1" as const, economic_situation_id: "economic-situation::exp-1", risk_factor_id: "risk-factor::exp-1", origin: "CATALOG_DERIVED" as const }],
      hedge_sizing_dataframe: [{ sizing_id: "sizing::alternative::exp-1::B3_DOL_FUTURE", alternative_id: "alternative::exp-1::B3_DOL_FUTURE", economic_situation_id: "economic-situation::exp-1", sizing_status: "pending_required_data" as const, coverage_target_pct: null, hedge_quantity: null, hedge_unit: null, required_data: ["série DOL"], blocking_reason: null, method_version: "hedge-sizing-canonical-v1" as const }],
      scenario_result_dataframe: [{ scenario_result_id: "result::base", scenario_id: "base", alternative_id: "alternative::exp-1::B3_DOL_FUTURE", calculation_id: "calc-1", result_status: "BLOCKED" as const, economic_result: null, result_currency: null, limitation: "Preço e contrato ainda não validados.", generated_at_utc: "2026-08-17T18:00:00.000Z" }],
      b3_observation_link_dataframe: [{ observation_link_id: "observation::dol", alternative_id: "alternative::exp-1::B3_DOL_FUTURE", family: "DOL" as const, symbol: "DOLU26", instrument_id: "ID-DOL", instrument_type: "FUTURE" as const, maturity: "2026-09-01", option_type: null, exercise_price: null, observed_prices: { last_price: 5.4, trade_average_price: null, adjusted_quote: 5.39, adjusted_quote_tax: null }, price_source: { report_type: "BVBG.086.01" as const, source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.086.01.xml", source_asof: "2026-08-17", source_hash_sha256: "a".repeat(64), normalized_csv_storage_key: "b3/normalized/price.csv", normalized_csv_sha256: "c".repeat(64), normalized_manifest_storage_key: "b3/normalized/price.manifest.json" }, instrument_source: { source_url: "https://www.b3.com.br/pesquisapregao/download", source_file: "BVBG.028.02.xml", source_asof: "2026-08-17", source_hash_sha256: "b".repeat(64), normalized_csv_storage_key: "b3/normalized/instrument.csv", normalized_csv_sha256: "d".repeat(64), normalized_manifest_storage_key: "b3/normalized/instrument.manifest.json" }, association_status: "valid_same_asof" as const, selected_at_utc: "2026-08-17T18:00:00.000Z", method_version: "b3-observation-selection-v1" as const }],
    },
  };
}

describe("pacote de cenário", () => {
  it("exporta e reimporta o pacote preservando a integridade do hash", () => {
    const bundle = createScenarioBundle(validBundleInput());
    const restored = importScenarioBundle(JSON.stringify(bundle));

    expect(restored.bundle_sha256).toBe(bundle.bundle_sha256);
    expect(restored.dataframes.exposure_dataframe[0]?.description).toBe("Recebível em dólares");
    expect(restored.dataframes.hedge_sizing_dataframe?.[0]).toMatchObject({ sizing_status: "pending_required_data", hedge_quantity: null });
    expect(restored.dataframes.b3_observation_link_dataframe).toMatchObject([{ alternative_id: "alternative::exp-1::B3_DOL_FUTURE", symbol: "DOLU26", maturity: "2026-09-01", price_source: { source_hash_sha256: "a".repeat(64) } }]);
  });

  it("preserva em JSON o dimensionamento DOL publicado com sobrecobertura limitada", () => {
    const input = validBundleInput();
    input.dataframes.hedge_sizing_dataframe = [{
      sizing_id: "sizing::alternative::exp-1::B3_DOL_FUTURE",
      alternative_id: "alternative::exp-1::B3_DOL_FUTURE",
      economic_situation_id: "economic-situation::exp-1",
      sizing_status: "sized" as const,
      coverage_target_pct: 100,
      hedge_quantity: 2,
      hedge_unit: "contrato DOL",
      required_data: ["especificação oficial B3 de DOL", "política de arredondamento CEILING"],
      blocking_reason: "A política de arredondamento CEILING gerou sobrecobertura nocional bruta de 125.000000%; o campo coverage_target_pct foi limitado a 100% para atender ao contrato canônico.",
      method_version: "hedge-sizing-canonical-v1" as const,
    }];
    const restored = importScenarioBundle(JSON.stringify(createScenarioBundle(input)));
    expect(restored.dataframes.hedge_sizing_dataframe).toMatchObject([{ alternative_id: "alternative::exp-1::B3_DOL_FUTURE", sizing_status: "sized", coverage_target_pct: 100, hedge_quantity: 2 }]);
    expect(restored.dataframes.hedge_sizing_dataframe?.[0]?.blocking_reason).toContain("125.000000%");
  });

  it("rejeita pacote cuja integridade foi alterada", () => {
    const bundle = createScenarioBundle(validBundleInput());
    const tampered = {
      ...bundle,
      dataframes: {
        ...bundle.dataframes,
        exposure_dataframe: [{ ...bundle.dataframes.exposure_dataframe[0]!, notional: 1 }],
      },
    };

    expect(() => importScenarioBundle(JSON.stringify(tampered))).toThrow("hash divergente");
  });

  it("impede referências de hedge para exposições inexistentes", () => {
    const input = validBundleInput();
    input.dataframes.hedge_dataframe[0]!.exposure_id = "nao-existe";

    expect(() => createScenarioBundle(input)).toThrow("exposição inexistente");
  });

  it("impede dimensionamento canônico que referencie alternativa inexistente", () => {
    const input = validBundleInput();
    input.dataframes.hedge_sizing_dataframe[0]!.alternative_id = "alternativa-ausente";
    expect(() => createScenarioBundle(input)).toThrow("alternativa inexistente");
  });

  it("aceita Instrument Master OTC somente com evidência contratual SHA-256 e preserva o vínculo do hedge", () => {
    const input = validBundleInput();
    input.dataframes.instrument_master_dataframe = [{
      instrument_id: "NDF-CLIENTE-001",
      kind: "OTC_NDF",
      base_currency: "USD",
      quote_currency: "BRL",
      notional_base_currency: 50_000,
      trade_date: "2026-08-13",
      maturity: "2026-09-14",
      settlement_convention: "Liquidação financeira D+1 conforme contrato",
      terms: { fixing_date: "2026-09-12", forward_rate_brl_per_usd: 5.2 },
      source: "USER_CONTRACT",
      evidence_source_file: "ndf-cliente.pdf",
      evidence_source_url: "https://storage.example.test/contracts/ndf-cliente.pdf",
      evidence_sha256: "a".repeat(64),
      evidence_captured_at_utc: "2026-08-17T18:00:00.000Z",
      validation_status: "validated_user_contract",
    }];
    input.dataframes.hedge_dataframe[0]!.instrument_id = "NDF-CLIENTE-001";

    const bundle = createScenarioBundle(input);
    const restored = importScenarioBundle(JSON.stringify(bundle));
    expect(restored.dataframes.instrument_master_dataframe[0]).toMatchObject({ source: "USER_CONTRACT", instrument_id: "NDF-CLIENTE-001" });
  });

  it("serializa DataFrame em CSV com escape de texto", () => {
    expect(dataframeToCsv([{ descricao: "Hedge, USD", nota: 'A "B"' }])).toBe(
      'descricao,nota\n"Hedge, USD","A ""B"""',
    );
  });
});
