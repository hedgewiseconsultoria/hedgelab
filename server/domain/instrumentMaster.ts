export type HedgeInstrumentKind = "B3_FX_FUTURE" | "B3_FX_OPTION" | "B3_DI_FUTURE" | "B3_DI_OPTION" | "B3_COMMODITY_FUTURE" | "OTC_NDF" | "OTC_FX_SWAP" | "OTC_RATE_SWAP";
export type InstrumentValidationStatus = "official_specification_loaded" | "user_contract_required" | "validated_user_contract";

export type SourceEvidence = {
  sourceId: "B3_PRODUCT_SPECIFICATION" | "USER_CONTRACT";
  sourceUrl: string | null;
  sourceFile: string;
  sourceHashSha256: string | null;
  capturedAtUtc: string;
};

export type FxFutureSpecification = {
  instrumentKey: "DOL" | "WDO";
  kind: "B3_FX_FUTURE";
  description: string;
  contractSizeUsd: number;
  quotation: "BRL_PER_USD_1000";
  minimumTickBrlPerUsd1000: number;
  standardLotContracts: number;
  maturityRule: "FIRST_BUSINESS_DAY_OF_CONTRACT_MONTH";
  settlement: "FINANCIAL";
  businessCalendarId: "B3_TRADING_2026";
  validationStatus: "official_specification_loaded";
  evidence: SourceEvidence;
};

export type FxOptionSpecification = {
  instrumentKey: "DOL_OPTION";
  kind: "B3_FX_OPTION";
  description: string;
  tradingCode: "DOL";
  exerciseStyle: "EUROPEAN";
  contractSizeUsd: number;
  premiumQuotation: "BRL_PER_USD_1000_THREE_DECIMALS";
  minimumTickBrlPerUsd1000: number;
  standardLotContracts: number;
  maturityRule: "FIRST_BUSINESS_DAY_OF_CONTRACT_MONTH";
  exerciseRule: "AUTOMATIC_CONDITIONAL_EXERCISE";
  businessCalendarId: "B3_TRADING_2026";
  validationStatus: "official_specification_loaded";
  evidence: SourceEvidence;
};

export type DiFutureSpecification = {
  instrumentKey: "DI1";
  kind: "B3_DI_FUTURE";
  description: string;
  tradingCode: "DI1";
  underlying: "B3_PUBLISHED_DAILY_DI_RATE";
  notionalAtMaturityBrl: number;
  quotation: "EFFECTIVE_ANNUAL_RATE_COMPOUNDED_DAILY_AA_252";
  tickRule: "0.001_RATE_POINT_UP_TO_3_MONTHS__0.005_OVER_3_MONTHS";
  standardLotContracts: number;
  maturityRule: "FIRST_TRADING_SESSION_OF_CONTRACT_MONTH";
  settlement: "CASH";
  businessCalendarId: "B3_TRADING_2026";
  validationStatus: "official_specification_loaded";
  evidence: SourceEvidence;
};

export type DiOptionSpecification = {
  instrumentKey: "DI1_OPTION";
  kind: "B3_DI_OPTION";
  description: string;
  tradingCodes: readonly ["D11", "D12", "D13", "D14", "D15", "D16", "D17", "D18", "D19"];
  underlyingFuture: "DI1";
  optionToUnderlyingContractRatio: 1;
  exerciseStyle: "EUROPEAN";
  premiumQuotation: "BRL_TWO_DECIMALS";
  minimumTickBrl: number;
  standardLotContracts: number;
  maturityRule: "FIRST_TRADING_SESSION_OF_OPTION_MONTH";
  settlement: "PHYSICAL_DI1_FUTURE_POSITION";
  validationStatus: "official_specification_loaded";
  evidence: SourceEvidence;
};

