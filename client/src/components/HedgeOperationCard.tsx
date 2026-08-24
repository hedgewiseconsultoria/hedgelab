import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeCheck, ChartNoAxesCombined, CircleAlert, Link2, Loader2, ShieldCheck } from "lucide-react";
import React from "react";
import type { CanonicalEconomicSituationRow, CanonicalHedgeAlternativeRow, SupportedB3Family } from "../../../server/domain/dataframes";
import type { DiFutureCurveDataset } from "../../../server/domain/diFutureCurve";

const commodityUnits = {
  BGI: "arrobas",
  ICF: "sacas de 60 kg",
  CNL: "sacas de 60 kg",
  ETH: "m³",
  CCM: "sacas de 60 kg",
  GLD: "onças troy",
  SOY: "toneladas métricas",
  SJC: "sacas de 60 kg",
} as const;

/** Família B3 relevante para vincular série e cotação, a partir da alternativa escolhida. Retorna null para alternativas sem contrato B3 padronizado (DI1 é tratado separadamente via diCurve; OTC não tem família B3). */
export function commodityMarketFamily(situation: CanonicalEconomicSituationRow, alternative: CanonicalHedgeAlternativeRow): SupportedB3Family | null {
  if (alternative.alternative_kind === "B3_DOL_FUTURE" || alternative.alternative_kind === "B3_DOL_OPTION") return "DOL";
  if (alternative.alternative_kind === "B3_WDO_FUTURE") return "WDO";
  if ((alternative.alternative_kind === "B3_COMMODITY_FUTURE" || alternative.alternative_kind === "B3_COMMODITY_OPTION") && situation.commodity_reference) return situation.commodity_reference;
  return null;
}

export type CommodityMarketLinkStatus = "idle" | "loading" | "linked" | "not_found" | "error";
export type CommodityMarketLinkObservation = { symbol: string; adjustedQuote: number | null; lastPrice: number | null; maturity: string | null; sourceAsOf: string; sourceHashSha256: string | null };

function money(value: number, currency: "USD" | "BRL") {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
}

