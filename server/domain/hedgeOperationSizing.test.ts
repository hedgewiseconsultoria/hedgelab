import { describe, expect, it } from "vitest";
import { calculateHedgeOperationSizing } from "./hedgeOperationSizing";
import type { CanonicalEconomicSituationRow, CanonicalHedgeAlternativeRow } from "./dataframes";

const situation = (overrides: Partial<CanonicalEconomicSituationRow> = {}): CanonicalEconomicSituationRow => ({
  economic_situation_id: "sit-1", exposure_id: "exp-1", situation_kind: "USD_RECEIVABLE", description: "Receita de exportação", declared_quantity: 150_000, declared_currency: "USD", horizon_date: "2026-10-08", commodity_reference: null, indexer: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-25T00:00:00Z", ...overrides,
});
const alternative = (kind: CanonicalHedgeAlternativeRow["alternative_kind"]): CanonicalHedgeAlternativeRow => ({ alternative_id: `alt-${kind}`, exposure_id: "exp-1", economic_situation_id: "sit-1", risk_factor_id: "risk-1", alternative_kind: kind, label: kind, risk_factor: "USD_BRL", hedge_direction: "SELL", eligibility_status: "eligible_with_market_data", required_data: [], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "hedge-alternatives-v1", origin: "CATALOG_DERIVED",
});
const observation = (overrides: Record<string, unknown> = {}) => ({ symbol: "WDOV26", instrumentId: "WDOV26-ID", instrumentType: "FUTURE" as const, maturity: "2026-10-01", optionType: null, exercisePrice: null, lastPrice: null, tradeAveragePrice: null, adjustedQuote: 5.2, adjustedQuoteTax: null, sourceHashSha256: "a".repeat(64), ...overrides });

describe("calculateHedgeOperationSizing", () => {
  it("arredonda contratos para cima e calcula a margem individual B3", () => {
    const result = calculateHedgeOperationSizing({ situation: situation(), alternative: alternative("B3_WDO_FUTURE"), coveragePct: 100, observation: observation(), marginTheoreticalMax: 125.5, marginSimulatorResult: 1_882.5 });
    expect(result.contracts).toBe(15);
    expect(result.hedgedQuantity).toBe(150_000);
    expect(result.marginEstimate).toBe(1882.5);
    expect(result.status).toBe("effective");
  });

  it("dimensiona proteção DI1 por DV01 com taxa e dias úteis da observação B3", () => {
    const result = calculateHedgeOperationSizing({ situation: situation({ declared_quantity: 10_000_000, declared_currency: "BRL", horizon_date: "2026-10-15", situation_kind: "CDI_LIABILITY" as CanonicalEconomicSituationRow["situation_kind"] }), alternative: alternative("B3_DI1_FUTURE"), coveragePct: 100, observation: observation({ symbol: "DI1V26", instrumentType: "FUTURE", maturity: "2026-10-01", tradeDate: "2026-08-25", adjustedQuote: 98_000, adjustedQuoteTax: 14.5 }) });
    expect(result.status).toBe("effective");
    expect(result.contracts).toBeGreaterThan(0);
    expect(result.minimumContracts).toBe(1);
    expect(result.notes.join(" ")).toMatch(/DV01 do contrato/i);
    expect(result.blockingReason).toBeNull();
  });

  it("respeita o lote mínimo de 5 contratos para DOL mesmo em exposição menor", () => {
    const result = calculateHedgeOperationSizing({ situation: situation({ declared_quantity: 50_000 }), alternative: alternative("B3_DOL_FUTURE"), coveragePct: 100, observation: observation({ symbol: "DOLV26" }), marginTheoreticalMax: 5_000 });
    expect(result.rawContracts).toBe(1);
    expect(result.contracts).toBe(5);
    expect(result.hedgedQuantity).toBe(250_000);
    expect(result.minimumContracts).toBe(5);
  });

  it("usa o total informado pelo simulador B3 para a margem da carteira", () => {
    const result = calculateHedgeOperationSizing({ situation: situation(), alternative: alternative("B3_WDO_FUTURE"), coveragePct: 100, observation: observation(), marginTheoreticalMax: 125.5, marginSimulatorResult: 1_234.56 });
    expect(result.marginEstimate).toBe(1_234.56);
    expect(result.marginPerContract).toBeCloseTo(82.304, 6);
    expect(result.marginStatus).toBe("official_simulator_result");
  });

  it("converte corretamente o prêmio DOL cotado por USD 1.000 para custo total", () => {
    const result = calculateHedgeOperationSizing({ situation: situation({ declared_quantity: 1_500_000, situation_kind: "USD_PAYABLE" }), alternative: alternative("B3_DOL_OPTION"), coveragePct: 100, observation: observation({ symbol: "DOLV26C005350", instrumentType: "OPTION", optionType: "CALL", exercisePrice: 5_35, adjustedQuote: 28.38 }), marginTheoreticalMax: 783.99 });
    expect(result.contracts).toBe(30);
    expect(result.premiumValue).toBeCloseTo(42_570, 6);
    expect(result.premiumValue).not.toBe(42_570_000);
  });

  it("calcula custo total do prêmio de opção sem substituir ausência por preço didático", () => {
    const result = calculateHedgeOperationSizing({ situation: situation({ commodity_reference: "CCM", situation_kind: "COMMODITY_SALE", declared_quantity: 1_000, declared_currency: "BRL" }), alternative: alternative("B3_COMMODITY_OPTION"), coveragePct: 100, observation: observation({ symbol: "CCMX26P006800", instrumentType: "OPTION", optionType: "PUT", exercisePrice: 680, adjustedQuote: 0.05 }), marginTheoreticalMax: 0.05 });
    expect(result.contracts).toBe(3);
    expect(result.premiumValue).toBeGreaterThan(0);
    expect(result.strike).toBe(680);
    expect(result.optionType).toBe("PUT");
  });

  it("mantém NDF parametrizado e declara que termos bilaterais são necessários", () => {
    const result = calculateHedgeOperationSizing({ situation: situation(), alternative: alternative("OTC_NDF_OR_TERM"), coveragePct: 100 });
    expect(result.status).toBe("parameterized");
    expect(result.contracts).toBeNull();
    expect(result.marginStatus).toBe("not_applicable_otc");
    expect(result.blockingReason).toMatch(/termos do contrato bilateral/i);
  });
});