export type CommodityFutureSpecification = {
  instrumentKey: "BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC";
  kind: "B3_COMMODITY_FUTURE";
  description: string;
  tradingCode: "BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC";
  contractSize: number;
  contractUnit: "ARROBA" | "SACA_60KG" | "METRIC_TON" | "CUBIC_METER" | "TROY_OUNCE";
  quotation: "BRL_PER_ARROBA" | "BRL_PER_SACA_60KG" | "USD_PER_SACA_60KG" | "USD_PER_METRIC_TON" | "BRL_PER_CUBIC_METER" | "USD_PER_TROY_OUNCE";
  minimumTick: number;
  standardLotContracts: number;
  maturityRule: string;
  settlement: "FINANCIAL" | "PHYSICAL";
  validationStatus: "official_specification_loaded";
  evidence: SourceEvidence;
};

export type CommodityOptionSpecification = {
  instrumentKey: "BGI_OPTION" | "CCM_OPTION" | "SOY_OPTION" | "SJC_OPTION";
  kind: "B3_COMMODITY_OPTION";
  underlyingFuture: "BGI" | "CCM" | "SOY" | "SJC";
  description: string;
  contractSize: number;
  contractUnit: "ARROBA" | "SACA_60KG" | "METRIC_TON";
  premiumQuotation: "BRL_PER_ARROBA" | "BRL_PER_SACA_60KG" | "USD_PER_METRIC_TON" | "USD_PER_SACA_60KG";
  exerciseStyle: "AMERICAN";
  standardLotContracts: 1;
  exerciseRule: "AUTOMATIC_CONDITIONAL_EXERCISE";
  validationStatus: "official_specification_loaded";
  evidence: SourceEvidence;
};

