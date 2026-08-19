import { describe, expect, it } from "vitest";
import { B3_COMMODITY_FUTURE_SPECS, B3_COMMODITY_OPTION_SPECS, B3_DI1_FUTURE_SPEC, B3_DI1_OPTION_SPEC, B3_FX_FUTURE_SPECS, B3_FX_OPTION_SPEC, OFFICIAL_INSTRUMENT_MASTER, createOtcInstrumentMaster } from "./instrumentMaster";

describe("Instrument Master", () => {
  it("mantém as especificações confirmadas de DOL e WDO com fonte hasheada", () => {
    expect(B3_FX_FUTURE_SPECS.DOL.contractSizeUsd).toBe(50_000);
    expect(B3_FX_FUTURE_SPECS.WDO.contractSizeUsd).toBe(10_000);
    expect(B3_FX_FUTURE_SPECS.DOL.evidence.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("materializa opção de dólar e DI1 com os campos técnicos publicados pela B3", () => {
    expect(B3_FX_OPTION_SPEC.exerciseStyle).toBe("EUROPEAN");
    expect(B3_FX_OPTION_SPEC.contractSizeUsd).toBe(50_000);
    expect(B3_DI1_FUTURE_SPEC.notionalAtMaturityBrl).toBe(100_000);
    expect(B3_DI1_FUTURE_SPEC.quotation).toBe("EFFECTIVE_ANNUAL_RATE_COMPOUNDED_DAILY_AA_252");
    expect(B3_DI1_OPTION_SPEC).toMatchObject({ instrumentKey: "DI1_OPTION", kind: "B3_DI_OPTION", underlyingFuture: "DI1", optionToUnderlyingContractRatio: 1, exerciseStyle: "EUROPEAN", standardLotContracts: 5 });
    expect(B3_DI1_OPTION_SPEC.evidence.sourceHashSha256).toBe("81b35c6cd34d281eec1700209fe15248e5258d46493771d770b6ab684fb9933d");
    expect(OFFICIAL_INSTRUMENT_MASTER).toHaveLength(13);
  });

  it("materializa futuros B3 de boi, milho e soja com unidade e hash de ficha oficial", () => {
    expect(B3_COMMODITY_FUTURE_SPECS.BGI).toMatchObject({ contractSize: 330, contractUnit: "ARROBA", quotation: "BRL_PER_ARROBA", settlement: "FINANCIAL" });
    expect(B3_COMMODITY_FUTURE_SPECS.CCM).toMatchObject({ contractSize: 450, contractUnit: "SACA_60KG", quotation: "BRL_PER_SACA_60KG" });
    expect(B3_COMMODITY_FUTURE_SPECS.SOY).toMatchObject({ contractSize: 34, contractUnit: "METRIC_TON", quotation: "USD_PER_METRIC_TON" });
    expect(B3_COMMODITY_FUTURE_SPECS.SJC).toMatchObject({ contractSize: 450, contractUnit: "SACA_60KG", quotation: "USD_PER_SACA_60KG" });
    for (const specification of Object.values(B3_COMMODITY_FUTURE_SPECS)) expect(specification.evidence.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("materializa opções de commodity com ficha específica, unidade do objeto e hash", () => {
    expect(B3_COMMODITY_OPTION_SPECS.BGI).toMatchObject({ contractSize: 330, contractUnit: "ARROBA", premiumQuotation: "BRL_PER_ARROBA", exerciseStyle: "AMERICAN" });
    expect(B3_COMMODITY_OPTION_SPECS.CCM).toMatchObject({ contractSize: 450, contractUnit: "SACA_60KG", premiumQuotation: "BRL_PER_SACA_60KG" });
    expect(B3_COMMODITY_OPTION_SPECS.SOY).toMatchObject({ contractSize: 34, contractUnit: "METRIC_TON", premiumQuotation: "USD_PER_METRIC_TON" });
    expect(B3_COMMODITY_OPTION_SPECS.SJC).toMatchObject({ contractSize: 450, contractUnit: "SACA_60KG", premiumQuotation: "USD_PER_SACA_60KG" });
    for (const specification of Object.values(B3_COMMODITY_OPTION_SPECS)) expect(specification.evidence.sourceHashSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("bloqueia NDF sem evidência contratual hasheada", () => {
    expect(() => createOtcInstrumentMaster({
      instrumentId: "NDF-001", kind: "OTC_NDF", baseCurrency: "USD", quoteCurrency: "BRL", notionalBaseCurrency: 100_000,
      tradeDate: "2026-08-13", maturityDate: "2026-09-14", settlementConvention: "financeira",
      terms: { forwardRateBrlPerUsd: 5.2, fixingDate: "2026-09-12", settlementDate: "2026-09-14" },
      evidence: { sourceId: "USER_CONTRACT", sourceUrl: null, sourceFile: "", sourceHashSha256: null, capturedAtUtc: "2026-08-13T12:00:00.000Z" },
    })).toThrow("arquivo de evidência");
  });

  it("aceita um master OTC somente com termos essenciais e contrato rastreável", () => {
    const instrument = createOtcInstrumentMaster({
      instrumentId: "NDF-001", kind: "OTC_NDF", baseCurrency: "USD", quoteCurrency: "BRL", notionalBaseCurrency: 100_000,
      tradeDate: "2026-08-13", maturityDate: "2026-09-14", settlementConvention: "financeira D+1",
      terms: { forwardRateBrlPerUsd: 5.2, fixingDate: "2026-09-12", settlementDate: "2026-09-14" },
      evidence: { sourceId: "USER_CONTRACT", sourceUrl: null, sourceFile: "contrato-ndf.pdf", sourceHashSha256: "a".repeat(64), capturedAtUtc: "2026-08-13T12:00:00.000Z" },
    });
    expect(instrument.validationStatus).toBe("validated_user_contract");
  });

  it("aceita swap de taxa somente com as duas pernas, calendário e contrato hasheado declarados", () => {
    const instrument = createOtcInstrumentMaster({
      instrumentId: "SWAP-CDI-001", kind: "OTC_RATE_SWAP", baseCurrency: "BRL", quoteCurrency: "BRL", notionalBaseCurrency: 5_000_000,
      tradeDate: "2026-08-13", maturityDate: "2027-08-13", settlementConvention: "Liquidação financeira conforme contrato",
      terms: { payerLeg: "PAY_FIXED_RECEIVE_FLOATING", floatingLegIndex: "CDI", fixedLegConvention: "Taxa fixa e base conforme contrato", paymentSchedule: "Pagamentos mensais conforme contrato", startDate: "2026-08-14", endDate: "2027-08-13" },
      evidence: { sourceId: "USER_CONTRACT", sourceUrl: null, sourceFile: "swap-cdi.pdf", sourceHashSha256: "b".repeat(64), capturedAtUtc: "2026-08-13T12:00:00.000Z" },
    });
    expect(instrument).toMatchObject({ kind: "OTC_RATE_SWAP", validationStatus: "validated_user_contract", pricingEligibility: "contract_terms_and_market_inputs_required" });
  });

  it("bloqueia swap de taxa sem convenção explícita da perna fixa", () => {
    expect(() => createOtcInstrumentMaster({
      instrumentId: "SWAP-CDI-002", kind: "OTC_RATE_SWAP", baseCurrency: "BRL", quoteCurrency: "BRL", notionalBaseCurrency: 5_000_000,
      tradeDate: "2026-08-13", maturityDate: "2027-08-13", settlementConvention: "financeira",
      terms: { payerLeg: "PAY_FIXED_RECEIVE_FLOATING", floatingLegIndex: "CDI", fixedLegConvention: "", paymentSchedule: "mensal", startDate: "2026-08-14", endDate: "2027-08-13" },
      evidence: { sourceId: "USER_CONTRACT", sourceUrl: null, sourceFile: "swap-cdi.pdf", sourceHashSha256: "b".repeat(64), capturedAtUtc: "2026-08-13T12:00:00.000Z" },
    })).toThrow("convenção da perna fixa");
  });
});
