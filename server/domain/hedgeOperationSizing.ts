import type { CanonicalEconomicSituationRow, CanonicalHedgeAlternativeRow, B3MarketObservationRow } from "./dataframes";
import { B3_COMMODITY_FUTURE_SPECS, B3_COMMODITY_OPTION_SPECS, B3_FX_FUTURE_SPECS, B3_FX_OPTION_SPEC } from "./instrumentMaster";

export type HedgeOperationCatalogObservation = Pick<B3MarketObservationRow, "symbol" | "instrumentId" | "instrumentType" | "maturity" | "optionType" | "exercisePrice" | "lastPrice" | "tradeAveragePrice" | "adjustedQuote" | "adjustedQuoteTax" | "sourceHashSha256"> & { marginTheoreticalMax?: number | null; marginCurrency?: string | null; };

export type HedgeOperationSizingStatus = "effective" | "parameterized" | "blocked";

export type HedgeOperationSizing = {
  status: HedgeOperationSizingStatus;
  alternativeKind: CanonicalHedgeAlternativeRow["alternative_kind"];
  contracts: number | null;
  rawContracts: number | null;
  contractUnitQuantity: number | null;
  unitLabel: string | null;
  exposureQuantity: number;
  hedgedQuantity: number | null;
  residualQuantity: number | null;
  coverageRatio: number | null;
  observedPrice: number | null;
  priceLabel: string | null;
  strike: number | null;
  optionType: "CALL" | "PUT" | null;
  premiumValue: number | null;
  marginPerContract: number | null;
  marginEstimate: number | null;
  marginStatus: "official_theoretical_maximum" | "core_not_calculated" | "not_applicable_otc" | "unavailable";
  blockingReason: string | null;
  notes: string[];
};

const unitLabels: Record<string, string> = {
  USD: "USD",
  ARROBA: "arrobas",
  SACA_60KG: "sacas de 60 kg",
  METRIC_TON: "toneladas métricas",
  CUBIC_METER: "m³",
  TROY_OUNCE: "onças troy",
};

function roundToCover(value: number) {
  return Math.ceil(value);
}

function observedQuote(observation: HedgeOperationCatalogObservation | null) {
  if (!observation) return null;
  return observation.adjustedQuote ?? observation.adjustedQuoteTax ?? observation.lastPrice ?? observation.tradeAveragePrice ?? null;
}

function productSpec(alternative: CanonicalHedgeAlternativeRow["alternative_kind"]) {
  switch (alternative) {
    case "B3_DOL_FUTURE": return { quantity: B3_FX_FUTURE_SPECS.DOL.contractSizeUsd, unit: "USD", priceLabel: "ajuste/preço B3 por USD 1.000" };
    case "B3_WDO_FUTURE": return { quantity: B3_FX_FUTURE_SPECS.WDO.contractSizeUsd, unit: "USD", priceLabel: "ajuste/preço B3 por USD 1.000" };
    case "B3_DOL_OPTION": return { quantity: B3_FX_OPTION_SPEC.contractSizeUsd, unit: "USD", priceLabel: "prêmio observado B3 por USD" };
    case "B3_COMMODITY_FUTURE": return null;
    case "B3_COMMODITY_OPTION": return null;
    default: return null;
  }
}

