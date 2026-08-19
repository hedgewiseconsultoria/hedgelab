import { B3_FX_OPTION_SPEC } from "./instrumentMaster";
import type { RoundingPolicy } from "./fxFuturesHedge";

export type FxOptionSizingInput = { exposureUsd: number; roundingPolicy: RoundingPolicy };
export type FxOptionSizingResult = { contract: "DOL_OPTION"; contracts: number; contractSizeUsd: number; referencedUsd: number; residualUsd: number; coverageRatio: number; sourceUrl: string; evidenceHashSha256: string; limitation: string };

function roundContracts(value: number, policy: RoundingPolicy) {
  if (policy === "FLOOR") return Math.floor(value);
  if (policy === "CEILING") return Math.ceil(value);
  return Math.round(value);
}

/** Dimensiona apenas a referência nocional máxima do ativo-objeto da opção; não calcula delta, prêmio, MTM ou exercício. */
export function sizeB3DollarOptionReference(input: FxOptionSizingInput): FxOptionSizingResult {
  if (!Number.isFinite(input.exposureUsd) || input.exposureUsd <= 0) throw new Error("A exposição em USD deve ser positiva e finita.");
  const contracts = roundContracts(input.exposureUsd / B3_FX_OPTION_SPEC.contractSizeUsd, input.roundingPolicy);
  const referencedUsd = contracts * B3_FX_OPTION_SPEC.contractSizeUsd;
  return { contract: "DOL_OPTION", contracts, contractSizeUsd: B3_FX_OPTION_SPEC.contractSizeUsd, referencedUsd, residualUsd: input.exposureUsd - referencedUsd, coverageRatio: referencedUsd / input.exposureUsd, sourceUrl: B3_FX_OPTION_SPEC.evidence.sourceUrl!, evidenceHashSha256: B3_FX_OPTION_SPEC.evidence.sourceHashSha256!, limitation: "Equivalência nocional máxima do ativo-objeto em USD; não representa delta, prêmio, valor temporal, probabilidade de exercício, MTM, volatilidade implícita, Greeks, preço, vencimento, ajuste, margem, base ou custo financeiro." };
}
