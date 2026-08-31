import { describe, expect, it } from "vitest";
import { diagnoseHedgeAlternatives, type EconomicExposureKind } from "./hedgeAlternatives";
import { calculateHedgeOperationSizing } from "./hedgeOperationSizing";
import type { CanonicalEconomicSituationRow, CanonicalHedgeAlternativeRow } from "./dataframes";

const situation = (overrides: Partial<CanonicalEconomicSituationRow> = {}): CanonicalEconomicSituationRow => ({
  economic_situation_id: "sit-coverage", exposure_id: "exp-coverage", situation_kind: "USD_PAYABLE", description: "Exposição de teste", declared_quantity: 150_000, declared_currency: "USD", horizon_date: "2026-10-15", commodity_reference: null, indexer: null, interestSpreadPctAa: null, origin: "USER_DECLARED", captured_at_utc: "2026-08-25T00:00:00Z", ...overrides,
});

const alternative = (kind: CanonicalHedgeAlternativeRow["alternative_kind"]): CanonicalHedgeAlternativeRow => ({
  alternative_id: `alt-${kind}`, exposure_id: "exp-coverage", economic_situation_id: "sit-coverage", risk_factor_id: "risk-coverage", alternative_kind: kind, label: kind, risk_factor: kind.includes("DI") ? "CDI_RATE" : "USD_BRL", hedge_direction: "SELL", eligibility_status: "eligible_with_market_data", required_data: [], blocking_reason: null, source_ids: ["B3_PUBLIC_FILES"], method_version: "coverage-test-v1", origin: "CATALOG_DERIVED",
});

const observation = (overrides: Record<string, unknown> = {}) => ({ symbol: "WDOV26", instrumentId: "WDOV26-ID", instrumentType: "FUTURE" as const, maturity: "2026-10-01", tradeDate: "2026-08-25", optionType: null, exercisePrice: null, lastPrice: null, tradeAveragePrice: null, adjustedQuote: 5.2, adjustedQuoteTax: null, sourceHashSha256: "a".repeat(64), ...overrides });

