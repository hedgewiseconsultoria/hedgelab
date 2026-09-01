import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, CircleAlert } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { CanonicalEconomicSituationRow, CanonicalHedgeAlternativeRow } from "../../../server/domain/dataframes";
import type { DiFutureCurveDataset } from "../../../server/domain/diFutureCurve";

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

function calendarDaysToHorizon(horizonDate: string) {
  const horizon = new Date(`${horizonDate}T00:00:00Z`).getTime();
  const today = new Date();
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Number.isFinite(horizon) ? Math.max(1, Math.ceil((horizon - start) / 86_400_000)) : 1;
}

/** Cenário de sensibilidade da dívida declarada: não estima resultado do DI1 sem PUs e posição contratual. */
export default function CdiDebtStressScenarioCard({ situation, alternative, curve, onOpenAdvanced }: { situation: CanonicalEconomicSituationRow; alternative: CanonicalHedgeAlternativeRow; curve: DiFutureCurveDataset | null; onOpenAdvanced: () => void }) {
  const vertices = curve?.status === "valid_market_vertices" ? curve.dataframe.filter(point => point.business_days_to_maturity !== null) ?? [] : [];
  const [vertexId, setVertexId] = useState("");
  const [shockBps, setShockBps] = useState("100");
  const [calculated, setCalculated] = useState(false);
  useEffect(() => { if (!vertexId && vertices[0]) setVertexId(vertices[0].curve_point_id); }, [vertexId, vertices]);
  const vertex = vertices.find(point => point.curve_point_id === vertexId) ?? vertices[0] ?? null;
  const shock = Number(shockBps.replace(",", "."));
  const days = vertex?.business_days_to_maturity ?? calendarDaysToHorizon(situation.horizon_date);
  const dayBase = vertex ? 252 : 365;
  const stress = useMemo(() => Number.isFinite(shock) ? situation.declared_quantity * (shock / 10_000) * (days / dayBase) : null, [dayBase, days, shock, situation.declared_quantity]);
  const canCalculate = Number.isFinite(shock);
  return <Card className="mt-5 rounded-2xl border-[#c9e2dc] bg-white shadow-none"><CardHeader className="border-b border-[#e4efeb] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#2f7869]">Cenário integrado · dívida CDI</p><CardTitle className="mt-1 text-base text-[#17363e]">Sensibilidade da exposição declarada</CardTitle></div><Calculator className="h-5 w-5 text-[#287965]" /></div><p className="mt-2 text-xs leading-5 text-[#55736d]">O cenário usa a dívida e o horizonte já declarados. O choque de taxa é uma hipótese didática explícita; o resultado do DI1, PU, quantidade contratada e efetividade continuam separados e bloqueados sem evidência de mercado.</p></CardHeader><CardContent className="p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-xl border border-[#dceae6] bg-[#f8fcfa] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Dívida transferida</p><p className="mt-2 font-mono text-base font-semibold text-[#17363e]">{formatBrl(situation.declared_quantity)}</p><p className="mt-1 text-[10px] text-[#56736e]">{situation.horizon_date} · CDI</p></div><div className="rounded-xl border border-[#dceae6] bg-[#f8fcfa] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Alternativa</p><p className="mt-2 text-sm font-semibold text-[#17363e]">{alternative.label}</p><p className="mt-1 text-[10px] text-[#56736e]">posição não dimensionada</p></div>{vertex ? <div><Label htmlFor="cdi-di1-vertex" className="text-xs">Vértice DI1 B3 observado</Label><select id="cdi-di1-vertex" value={vertexId} onChange={event => { setVertexId(event.target.value); setCalculated(false); }} className="mt-1.5 h-10 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]"><option value="">Selecione o vencimento</option>{vertices.map(point => <option key={point.curve_point_id} value={point.curve_point_id}>{point.symbol} · {point.maturity} · {point.business_days_to_maturity} DU</option>)}</select></div> : <div className="rounded-xl border border-[#ead7b6] bg-[#fff9ef] p-3 text-xs leading-5 text-[#765527]"><CircleAlert className="mr-1 inline h-4 w-4" />Sem vértice DI1 B3 nesta sessão. A sensibilidade abaixo usa {days} dias corridos até o horizonte em base didática 365.</div>}<div><Label htmlFor="cdi-di1-shock" className="text-xs">Choque didático na taxa (bps)</Label><Input id="cdi-di1-shock" inputMode="decimal" value={shockBps} onChange={event => { setShockBps(event.target.value); setCalculated(false); }} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e]" /></div></div><div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={() => setCalculated(true)} disabled={!canCalculate} className="bg-[#173c45] text-white hover:bg-[#24515a]"><Calculator /> Simular impacto da dívida</Button><span className="text-xs text-[#5c7873]">{vertex ? `Base B3: ${vertex.symbol} · ${vertex.adjusted_rate_pct_aa252.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}% a.a. / 252 · ${vertex.business_days_to_maturity} DU` : `Base didática: ${days} dias corridos ÷ 365 até ${situation.horizon_date}`}</span></div>{calculated && stress !== null && <div className="mt-5 grid gap-3 md:grid-cols-2"><div className="rounded-xl border border-[#ead7b6] bg-[#fff9ef] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b5d2e]">Encargo adicional sob choque</p><p className="mt-2 font-mono text-2xl font-semibold text-[#7a4d19]">{formatBrl(stress)}</p><p className="mt-2 text-[11px] leading-5 text-[#735b37]">Memória: dívida declarada × choque em bps ÷ 10.000 × {days} {vertex ? "DU ÷ 252" : "dias corridos ÷ 365"}. Trata-se de sensibilidade didática, não de projeção de CDI.</p></div><div className="rounded-xl border border-[#d6e7e2] bg-[#f8fcfa] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#527a72]">Comparação com DI1</p><p className="mt-2 text-sm font-semibold text-[#17363e]">Resultado efetivo do hedge permanece bloqueado</p><p className="mt-2 text-[11px] leading-5 text-[#5c7873]">Para calcular ajuste do DI1, informe posição efetivamente contratada, PUs e evidências de preço correspondentes. A plataforma não presume contratos nem efetividade.</p><Button variant="outline" size="sm" onClick={onOpenAdvanced} className="mt-3 border-[#bcd9d1] text-[#1c6157]">Abrir ajuste DI1 avançado</Button></div></div>}</CardContent></Card>;
}