export const B3_FX_FUTURE_SPECS: Record<"DOL" | "WDO", FxFutureSpecification> = {
  DOL: { instrumentKey: "DOL", kind: "B3_FX_FUTURE", description: "Futuro de Taxa de Câmbio de Reais por Dólar Comercial", contractSizeUsd: 50_000, quotation: "BRL_PER_USD_1000", minimumTickBrlPerUsd1000: 0.5, standardLotContracts: 5, maturityRule: "FIRST_BUSINESS_DAY_OF_CONTRACT_MONTH", settlement: "FINANCIAL", businessCalendarId: "B3_TRADING_2026", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm", sourceFile: "dol_futuro_especificacao.html", sourceHashSha256: "f02d3bb764bf08e6cfbc4a53290c264c434e76a5d5c77d77f26cd547e89c1725", capturedAtUtc: "2026-08-17T20:16:00.000Z" } },
  WDO: { instrumentKey: "WDO", kind: "B3_FX_FUTURE", description: "Futuro Mini de Taxa de Câmbio de Reais por Dólar Comercial", contractSizeUsd: 10_000, quotation: "BRL_PER_USD_1000", minimumTickBrlPerUsd1000: 0.5, standardLotContracts: 1, maturityRule: "FIRST_BUSINESS_DAY_OF_CONTRACT_MONTH", settlement: "FINANCIAL", businessCalendarId: "B3_TRADING_2026", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/futuro-mini-de-taxa-de-cambio-de-reais-por-dolar-comercial.htm", sourceFile: "wdo_futuro_especificacao.html", sourceHashSha256: "bce59bd1f5091f725a5afdf5a5823d326dc4d439d13a76ec405e0750efa648ff", capturedAtUtc: "2026-08-17T20:16:00.000Z" } },
};

export const B3_FX_OPTION_SPEC: FxOptionSpecification = {
  instrumentKey: "DOL_OPTION", kind: "B3_FX_OPTION", description: "Opções sobre Taxa de Câmbio de Reais por Dólar Comercial", tradingCode: "DOL", exerciseStyle: "EUROPEAN", contractSizeUsd: 50_000, premiumQuotation: "BRL_PER_USD_1000_THREE_DECIMALS", minimumTickBrlPerUsd1000: 0.001, standardLotContracts: 5, maturityRule: "FIRST_BUSINESS_DAY_OF_CONTRACT_MONTH", exerciseRule: "AUTOMATIC_CONDITIONAL_EXERCISE", businessCalendarId: "B3_TRADING_2026", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/moedas/opcoes-sobre-taxa-de-cambio-de-reais-por-dolar-comercial.htm", sourceFile: "opcao_dolar_especificacao.html", sourceHashSha256: "da607cbfa32d61d815cf7fd379810baf37bfef9df76741f9467313cc7c32b111", capturedAtUtc: "2026-08-17T20:20:00.000Z" },
};

export const B3_DI1_FUTURE_SPEC: DiFutureSpecification = {
  instrumentKey: "DI1", kind: "B3_DI_FUTURE", description: "Futuro de Depósito Interfinanceiro de Um Dia", tradingCode: "DI1", underlying: "B3_PUBLISHED_DAILY_DI_RATE", notionalAtMaturityBrl: 100_000, quotation: "EFFECTIVE_ANNUAL_RATE_COMPOUNDED_DAILY_AA_252", tickRule: "0.001_RATE_POINT_UP_TO_3_MONTHS__0.005_OVER_3_MONTHS", standardLotContracts: 1, maturityRule: "FIRST_TRADING_SESSION_OF_CONTRACT_MONTH", settlement: "CASH", businessCalendarId: "B3_TRADING_2026", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/en_us/products-and-services/trading/interest-rates/one-day-interbank-deposit-futures.htm", sourceFile: "di1_futuro_especificacao.html", sourceHashSha256: "603578db1996f865109cff0a5f9a4e7cc3c84f15a926a4b9bda757566b399ba2", capturedAtUtc: "2026-08-17T20:20:00.000Z" },
};

/** Ficha B3 capturada em 18/08/2026; não habilita PU, taxa, prêmio, MTM, DV01, volatilidade ou Greeks. */
export const B3_DI1_OPTION_SPEC: DiOptionSpecification = {
  instrumentKey: "DI1_OPTION", kind: "B3_DI_OPTION", description: "Opções sobre Futuro de Taxa Média de Depósitos Interfinanceiros de Um Dia", tradingCodes: ["D11", "D12", "D13", "D14", "D15", "D16", "D17", "D18", "D19"], underlyingFuture: "DI1", optionToUnderlyingContractRatio: 1, exerciseStyle: "EUROPEAN", premiumQuotation: "BRL_TWO_DECIMALS", minimumTickBrl: 0.01, standardLotContracts: 5, maturityRule: "FIRST_TRADING_SESSION_OF_OPTION_MONTH", settlement: "PHYSICAL_DI1_FUTURE_POSITION", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/juros/opcoes-sobre-futuro-de-di.htm", sourceFile: "di1_opcao_especificacao.html", sourceHashSha256: "81b35c6cd34d281eec1700209fe15248e5258d46493771d770b6ab684fb9933d", capturedAtUtc: "2026-08-18T12:56:00.000Z" },
};

/** Fichas B3 capturadas em 18/08/2026; os dados não habilitam margem, preço ou dimensionamento por si só. */
export const B3_COMMODITY_FUTURE_SPECS: Record<"BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC", CommodityFutureSpecification> = {
  BGI: { instrumentKey: "BGI", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Boi Gordo com Liquidação Financeira", tradingCode: "BGI", contractSize: 330, contractUnit: "ARROBA", quotation: "BRL_PER_ARROBA", minimumTick: 0.05, standardLotContracts: 1, maturityRule: "LAST_TRADING_SESSION_OF_CONTRACT_MONTH", settlement: "FINANCIAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE4755111.htm", sourceFile: "bgi_futuro_especificacao.html", sourceHashSha256: "e365bcaaf714904f23ecb977a26eaa6ca76fb33bdc581c23ab7d65a7ee661999", capturedAtUtc: "2026-08-18T05:08:32.000Z" } },
  ICF: { instrumentKey: "ICF", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Café Arábica Tipo 4/5", tradingCode: "ICF", contractSize: 100, contractUnit: "SACA_60KG", quotation: "USD_PER_SACA_60KG", minimumTick: 0.05, standardLotContracts: 1, maturityRule: "SIXTH_BUSINESS_DAY_BEFORE_LAST_BUSINESS_DAY_OF_CONTRACT_MONTH", settlement: "PHYSICAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE49B513B.htm", sourceFile: "icf_futuro_especificacao.html", sourceHashSha256: "5c20426108acee119e25778b71fad00a9319558f5512d91d850d4959fba4d1ce", capturedAtUtc: "2026-08-22T00:00:00.000Z" } },
  CNL: { instrumentKey: "CNL", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Café Conilon Robusta", tradingCode: "CNL", contractSize: 100, contractUnit: "SACA_60KG", quotation: "BRL_PER_SACA_60KG", minimumTick: 0.01, standardLotContracts: 1, maturityRule: "SIXTH_TRADING_SESSION_BEFORE_LAST_BUSINESS_DAY_OF_CONTRACT_MONTH", settlement: "PHYSICAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE4C25165.htm", sourceFile: "cnl_futuro_especificacao.html", sourceHashSha256: "d504dfc4f980ab08429b4e0322dc1c1e113ead18b4fe215cf1aa4d02493d2efe", capturedAtUtc: "2026-08-22T00:00:00.000Z" } },
  ETH: { instrumentKey: "ETH", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Etanol Hidratado com Liquidação Financeira", tradingCode: "ETH", contractSize: 30, contractUnit: "CUBIC_METER", quotation: "BRL_PER_CUBIC_METER", minimumTick: 0.5, standardLotContracts: 1, maturityRule: "LAST_TRADING_SESSION_OF_CONTRACT_MONTH", settlement: "FINANCIAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CD95C8AFE30196115C01732650.htm", sourceFile: "eth_futuro_especificacao.html", sourceHashSha256: "4f141013e565ae1671dd2293e2cce13c6b5b7b3327a256a98fafaaefbb8326e0", capturedAtUtc: "2026-08-22T00:00:00.000Z" } },
  CCM: { instrumentKey: "CCM", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Milho com Liquidação Financeira", tradingCode: "CCM", contractSize: 450, contractUnit: "SACA_60KG", quotation: "BRL_PER_SACA_60KG", minimumTick: 0.01, standardLotContracts: 1, maturityRule: "DAY_15_OF_CONTRACT_MONTH_OR_NEXT_TRADING_SESSION", settlement: "FINANCIAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490CA6D41D4C7016D45F3CB0A38F0.htm", sourceFile: "ccm_futuro_especificacao.html", sourceHashSha256: "ce71aa7b8f26c2ca73334d9e7090114b38db8a86d663b85962ae01847f3a25ad", capturedAtUtc: "2026-08-18T05:08:32.000Z" } },
  GLD: { instrumentKey: "GLD", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Ouro com Liquidação Financeira", tradingCode: "GLD", contractSize: 1, contractUnit: "TROY_OUNCE", quotation: "USD_PER_TROY_OUNCE", minimumTick: 0.25, standardLotContracts: 1, maturityRule: "THIRD_TO_LAST_BUSINESS_DAY_OF_CONTRACT_MONTH", settlement: "FINANCIAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC982C97FE01982D320A3A5A93.htm", sourceFile: "gld_futuro_especificacao.html", sourceHashSha256: "923b06ce046d7b7d097e08ddf24feb66a516c9bda024278740181898aadb4098", capturedAtUtc: "2026-08-22T00:00:00.000Z" } },
  SOY: { instrumentKey: "SOY", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Soja FOB Santos com Liquidação Financeira (Platts)", tradingCode: "SOY", contractSize: 34, contractUnit: "METRIC_TON", quotation: "USD_PER_METRIC_TON", minimumTick: 0.2, standardLotContracts: 1, maturityRule: "SIXTEENTH_DAY_OF_MONTH_BEFORE_REFERENCE_MONTH_OR_NEXT_TRADING_SESSION", settlement: "FINANCIAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AA8D0CC9DBDCB54019DC0DEE55D520D.htm", sourceFile: "soy_futuro_especificacao.html", sourceHashSha256: "c3add86aadf8a22cadd501228abc31e89d334ed73bc72038fe81ddce02f98115", capturedAtUtc: "2026-08-18T05:08:32.000Z" } },
  SJC: { instrumentKey: "SJC", kind: "B3_COMMODITY_FUTURE", description: "Futuro de Soja com Liquidação Financeira Referenciado no Mini de Soja CME", tradingCode: "SJC", contractSize: 450, contractUnit: "SACA_60KG", quotation: "USD_PER_SACA_60KG", minimumTick: 0.01, standardLotContracts: 1, maturityRule: "SECOND_BUSINESS_DAY_BEFORE_CONTRACT_MONTH", settlement: "FINANCIAL", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C96D41D3A2016D45F4569B14F0.htm", sourceFile: "sjc_futuro_especificacao.html", sourceHashSha256: "fb45eaf85485547fb6f811e8c1a86fae83f81587adb026b7d2a741f808698a0d", capturedAtUtc: "2026-08-18T05:08:32.000Z" } },
};

export const B3_COMMODITY_OPTION_SPECS: Record<"BGI" | "CCM" | "SOY" | "SJC", CommodityOptionSpecification> = {
  BGI: { instrumentKey: "BGI_OPTION", kind: "B3_COMMODITY_OPTION", underlyingFuture: "BGI", description: "Opção sobre Futuro de Boi Gordo com Liquidação Financeira", contractSize: 330, contractUnit: "ARROBA", premiumQuotation: "BRL_PER_ARROBA", exerciseStyle: "AMERICAN", standardLotContracts: 1, exerciseRule: "AUTOMATIC_CONDITIONAL_EXERCISE", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C89DAACE31019DC0ECE33903BF.htm", sourceFile: "bgi_opcao_especificacao.html", sourceHashSha256: "76ca02fd7e891be44a82a1c335e3ba660629151383b42b53282b45b8bbf040f8", capturedAtUtc: "2026-08-18T05:50:00.000Z" } },
  CCM: { instrumentKey: "CCM_OPTION", kind: "B3_COMMODITY_OPTION", underlyingFuture: "CCM", description: "Opção sobre Futuro de Milho com Liquidação Financeira", contractSize: 450, contractUnit: "SACA_60KG", premiumQuotation: "BRL_PER_SACA_60KG", exerciseStyle: "AMERICAN", standardLotContracts: 1, exerciseRule: "AUTOMATIC_CONDITIONAL_EXERCISE", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C89DAACE31019DC0ECE703055B.htm", sourceFile: "ccm_opcao_especificacao.html", sourceHashSha256: "513e72e4dc11b21b9f2a9300c72616941e9cbf4e864e292646c03e2dbc5b29d7", capturedAtUtc: "2026-08-18T05:50:00.000Z" } },
  SOY: { instrumentKey: "SOY_OPTION", kind: "B3_COMMODITY_OPTION", underlyingFuture: "SOY", description: "Opção sobre Futuro de Soja FOB Santos com Liquidação Financeira", contractSize: 34, contractUnit: "METRIC_TON", premiumQuotation: "USD_PER_METRIC_TON", exerciseStyle: "AMERICAN", standardLotContracts: 1, exerciseRule: "AUTOMATIC_CONDITIONAL_EXERCISE", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C89DAACE31019DC0ECE7FE05C2.htm", sourceFile: "soy_opcao_especificacao.html", sourceHashSha256: "f9d50c2e0cb249a8c5310010c0fbc0033b5c39598b14a281c2ba29d10920908a", capturedAtUtc: "2026-08-18T05:50:00.000Z" } },
  SJC: { instrumentKey: "SJC_OPTION", kind: "B3_COMMODITY_OPTION", underlyingFuture: "SJC", description: "Opção sobre Futuro de Soja CME Group", contractSize: 450, contractUnit: "SACA_60KG", premiumQuotation: "USD_PER_SACA_60KG", exerciseStyle: "AMERICAN", standardLotContracts: 1, exerciseRule: "AUTOMATIC_CONDITIONAL_EXERCISE", validationStatus: "official_specification_loaded", evidence: { sourceId: "B3_PRODUCT_SPECIFICATION", sourceUrl: "https://www.b3.com.br/pt_br/produtos-e-servicos/negociacao/commodities/ficha-do-produto-8AE490C96D41D3A2016D45F70AF92752.htm", sourceFile: "sjc_opcao_especificacao.html", sourceHashSha256: "8cdf304333d379abbb1b19c127cf851d68a41d1299d32f1b8089daec39d6d792", capturedAtUtc: "2026-08-18T05:50:00.000Z" } },
};

export const OFFICIAL_INSTRUMENT_MASTER = [B3_FX_FUTURE_SPECS.DOL, B3_FX_FUTURE_SPECS.WDO, B3_FX_OPTION_SPEC, B3_DI1_FUTURE_SPEC, B3_DI1_OPTION_SPEC, B3_COMMODITY_FUTURE_SPECS.BGI, B3_COMMODITY_FUTURE_SPECS.ICF, B3_COMMODITY_FUTURE_SPECS.CNL, B3_COMMODITY_FUTURE_SPECS.ETH, B3_COMMODITY_FUTURE_SPECS.CCM, B3_COMMODITY_FUTURE_SPECS.GLD, B3_COMMODITY_FUTURE_SPECS.SOY, B3_COMMODITY_FUTURE_SPECS.SJC, B3_COMMODITY_OPTION_SPECS.BGI, B3_COMMODITY_OPTION_SPECS.CCM, B3_COMMODITY_OPTION_SPECS.SOY, B3_COMMODITY_OPTION_SPECS.SJC] as const;

type OtcInstrumentBase = {
  instrumentId: string;
  baseCurrency: string;
  quoteCurrency: string;
  notionalBaseCurrency: number;
  tradeDate: string;
  maturityDate: string;
  settlementConvention: string;
  evidence: SourceEvidence;
};

export type OtcInstrumentDraft =
  | (OtcInstrumentBase & { kind: "OTC_NDF"; terms: { forwardRateBrlPerUsd: number; fixingDate: string; settlementDate: string } })
  | (OtcInstrumentBase & { kind: "OTC_FX_SWAP"; terms: { domesticLegIndex: string; foreignLegIndex: string; startDate: string; endDate: string } })
  | (OtcInstrumentBase & { kind: "OTC_RATE_SWAP"; terms: { payerLeg: "PAY_FIXED_RECEIVE_FLOATING" | "RECEIVE_FIXED_PAY_FLOATING"; floatingLegIndex: string; fixedLegConvention: string; paymentSchedule: string; startDate: string; endDate: string } });

export type OtcInstrumentMaster = OtcInstrumentDraft & { validationStatus: "validated_user_contract"; pricingEligibility: "contract_terms_and_market_inputs_required" };

/** NDFs e swaps são bilaterais: nenhum termo é completado por presunção. */
export function createOtcInstrumentMaster(draft: OtcInstrumentDraft): OtcInstrumentMaster {
  if (!draft.instrumentId.trim()) throw new Error("O identificador do instrumento OTC é obrigatório.");
  if (!/^[A-Z]{3}$/.test(draft.baseCurrency) || !/^[A-Z]{3}$/.test(draft.quoteCurrency)) throw new Error("As moedas do contrato OTC devem usar ISO 4217 com três letras.");
  if (!Number.isFinite(draft.notionalBaseCurrency) || draft.notionalBaseCurrency <= 0) throw new Error("O nocional do contrato OTC deve ser positivo e finito.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.tradeDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.maturityDate) || draft.maturityDate <= draft.tradeDate) throw new Error("As datas do contrato OTC devem ser AAAA-MM-DD e o vencimento deve ser posterior à contratação.");
  if (draft.evidence.sourceId !== "USER_CONTRACT" || !draft.evidence.sourceFile || !draft.evidence.sourceHashSha256) throw new Error("O contrato OTC exige arquivo de evidência e hash SHA-256 fornecidos pelo usuário.");
  if (draft.kind === "OTC_NDF") {
    if (!Number.isFinite(draft.terms.forwardRateBrlPerUsd) || draft.terms.forwardRateBrlPerUsd <= 0) throw new Error("O NDF exige taxa a termo positiva declarada no contrato.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.terms.fixingDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.terms.settlementDate)) throw new Error("O NDF exige datas de fixing e liquidação em AAAA-MM-DD.");
  }
  if (draft.kind === "OTC_FX_SWAP") {
    if (!draft.terms.domesticLegIndex.trim() || !draft.terms.foreignLegIndex.trim()) throw new Error("O swap exige os indexadores declarados das pernas doméstica e estrangeira.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.terms.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.terms.endDate)) throw new Error("O swap exige datas de início e fim em AAAA-MM-DD.");
  }
  if (draft.kind === "OTC_RATE_SWAP") {
    if (!draft.terms.floatingLegIndex.trim() || !draft.terms.fixedLegConvention.trim() || !draft.terms.paymentSchedule.trim()) throw new Error("O swap de taxa exige indexador flutuante, convenção da perna fixa e calendário de pagamentos declarados.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.terms.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(draft.terms.endDate) || draft.terms.endDate <= draft.terms.startDate) throw new Error("O swap de taxa exige datas de início e fim válidas e ordenadas.");
  }
  return { ...draft, validationStatus: "validated_user_contract", pricingEligibility: "contract_terms_and_market_inputs_required" };
}

export const INSTRUMENT_TEMPLATES: ReadonlyArray<{ kind: HedgeInstrumentKind; validationStatus: InstrumentValidationStatus; requiredTerms: readonly string[] }> = [
  { kind: "B3_FX_FUTURE", validationStatus: "official_specification_loaded", requiredTerms: ["código B3", "vencimento", "boletim de preços B3 da mesma data-base"] },
  { kind: "B3_FX_OPTION", validationStatus: "official_specification_loaded", requiredTerms: ["identificador B3", "ativo-objeto", "strike", "tipo call/put", "vencimento", "volatilidade observável"] },
  { kind: "B3_DI_FUTURE", validationStatus: "official_specification_loaded", requiredTerms: ["identificador B3", "vencimento", "ajuste/taxa observável"] },
  { kind: "B3_DI_OPTION", validationStatus: "official_specification_loaded", requiredTerms: ["identificador B3", "futuro DI1 subjacente", "série de opção", "vencimento", "preço de exercício", "prêmio observável"] },
  { kind: "B3_COMMODITY_FUTURE", validationStatus: "official_specification_loaded", requiredTerms: ["identificador B3", "vencimento", "boletim de preços B3 da mesma data-base", "unidade econômica da exposição"] },
  { kind: "OTC_NDF", validationStatus: "user_contract_required", requiredTerms: ["contrato assinado", "nocional", "moedas", "taxa a termo", "data de fixing", "liquidação"] },
  { kind: "OTC_FX_SWAP", validationStatus: "user_contract_required", requiredTerms: ["contrato assinado", "nocional", "pernas indexadoras", "taxas", "datas", "liquidação"] },
  { kind: "OTC_RATE_SWAP", validationStatus: "user_contract_required", requiredTerms: ["contrato assinado", "nocional", "perna fixa", "indexador flutuante", "calendário de pagamentos", "datas", "convenções"] },
];