function quantity(situation: CanonicalEconomicSituationRow) {
  if (!situation.commodity_reference) return money(situation.declared_quantity, situation.declared_currency);
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(situation.declared_quantity)} ${commodityUnits[situation.commodity_reference]}`;
}

function economicPosition(alternative: CanonicalHedgeAlternativeRow) {
  return alternative.hedge_direction === "BUY" ? "posição comprada para proteger alta de preço/taxa" : "posição vendida para proteger queda de preço/taxa";
}

function operationalSummary(situation: CanonicalEconomicSituationRow, alternative: CanonicalHedgeAlternativeRow) {
  if (alternative.alternative_kind === "B3_DI1_FUTURE") return "Estratégia de redução da exposição a juros pós-fixados; não presume quantidade de contratos nem PU.";
  if (alternative.alternative_kind === "B3_COMMODITY_OPTION") return "Alternativa com opção; o intrínseco didático pode ser comparado quando houver strike declarado. Prêmio e MTM dependem de série e preço observados.";
  if (alternative.alternative_kind === "B3_COMMODITY_FUTURE") return situation.situation_kind === "COMMODITY_PURCHASE" ? "Compra física coberta por futuro comprado em cenário didático." : "Venda física coberta por futuro vendido em cenário didático.";
  if (alternative.alternative_kind === "B3_DOL_FUTURE" || alternative.alternative_kind === "B3_WDO_FUTURE") return alternative.hedge_direction === "BUY" ? "Despesa em USD coberta por futuro comprado em cenário didático." : "Receita em USD coberta por futuro vendido em cenário didático.";
  return "A alternativa está configurada a partir da direção econômica; os termos contratuais permanecem explícitos antes de qualquer cálculo efetivo.";
}

type Props = {
  situation: CanonicalEconomicSituationRow;
  alternative: CanonicalHedgeAlternativeRow;
  coveragePct: number;
  onCoverageChange: (coverage: number) => void;
  onOpenSimulation?: () => void;
  diCurve?: DiFutureCurveDataset | null;
  commodityMarketStatus?: CommodityMarketLinkStatus;
  commodityMarketObservation?: CommodityMarketLinkObservation | null;
  onLinkCommodityMarket?: () => void;
  compact?: boolean;
};

/** Resumo de operação derivado exclusivamente da exposição declarada e da alternativa escolhida. */
export default function HedgeOperationCard({ situation, alternative, coveragePct, onCoverageChange, onOpenSimulation, diCurve, commodityMarketStatus = "idle", commodityMarketObservation, onLinkCommodityMarket, compact = false }: Props) {
  const isB3 = alternative.source_ids.includes("B3_PUBLIC_FILES");
  const hasDiCurve = diCurve?.status === "valid_market_vertices";
  const family = commodityMarketFamily(situation, alternative);
  const settlementCurrency = family === "DOL" || family === "WDO" ? "BRL" : (family === "GLD" || family === "ICF" || family === "SOY" || family === "SJC") ? "USD" : "BRL";
  const dataState = !isB3
    ? "Contrato ou termos bilaterais ainda precisam ser declarados."
    : alternative.alternative_kind === "B3_DI1_FUTURE"
      ? hasDiCurve ? `${diCurve?.dataframe.length ?? 0} vértice(s) DI1 observado(s) na sessão.` : "Vértices DI1 ainda não disponíveis nesta sessão; a sensibilidade didática continua possível."
      : commodityMarketStatus === "linked" && commodityMarketObservation
        ? `Série ${commodityMarketObservation.symbol} vinculada — ajuste oficial B3 de ${commodityMarketObservation.sourceAsOf}: ${commodityMarketObservation.adjustedQuote !== null ? money(commodityMarketObservation.adjustedQuote, settlementCurrency) : "sem ajuste divulgado"}.`
        : commodityMarketStatus === "loading"
          ? "Buscando série e cotação oficial da B3 para o vencimento declarado…"
          : commodityMarketStatus === "not_found"
            ? "Boletins oficiais B3 coletados, mas nenhuma série encontrada para o vencimento declarado; a comparação didática continua possível."
            : commodityMarketStatus === "error"
              ? "Não foi possível coletar os boletins oficiais da B3 agora; a comparação didática continua possível."
              : "Série e cotação B3 ainda não estão vinculadas a esta operação; a comparação didática continua possível."
  const nextStep = alternative.alternative_kind === "B3_DI1_FUTURE" ? "Simular sensibilidade da dívida" : situation.commodity_reference ? "Comparar cenários de preço e cobertura" : "Simular cenário didático de cobertura";

  return <Card className={`mt-5 overflow-hidden rounded-2xl border-[#b9dfd4] bg-white shadow-[0_18px_38px_-32px_rgba(19,91,75,.6)] ${compact ? "" : ""}`}>
    <CardHeader className="border-b border-[#dcece7] bg-[linear-gradient(115deg,#f1fbf7,#fbfefd)] pb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#287465]">Operação em análise</p><CardTitle className="mt-1 text-lg text-[#17363e]">{alternative.label}</CardTitle><p className="mt-2 max-w-3xl text-xs leading-5 text-[#55736d]">{operationalSummary(situation, alternative)}</p></div><BadgeCheck className="h-5 w-5 text-[#23816c]" /></div></CardHeader>
    <CardContent className="p-5"><div className="grid gap-3 rounded-xl border border-[#d8ebe5] bg-[#fbfefd] p-4 md:grid-cols-2 xl:grid-cols-4"><Metric label="Exposição transferida" value={quantity(situation)} detail={situation.description} /><Metric label="Horizonte" value={situation.horizon_date} detail="Vencimento declarado" /><Metric label="Posição econômica" value={alternative.hedge_direction === "BUY" ? "Comprada" : "Vendida"} detail={economicPosition(alternative)} /><Metric label="Cobertura-alvo" value={`${coveragePct}%`} detail="Hipótese de proteção, não quantidade contratada" /></div>
      <div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#527a72]">Percentual de cobertura para a análise</p><div className="mt-2 flex flex-wrap gap-2">{[0, 50, 75, 100].map(value => <Button key={value} type="button" size="sm" variant={coveragePct === value ? "default" : "outline"} onClick={() => onCoverageChange(value)} className={coveragePct === value ? "bg-[#1b6258] text-white hover:bg-[#164e46]" : "border-[#bcd9d1] bg-white text-[#1c6157] hover:bg-[#edf9f5]"}>{value}%</Button>)}</div></div>
      <div className="mt-5 flex gap-2 rounded-xl border border-[#e6d8ad] bg-[#fffaf0] p-3 text-xs leading-5 text-[#755d2b]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Dados oficiais:</strong> {dataState} A ausência de cotação não é substituída por preço inventado e não impede o exercício didático declarado.</p></div>
      {isB3 && family && onLinkCommodityMarket && commodityMarketStatus !== "linked" && <div className="mt-3"><Button type="button" size="sm" variant="outline" onClick={onLinkCommodityMarket} disabled={commodityMarketStatus === "loading"} className="border-[#bcd9d1] bg-white text-[#1c6157] hover:bg-[#edf9f5]">{commodityMarketStatus === "loading" ? <Loader2 className="animate-spin" /> : <Link2 />} Vincular série e cotação B3</Button></div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2 text-xs text-[#55736d]"><ShieldCheck className="h-4 w-4 text-[#23816c]" /><span>Resultado efetivo, ajuste, MTM e Greeks permanecem bloqueados sem série, contrato e evidência compatíveis.</span></div>{onOpenSimulation && <Button onClick={onOpenSimulation} className="bg-[#173c45] text-white hover:bg-[#24515a]"><ChartNoAxesCombined /> {nextStep}</Button>}</div>
    </CardContent>
  </Card>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#6a8981]">{label}</p><p className="mt-1 text-sm font-semibold text-[#23474a]">{value}</p><p className="mt-1 text-[10px] leading-4 text-[#607c76]">{detail}</p></div>; }