describe("cobertura de todos os tipos de exposição", () => {
  const exposureCases: Array<{ kind: EconomicExposureKind; currency: "USD" | "BRL"; extra?: Record<string, unknown> }> = [
    { kind: "USD_PAYABLE", currency: "USD" },
    { kind: "USD_RECEIVABLE", currency: "USD" },
    { kind: "CDI_LINKED_DEBT", currency: "BRL", extra: { indexer: "CDI" } },
    { kind: "COMMODITY_PURCHASE", currency: "BRL", extra: { commodityReference: "CCM" } },
    { kind: "COMMODITY_SALE", currency: "BRL", extra: { commodityReference: "BGI" } },
  ];

  it.each(exposureCases)("diagnostica $kind e devolve alternativas", ({ kind, currency, extra }) => {
    const result = diagnoseHedgeAlternatives({ exposureId: `exp-${kind}`, kind, description: "Caso de cobertura", notional: 1_000_000, currency, maturityDate: "2026-10-15", ...(extra ?? {}) } as never);
    expect(result.exposure.kind).toBe(kind);
    expect(result.alternatives.length).toBeGreaterThan(0);
    expect(result.diagnosis.riskFactor).toBeTruthy();
  });

  it("dimensiona todas as famílias listadas com dados compatíveis", () => {
    const cases: Array<{ kind: CanonicalHedgeAlternativeRow["alternative_kind"]; situation: CanonicalEconomicSituationRow; observation: Record<string, unknown> }> = [
      { kind: "B3_DOL_FUTURE", situation: situation(), observation: observation({ symbol: "DOLV26", adjustedQuote: 5.2 }) },
      { kind: "B3_WDO_FUTURE", situation: situation(), observation: observation({ symbol: "WDOV26", adjustedQuote: 5.2 }) },
      { kind: "B3_DOL_OPTION", situation: situation({ situation_kind: "USD_PAYABLE", declared_quantity: 1_500_000 }), observation: observation({ symbol: "DOLV26C005350", instrumentType: "OPTION", optionType: "CALL", exercisePrice: 5.35, adjustedQuote: 28.38 }) },
      { kind: "B3_DI1_FUTURE", situation: situation({ situation_kind: "CDI_LINKED_DEBT", declared_currency: "BRL", declared_quantity: 10_000_000, horizon_date: "2026-10-15", indexer: "CDI" }), observation: observation({ symbol: "DI1V26", adjustedQuote: 98_000, adjustedQuoteTax: 14.5, maturity: "2026-10-01" }) },
      { kind: "B3_COMMODITY_FUTURE", situation: situation({ situation_kind: "COMMODITY_SALE", declared_currency: "BRL", declared_quantity: 1_000, commodity_reference: "CCM" }), observation: observation({ symbol: "CCMX26", adjustedQuote: 70 }) },
      { kind: "B3_COMMODITY_OPTION", situation: situation({ situation_kind: "COMMODITY_SALE", declared_currency: "BRL", declared_quantity: 1_000, commodity_reference: "CCM" }), observation: observation({ symbol: "CCMX26P006800", instrumentType: "OPTION", optionType: "PUT", exercisePrice: 680, adjustedQuote: 0.05 }) },
    ];
    for (const testCase of cases) {
      const result = calculateHedgeOperationSizing({ situation: testCase.situation, alternative: alternative(testCase.kind), coveragePct: 100, observation: testCase.observation as never, marginSimulatorResult: 10_000 });
      expect(result.contracts, testCase.kind).toBeGreaterThan(0);
      expect(result.minimumContracts, testCase.kind).toBeGreaterThanOrEqual(1);
      expect(result.blockingReason, testCase.kind).toBeNull();
    }
  });

  it.each(["BGI", "ICF", "CNL", "ETH", "CCM", "GLD", "SOY", "SJC"] as const)("dimensiona o futuro de commodity %s com lote mínimo", (commodity) => {
    const result = calculateHedgeOperationSizing({ situation: situation({ situation_kind: "COMMODITY_SALE", declared_currency: "BRL", declared_quantity: 1_000, commodity_reference: commodity }), alternative: alternative("B3_COMMODITY_FUTURE"), coveragePct: 100, observation: observation({ symbol: `${commodity}X26`, adjustedQuote: 100 }) });
    expect(result.contracts, commodity).toBeGreaterThanOrEqual(1);
    expect(result.minimumContracts, commodity).toBe(1);
    expect(result.blockingReason, commodity).toBeNull();
  });

  it.each(["BGI", "CCM", "SOY", "SJC"] as const)("dimensiona a opção de commodity %s com lote mínimo", (commodity) => {
    const result = calculateHedgeOperationSizing({ situation: situation({ situation_kind: "COMMODITY_SALE", declared_currency: "BRL", declared_quantity: 1_000, commodity_reference: commodity }), alternative: alternative("B3_COMMODITY_OPTION"), coveragePct: 100, observation: observation({ symbol: `${commodity}X26P000100`, instrumentType: "OPTION", optionType: "PUT", exercisePrice: 100, adjustedQuote: 1 }) });
    expect(result.contracts, commodity).toBeGreaterThanOrEqual(1);
    expect(result.minimumContracts, commodity).toBe(1);
    expect(result.blockingReason, commodity).toBeNull();
  });

  it.each(["OTC_NDF_OR_TERM", "OTC_FX_SWAP", "OTC_RATE_SWAP"] as const)("mantém %s parametrizado sem inventar margem", (kind) => {
    const result = calculateHedgeOperationSizing({ situation: situation(), alternative: alternative(kind), coveragePct: 100 });
    expect(result.status).toBe("parameterized");
    expect(result.contracts).toBeNull();
    expect(result.marginStatus).toBe("not_applicable_otc");
  });
});


describe("bloqueios de segurança", () => {
  it("bloqueia DI1 sem taxa, data-base ou vencimento compatíveis", () => {
    const result = calculateHedgeOperationSizing({ situation: situation({ situation_kind: "CDI_LINKED_DEBT", declared_currency: "BRL", indexer: "CDI" }), alternative: alternative("B3_DI1_FUTURE"), coveragePct: 100, observation: observation({ symbol: "DI1V26", adjustedQuoteTax: null, tradeDate: undefined }) as never });
    expect(result.status).toBe("blocked");
    expect(result.contracts).toBeNull();
    expect(result.blockingReason).toMatch(/DV01/i);
  });
});


