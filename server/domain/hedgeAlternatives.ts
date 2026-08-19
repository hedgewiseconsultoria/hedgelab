export type EconomicExposureKind =
  | "USD_PAYABLE"
  | "USD_RECEIVABLE"
  | "CDI_LINKED_DEBT"
  | "COMMODITY_PURCHASE"
  | "COMMODITY_SALE";

export type HedgeRiskFactor = "USD_BRL" | "CDI_RATE" | "B3_COMMODITY_PRICE";
export type CommodityReference = "BGI" | "CCM" | "SOY" | "SJC";
export type HedgeAlternativeKind =
  | "B3_DOL_FUTURE"
  | "B3_WDO_FUTURE"
  | "B3_DOL_OPTION"
  | "OTC_NDF_OR_TERM"
  | "OTC_FX_SWAP"
  | "B3_DI1_FUTURE"
  | "B3_FRA_DI1"
  | "B3_DI1_OPTION"
  | "OTC_RATE_SWAP"
  | "B3_COMMODITY_FUTURE"
  | "B3_COMMODITY_OPTION";

export type HedgeEligibilityStatus = "eligible_with_market_data" | "contract_required" | "blocked";

export type EconomicExposure = {
  exposureId: string;
  kind: EconomicExposureKind;
  description: string;
  notional: number;
  currency: "USD" | "BRL";
  maturityDate: string;
  commodityReference?: CommodityReference;
  indexer?: "CDI";
  interestSpreadPctAa?: number;
};

export type ExposureDiagnosis = {
  riskFactor: HedgeRiskFactor;
  adverseMove: string;
  economicImpact: string;
  hedgeDirection: "BUY" | "SELL";
};

export type HedgeAlternative = {
  kind: HedgeAlternativeKind;
  label: string;
  riskFactor: HedgeRiskFactor;
  hedgeDirection: "BUY" | "SELL";
  status: HedgeEligibilityStatus;
  requiredData: string[];
  blockingReason: string | null;
  sources: Array<"B3_PUBLIC_FILES" | "B3_PRODUCT_SPECIFICATION" | "USER_CONTRACT" | "BCB_PTAX">;
};

export type HedgeAlternativesResult = {
  exposure: EconomicExposure;
  diagnosis: ExposureDiagnosis;
  alternatives: HedgeAlternative[];
};

