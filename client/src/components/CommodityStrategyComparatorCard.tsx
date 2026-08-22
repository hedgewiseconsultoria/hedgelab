import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BadgeCheck, Calculator, CircleAlert, Gauge } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { CanonicalEconomicSituationRow, CanonicalHedgeAlternativeRow } from "../../../server/domain/dataframes";
import { calculateCommodityStrategyScenario, type CommodityScenarioStrategy } from "../../../server/domain/commodityStrategyScenario";

const labels = {
  BGI: { name: "Boi Gordo", unit: "arroba", currency: "BRL" },
  ICF: { name: "Café Arábica 4/5", unit: "saca de 60 kg", currency: "USD" },
  CNL: { name: "Café Conilon Robusta", unit: "saca de 60 kg", currency: "BRL" },
  ETH: { name: "Etanol Hidratado", unit: "m³", currency: "BRL" },
  CCM: { name: "Milho", unit: "saca de 60 kg", currency: "BRL" },
  GLD: { name: "Ouro", unit: "onça troy", currency: "USD" },
  SOY: { name: "Soja FOB Santos", unit: "tonelada métrica", currency: "USD" },
  SJC: { name: "Soja referenciada no Mini de Soja CME", unit: "saca de 60 kg", currency: "USD" },
} as const;

function number(value: string) { return Number(value.replace(",", ".")); }
function money(value: number, currency: "BRL" | "USD") { return new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }

/** Comparação de estratégia baseada apenas em premissas didáticas explicitamente declaradas. */
export default function CommodityStrategyComparatorCard({ situation, alternative, coveragePct: configuredCoveragePct = 100, onCoverageChange }: { situation: CanonicalEconomicSituationRow; alternative: CanonicalHedgeAlternativeRow; coveragePct?: number; onCoverageChange?: (coverage: number) => void }) {
  const commodity = situation.commodity_reference;
  if (!commodity) return null;
  const reference = labels[commodity];
  const economicDirection = situation.situation_kind === "COMMODITY_PURCHASE" ? "BUY" as const : "SELL" as const;
  const [referencePrice, setReferencePrice] = useState("");
  const [priceChangePct, setPriceChangePct] = useState("10");
  const [coveragePct, setCoveragePct] = useState(String(configuredCoveragePct));
  const [optionStrike, setOptionStrike] = useState("");
  const parsedReference = number(referencePrice);
  const parsedChange = number(priceChangePct);
  const parsedCoverage = number(coveragePct);
  const parsedStrike = number(optionStrike);
  useEffect(() => { setCoveragePct(String(configuredCoveragePct)); }, [configuredCoveragePct]);
  const scenarioPrice = Number.isFinite(parsedReference) && Number.isFinite(parsedChange) ? parsedReference * (1 + parsedChange / 100) : Number.NaN;
  const baseInput = { economicDirection, exposureQuantity: situation.declared_quantity, coveragePct: parsedCoverage, referencePrice: parsedReference, scenarioPrice };
  const comparisons = useMemo(() => {
    if (![parsedReference, parsedChange, parsedCoverage, scenarioPrice].every(Number.isFinite) || parsedReference <= 0 || scenarioPrice <= 0 || parsedCoverage < 0 || parsedCoverage > 100) return null;
    const unhedged = calculateCommodityStrategyScenario({ ...baseInput, strategy: "UNHEDGED" });
    const future = calculateCommodityStrategyScenario({ ...baseInput, strategy: "FUTURE" });
    const option = Number.isFinite(parsedStrike) && parsedStrike > 0 ? calculateCommodityStrategyScenario({ ...baseInput, strategy: "PROTECTIVE_OPTION", optionStrike: parsedStrike }) : null;
    return { unhedged, future, option };
  }, [baseInput, parsedChange, parsedCoverage, parsedReference, parsedStrike, scenarioPrice]);
  const directionText = economicDirection === "BUY" ? "Compra física: alta de preço aumenta o custo" : "Venda física: queda de preço reduz a receita";
  const futurePosition = economicDirection === "BUY" ? "posição comprada em futuro" : "posição vendida em futuro";
  const optionPosition = economicDirection === "BUY" ? "call protetiva" : "put protetiva";
  const highlightedStrategy: CommodityScenarioStrategy = alternative.alternative_kind === "B3_COMMODITY_OPTION" ? "PROTECTIVE_OPTION" : "FUTURE";

  return <Card className="mt-5 overflow-hidden rounded-2xl border-[#c9e2dc] bg-white shadow-none">
    <CardHeader className="border-b border-[#e4efeb] bg-[#f4fbf8] pb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#2f7869]">Operação configurada · commodity</p><CardTitle className="mt-1 text-lg text-[#17363e]">{reference.name} · exposição e estratégias comparáveis</CardTitle><p className="mt-2 max-w-3xl text-xs leading-5 text-[#55736d]">{directionText}. A alternativa em análise é <strong>{alternative.label}</strong>; o quadro também mostra a estratégia alternativa quando há premissas didáticas suficientes.</p></div><BadgeCheck className="h-5 w-5 text-[#23816c]" /></div></CardHeader>
    <CardContent className="p-5">
      <div className="grid gap-3 rounded-xl border border-[#d9ebe5] bg-[#fbfefd] p-4 md:grid-cols-4"><Metric label="Quantidade física" value={`${situation.declared_quantity.toLocaleString("pt-BR")} ${reference.unit}`} /><Metric label="Posição no futuro" value={futurePosition} /><Metric label="Proteção com opção" value={optionPosition} /><Metric label="Moeda da cotação" value={reference.currency} /></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field label={`Preço de referência didático (${reference.currency}/${reference.unit})`}><Input inputMode="decimal" value={referencePrice} onChange={event => setReferencePrice(event.target.value)} placeholder="Ex.: 100,00" /></Field><Field label="Cenário de preço até o vencimento (%)"><Input inputMode="decimal" value={priceChangePct} onChange={event => setPriceChangePct(event.target.value)} placeholder="Ex.: 10 ou -10" /></Field><Field label="Percentual de cobertura (%)"><Input inputMode="decimal" value={coveragePct} onChange={event => { setCoveragePct(event.target.value); const value = number(event.target.value); if (Number.isFinite(value) && value >= 0 && value <= 100) onCoverageChange?.(value); }} placeholder="0 a 100" /></Field><Field label={`Strike opcional (${reference.currency}/${reference.unit})`}><Input inputMode="decimal" value={optionStrike} onChange={event => setOptionStrike(event.target.value)} placeholder="Para intrínseco de opção" /></Field></div>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[#e6d8ad] bg-[#fffaf0] p-3 text-xs leading-5 text-[#755d2b]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>Hipótese didática, não preço B3.</strong> O preço de referência, variação e strike são inseridos para ensino. Resultado efetivo, ajuste diário, margem, base, prêmio, MTM, volatilidade e Greeks seguem bloqueados sem série, vencimento e evidência oficial compatíveis.</p></div>
      {Number.isFinite(scenarioPrice) && <p className="mt-3 text-xs text-[#55736d]">Preço de cenário calculado: <strong>{money(scenarioPrice, reference.currency)}</strong> por {reference.unit}; variação declarada de {parsedChange.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%.</p>}
      {comparisons ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-[#f5faf8] text-[10px] font-semibold uppercase tracking-[.1em] text-[#607f78]"><tr><th className="px-4 py-3">Estratégia</th><th className="px-4 py-3 text-right">Resultado físico</th><th className="px-4 py-3 text-right">Resultado do hedge</th><th className="px-4 py-3 text-right">Resultado combinado</th><th className="px-4 py-3">Status</th></tr></thead><tbody className="divide-y divide-[#e6efeb]"><StrategyRow label="Sem hedge" result={comparisons.unhedged} currency={reference.currency} active={false} /><StrategyRow label="Futuro linear" result={comparisons.future} currency={reference.currency} active={highlightedStrategy === "FUTURE"} />{comparisons.option ? <StrategyRow label="Opção: somente intrínseco" result={comparisons.option} currency={reference.currency} active={highlightedStrategy === "PROTECTIVE_OPTION"} /> : <tr><td className="px-4 py-4 font-medium text-[#23474a]">Opção: somente intrínseco</td><td colSpan={3} className="px-4 py-4 text-[#7a7260]">Informe um strike didático para comparar o intrínseco. Prêmio e MTM não são calculados.</td><td className="px-4 py-4"><span className="rounded-md bg-[#fff5df] px-2 py-1 text-[10px] font-semibold text-[#8b6425]">AGUARDANDO STRIKE</span></td></tr>}</tbody></table></div> : <div className="mt-5 grid place-items-center rounded-xl border border-dashed border-[#cbded8] bg-[#fbfefd] px-5 py-8 text-center"><Gauge className="h-5 w-5 text-[#4d937f]" /><p className="mt-2 text-sm font-semibold text-[#264d4d]">Informe preço de referência, cenário e percentual de cobertura</p><p className="mt-1 max-w-xl text-xs leading-5 text-[#67807a]">O quadro calculará impactos didáticos por unidade, sem criar uma observação B3 ou uma posição real.</p></div>}
    </CardContent>
  </Card>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><Label className="text-xs text-[#385b5b]">{label}</Label><div className="mt-1.5">{children}</div></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#6a8981]">{label}</p><p className="mt-1 text-sm font-semibold text-[#23474a]">{value}</p></div>; }
function StrategyRow({ label, result, currency, active }: { label: string; result: ReturnType<typeof calculateCommodityStrategyScenario>; currency: "BRL" | "USD"; active: boolean }) { return <tr className={active ? "bg-[#eefaf5]" : "bg-white"}><td className="px-4 py-4 font-medium text-[#23474a]">{label}{active && <span className="ml-2 rounded-md bg-[#d8f1e7] px-1.5 py-0.5 text-[9px] font-semibold text-[#17725e]">EM ANÁLISE</span>}</td><td className="px-4 py-4 text-right font-mono text-[#536e6c]">{money(result.physicalEconomicImpact, currency)}</td><td className="px-4 py-4 text-right font-mono text-[#22725f]">{money(result.hedgeEconomicImpact, currency)}</td><td className="px-4 py-4 text-right font-mono font-semibold text-[#173e3d]">{money(result.combinedEconomicImpact, currency)}</td><td className="px-4 py-4"><span className="rounded-md bg-[#f2f8f6] px-2 py-1 text-[10px] font-semibold text-[#4f786e]">DIDÁTICO</span></td></tr>; }