export function calculateHedgeOperationSizing(input: {
  situation: CanonicalEconomicSituationRow;
  alternative: CanonicalHedgeAlternativeRow;
  coveragePct: number;
  observation?: HedgeOperationCatalogObservation | null;
  marginTheoreticalMax?: number | null;
}): HedgeOperationSizing {
  const alternativeKind = input.alternative.alternative_kind;
  const coverage = Math.min(Math.max(input.coveragePct, 0), 100) / 100;
  const exposureQuantity = input.situation.declared_quantity * coverage;
  const observedPrice = observedQuote(input.observation ?? null);
  const isB3 = alternativeKind.startsWith("B3_");
  const isOption = alternativeKind === "B3_DOL_OPTION" || alternativeKind === "B3_COMMODITY_OPTION";
  const isOtc = alternativeKind.startsWith("OTC_");

  if (isOtc) {
    return {
      status: "parameterized",
      alternativeKind,
      contracts: null,
      rawContracts: null,
      contractUnitQuantity: null,
      unitLabel: input.situation.declared_currency,
      exposureQuantity,
      hedgedQuantity: null,
      residualQuantity: null,
      coverageRatio: null,
      observedPrice: null,
      priceLabel: "taxa/preço do contrato bilateral",
      strike: null,
      optionType: null,
      premiumValue: null,
      marginPerContract: null,
      marginEstimate: null,
      marginStatus: "not_applicable_otc",
      blockingReason: "NDF e swap exigem termos do contrato bilateral: nocional, taxa contratada, datas, indexadores e convenção de liquidação.",
      notes: ["A entrada bilateral é parametrizada a partir do contrato do usuário.", "Não há margem B3 para um contrato OTC; garantia, colateral e limite dependem da contraparte."],
    };
  }

  if (alternativeKind === "B3_DI1_FUTURE" || alternativeKind === "B3_FRA_DI1" || alternativeKind === "B3_DI1_OPTION") {
    return {
      status: "parameterized",
      alternativeKind,
      contracts: null,
      rawContracts: null,
      contractUnitQuantity: null,
      unitLabel: "PU/DI1",
      exposureQuantity,
      hedgedQuantity: null,
      residualQuantity: null,
      coverageRatio: null,
      observedPrice,
      priceLabel: observedPrice === null ? null : "PU/ajuste B3",
      strike: input.observation?.exercisePrice ?? null,
      optionType: input.observation?.optionType ?? null,
      premiumValue: isOption ? observedPrice : null,
      marginPerContract: input.marginTheoreticalMax ?? null,
      marginEstimate: null,
      marginStatus: input.marginTheoreticalMax !== null && input.marginTheoreticalMax !== undefined ? "official_theoretical_maximum" : "unavailable",
      blockingReason: "Quantidade de DI1 depende de DV01, PU, taxa, prazo e curva compatíveis; o sistema não deve converter valor financeiro em contratos sem esses insumos.",
      notes: ["A curva DI1 pode apoiar a sensibilidade, mas não substitui o cálculo de DV01/CORE."],
    };
  }

  let unitQuantity: number | null = null;
  let unit: string | null = null;
  if (alternativeKind === "B3_DOL_FUTURE" || alternativeKind === "B3_WDO_FUTURE" || alternativeKind === "B3_DOL_OPTION") {
    const spec = productSpec(alternativeKind);
    unitQuantity = spec?.quantity ?? null;
    unit = spec?.unit ?? null;
  } else if (input.situation.commodity_reference && alternativeKind === "B3_COMMODITY_FUTURE") {
    const spec = B3_COMMODITY_FUTURE_SPECS[input.situation.commodity_reference];
    unitQuantity = spec?.contractSize ?? null;
    unit = spec?.contractUnit ?? null;
  } else if (input.situation.commodity_reference && alternativeKind === "B3_COMMODITY_OPTION") {
    const spec = B3_COMMODITY_OPTION_SPECS[input.situation.commodity_reference as keyof typeof B3_COMMODITY_OPTION_SPECS];
    unitQuantity = spec?.contractSize ?? null;
    unit = spec?.contractUnit ?? null;
  }

  if (!unitQuantity || !unitQuantity || !Number.isFinite(unitQuantity) || unitQuantity <= 0) {
    return {
      status: "blocked",
      alternativeKind,
      contracts: null,
      rawContracts: null,
      contractUnitQuantity: null,
      unitLabel: null,
      exposureQuantity,
      hedgedQuantity: null,
      residualQuantity: null,
      coverageRatio: null,
      observedPrice,
      priceLabel: observedPrice === null ? null : isOption ? "prêmio observado B3" : "preço/ajuste observado B3",
      strike: input.observation?.exercisePrice ?? null,
      optionType: input.observation?.optionType ?? null,
      premiumValue: isOption ? observedPrice : null,
      marginPerContract: input.marginTheoreticalMax ?? null,
      marginEstimate: null,
      marginStatus: input.marginTheoreticalMax !== null && input.marginTheoreticalMax !== undefined ? "official_theoretical_maximum" : "unavailable",
      blockingReason: "A especificação oficial não forneceu unidade econômica positiva para dimensionar esta alternativa.",
      notes: ["Nenhuma quantidade foi inventada."],
    };
  }

  if (!Number.isFinite(exposureQuantity) || exposureQuantity <= 0) {
    return {
      status: "blocked",
      alternativeKind,
      contracts: null,
      rawContracts: null,
      contractUnitQuantity: unitQuantity,
      unitLabel: unit ? (unitLabels[unit] ?? unit) : null,
      exposureQuantity,
      hedgedQuantity: null,
      residualQuantity: null,
      coverageRatio: null,
      observedPrice,
      priceLabel: observedPrice === null ? null : isOption ? "prêmio observado B3" : "preço/ajuste observado B3",
      strike: input.observation?.exercisePrice ?? null,
      optionType: input.observation?.optionType ?? null,
      premiumValue: isOption ? observedPrice : null,
      marginPerContract: input.marginTheoreticalMax ?? null,
      marginEstimate: null,
      marginStatus: input.marginTheoreticalMax !== null && input.marginTheoreticalMax !== undefined ? "official_theoretical_maximum" : "unavailable",
      blockingReason: "A unidade da exposição não é compatível com a unidade econômica do contrato.",
      notes: ["Não foi aplicada conversão automática de unidade."],
    };
  }

  const rawContracts = exposureQuantity / unitQuantity;
  const contracts = roundToCover(rawContracts);
  const hedgedQuantity = contracts * unitQuantity;
  const residualQuantity = input.situation.declared_quantity - hedgedQuantity;
  const marginPerContract = input.marginTheoreticalMax ?? null;
  const marginEstimate = marginPerContract === null ? null : contracts * marginPerContract;
  const hasPrice = observedPrice !== null && Number.isFinite(observedPrice);
  const status: HedgeOperationSizingStatus = hasPrice ? "effective" : "parameterized";

  return {
    status,
    alternativeKind,
    contracts,
    rawContracts,
    contractUnitQuantity: unitQuantity,
    unitLabel: unit ? (unitLabels[unit] ?? unit) : null,
    exposureQuantity,
    hedgedQuantity,
    residualQuantity,
    coverageRatio: input.situation.declared_quantity === 0 ? null : hedgedQuantity / input.situation.declared_quantity,
    observedPrice,
    priceLabel: isOption ? "prêmio observado B3" : "preço/ajuste observado B3",
    strike: input.observation?.exercisePrice ?? null,
    optionType: input.observation?.optionType ?? null,
    premiumValue: isOption && observedPrice !== null ? observedPrice * unitQuantity * contracts : null,
    marginPerContract,
    marginEstimate,
    marginStatus: marginPerContract === null ? "unavailable" : "official_theoretical_maximum",
    blockingReason: hasPrice ? null : "A quantidade foi dimensionada pela especificação oficial, mas o preço/prêmio da série não está observado na data-base.",
    notes: [
      "Quantidade arredondada para cima para não subcobrir a meta; revise a política operacional antes de contratar.",
      hasPrice ? "Preço/prêmio exibido veio da observação oficial B3 vinculada ao símbolo e vencimento." : "Preço/prêmio não foi inventado; o cenário permanece parametrizado.",
      marginPerContract === null ? "Margem teórica máxima B3 ainda não está disponível no snapshot desta sessão." : "Margem é uma estimativa individual sem netting, garantias ou chamada oficial do CORE.",
    ],
  };
}