function validateExposure(exposure: EconomicExposure) {
  if (!exposure.exposureId.trim()) throw new Error("O identificador da exposição é obrigatório.");
  if (!exposure.description.trim()) throw new Error("A descrição da exposição é obrigatória.");
  if (!Number.isFinite(exposure.notional) || exposure.notional <= 0) throw new Error("O valor da exposição deve ser positivo e finito.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(exposure.maturityDate)) throw new Error("A data de vencimento deve seguir o padrão AAAA-MM-DD.");
  if ((exposure.kind === "COMMODITY_PURCHASE" || exposure.kind === "COMMODITY_SALE") && !exposure.commodityReference) throw new Error("A exposição a commodity exige referência B3 declarada.");
  if (exposure.kind === "CDI_LINKED_DEBT" && exposure.indexer !== "CDI") throw new Error("A dívida pós-fixada elegível nesta etapa deve declarar CDI como indexador.");
}

function listedAlternative(kind: HedgeAlternativeKind, label: string, riskFactor: HedgeRiskFactor, hedgeDirection: "BUY" | "SELL", requiredData: string[]): HedgeAlternative {
  return { kind, label, riskFactor, hedgeDirection, status: "eligible_with_market_data", requiredData, blockingReason: null, sources: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"] };
}

function bilateralAlternative(kind: HedgeAlternativeKind, label: string, riskFactor: HedgeRiskFactor, hedgeDirection: "BUY" | "SELL", requiredData: string[]): HedgeAlternative {
  return { kind, label, riskFactor, hedgeDirection, status: "contract_required", requiredData, blockingReason: "A alternativa bilateral só pode ser calculada após contrato ou registro com termos, datas e hash de evidência.", sources: ["USER_CONTRACT"] };
}

function blockedListedAlternative(kind: HedgeAlternativeKind, label: string, riskFactor: HedgeRiskFactor, hedgeDirection: "BUY" | "SELL", requiredData: string[], blockingReason: string): HedgeAlternative {
  return { kind, label, riskFactor, hedgeDirection, status: "blocked", requiredData, blockingReason, sources: ["B3_PUBLIC_FILES", "B3_PRODUCT_SPECIFICATION"] };
}

/**
 * Catálogo de alternativas por exposição econômica. A função não recomenda
 * uma estratégia, não pressupõe liquidez e não calcula preço sem o conjunto
 * de dados exigido pelo instrumento correspondente.
 */
export function diagnoseHedgeAlternatives(exposure: EconomicExposure): HedgeAlternativesResult {
  validateExposure(exposure);

  if (exposure.kind === "USD_PAYABLE" || exposure.kind === "USD_RECEIVABLE") {
    const hedgeDirection = exposure.kind === "USD_PAYABLE" ? "BUY" : "SELL";
    const adverseMove = exposure.kind === "USD_PAYABLE" ? "alta de USD/BRL" : "queda de USD/BRL";
    const economicImpact = exposure.kind === "USD_PAYABLE" ? "aumento do custo em BRL" : "redução da receita em BRL";
    return {
      exposure,
      diagnosis: { riskFactor: "USD_BRL", adverseMove, economicImpact, hedgeDirection },
      alternatives: [
        listedAlternative("B3_DOL_FUTURE", "Futuro de dólar comercial (DOL)", "USD_BRL", hedgeDirection, ["série DOL", "vencimento", "preço de ajuste B3", "quantidade de contratos"]),
        listedAlternative("B3_WDO_FUTURE", "Mini futuro de dólar comercial (WDO)", "USD_BRL", hedgeDirection, ["série WDO", "vencimento", "preço de ajuste B3", "quantidade de contratos"]),
        listedAlternative("B3_DOL_OPTION", "Opção listada sobre dólar comercial", "USD_BRL", hedgeDirection, ["série de opção", "ativo-objeto", "strike", "prêmio B3", "tipo call/put", "vencimento"]),
        bilateralAlternative("OTC_NDF_OR_TERM", "Termo ou NDF de moeda", "USD_BRL", hedgeDirection, ["contrato/registro", "taxa a termo", "fixing", "liquidação", "nocional"]),
        bilateralAlternative("OTC_FX_SWAP", "Swap cambial bilateral", "USD_BRL", hedgeDirection, ["contrato", "pernas indexadoras", "taxas", "datas", "nocional"]),
      ],
    };
  }

  if (exposure.kind === "CDI_LINKED_DEBT") {
    return {
      exposure,
      diagnosis: { riskFactor: "CDI_RATE", adverseMove: "alta da taxa CDI e dos vértices da curva DI", economicImpact: "aumento da despesa financeira pós-fixada", hedgeDirection: "SELL" },
      alternatives: [
        listedAlternative("B3_DI1_FUTURE", "Futuro DI1", "CDI_RATE", "SELL", ["série DI1", "vencimento", "taxa/preço de ajuste B3", "vértice de curva validado", "quantidade"]),
        blockedListedAlternative("B3_FRA_DI1", "Operação estruturada FRA de DI1", "CDI_RATE", "SELL", ["dois vencimentos DI1", "preços/taxas B3", "razão de contratos oficial", "PU neutro"], "A B3 confirma a estrutura com dois DI1 em lados opostos, mas razão de contratos, PU neutro e duas observações compatíveis ainda devem ser selecionados antes de qualquer cálculo."),
        blockedListedAlternative("B3_DI1_OPTION", "Opção sobre futuro DI", "CDI_RATE", "SELL", ["série D11–D19", "DI1 subjacente", "strike", "prêmio B3", "vencimento"], "A ficha B3 da opção DI1 foi registrada, mas prêmio, strike, vencimentos compatíveis e observações B3 ainda são necessários; PU, taxa, MTM, DV01, volatilidade e Greeks permanecem bloqueados."),
        bilateralAlternative("OTC_RATE_SWAP", "Swap de taxa de juros", "CDI_RATE", "SELL", ["contrato", "perna CDI", "perna fixa/índice", "datas", "nocional", "convenções"]),
      ],
    };
  }

  const isPurchase = exposure.kind === "COMMODITY_PURCHASE";
  const hedgeDirection = isPurchase ? "BUY" : "SELL";
  const commodity = exposure.commodityReference!;
  return {
    exposure,
    diagnosis: {
      riskFactor: "B3_COMMODITY_PRICE",
      adverseMove: isPurchase ? `alta de preço do contrato ${commodity}` : `queda de preço do contrato ${commodity}`,
      economicImpact: isPurchase ? "aumento do custo de aquisição" : "redução da receita de venda",
      hedgeDirection,
    },
    alternatives: [
      listedAlternative("B3_COMMODITY_FUTURE", `Futuro de commodity ${commodity}`, "B3_COMMODITY_PRICE", hedgeDirection, [`série ${commodity}`, "vencimento", "preço de ajuste B3", "unidade de exposição", "quantidade"]),
      listedAlternative("B3_COMMODITY_OPTION", `Opção sobre futuro de commodity ${commodity}`, "B3_COMMODITY_PRICE", hedgeDirection, [`série de opção ${commodity}`, "futuro subjacente", "strike", "prêmio B3", "tipo call/put", "vencimento"]),
    ],
  };
}
