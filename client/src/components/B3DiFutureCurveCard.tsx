import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ChartNoAxesCombined, CircleAlert, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import type { DiFutureCurveDataset } from "../../../server/domain/diFutureCurve";

/** Consulta os vértices B3 publicados; não estima curva quando a fonte não está disponível. */
export default function B3DiFutureCurveCard({ onCurve, visualLoading = false, autoCollect = false, initialAsOf = "2026-08-13", contextual = false }: { onCurve?: (curve: DiFutureCurveDataset | null) => void; visualLoading?: boolean; autoCollect?: boolean; initialAsOf?: string; contextual?: boolean }) {
  const [asOf, setAsOf] = useState(initialAsOf);
  const [localTimeout, setLocalTimeout] = useState(false);
  const autoCollectedAsOf = useRef<string | null>(null);
  const curveMutation = trpc.marketData.collectB3DiFutureCurve.useMutation();
  const curve = visualLoading ? { ...curveMutation, isPending: true } : curveMutation;
  const statusTone = curve.data?.curve.status === "valid_market_vertices" ? "border-[#9cd6c8] bg-[#effbf7] text-[#20715f]" : curve.data?.curve.status === "blocked" ? "border-[#f1c6bd] bg-[#fff4f0] text-[#a54c35]" : "border-[#e8d1a6] bg-[#fff8ed] text-[#8d6740]";
  const retry = () => { setLocalTimeout(false); autoCollectedAsOf.current = asOf; curve.mutate({ asOf }); };
  const unavailable = Boolean(localTimeout || curve.isError);

  useEffect(() => { setAsOf(initialAsOf); }, [initialAsOf]);
  useEffect(() => { onCurve?.(curve.data?.curve ?? null); }, [curve.data, onCurve]);
  useEffect(() => { if (!curve.isPending) { setLocalTimeout(false); return; } const timer = window.setTimeout(() => setLocalTimeout(true), 65_000); return () => window.clearTimeout(timer); }, [curve.isPending]);
  useEffect(() => {
    if (!autoCollect || !asOf || curve.isPending || curve.data || curve.isError || autoCollectedAsOf.current === asOf) return;
    autoCollectedAsOf.current = asOf;
    setLocalTimeout(false);
    curve.mutate({ asOf });
  }, [asOf, autoCollect, curve]);

  const automaticStatus = curve.isPending || visualLoading
    ? "Consultando automaticamente os vértices publicados pela B3…"
    : unavailable
      ? "A fonte B3 não ficou disponível ou não pôde ser validada nesta tentativa. Nenhuma curva foi estimada; o ajuste DI1 permanece bloqueado."
      : curve.data
        ? "Vértices oficiais recuperados e vinculados a esta análise."
        : "A consulta oficial será iniciada automaticamente para a data-base informada.";

  return <Card data-visual-state={visualLoading ? "loading" : undefined} className={`${contextual ? "mt-0" : "mt-7"} rounded-2xl border-[#dce8e5] bg-white shadow-none`}>
    <CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Evidência B3 — juros</p><CardTitle className="mt-1 text-base text-[#17363e]">Vértices de DI futuro publicados pela B3</CardTitle></div><ChartNoAxesCombined className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">A coleta associa PriceReport e InstrumentReport da mesma data-base e preserva taxa de ajuste, vencimento e hashes. Não há interpolação, taxa forward, MTM ou taxa substituta.</p></CardHeader>
    <CardContent className="p-5">
      {autoCollect ? <div role="status" className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-3 text-xs leading-5 ${unavailable ? "border-[#ecd3b7] bg-[#fff9ef] text-[#7d643e]" : "border-[#d9e8e4] bg-[#f8fcfa] text-[#58736e]"}`}>{(curve.isPending || visualLoading) && <Loader2 className="h-4 w-4 animate-spin text-[#277e73]" />}{unavailable && <CircleAlert className="h-4 w-4 shrink-0 text-[#a9722f]" />}{automaticStatus}{unavailable && <Button size="sm" variant="outline" onClick={retry} disabled={curve.isPending || !asOf} className="ml-auto border-[#d7bb87] bg-white text-[#805b27]"><RefreshCw /> Tentar novamente</Button>}</div> : <div className="grid gap-3 sm:grid-cols-[minmax(0,240px)_auto] sm:items-end"><div><Label htmlFor="di-curve-asof" className="text-xs">Data-base B3</Label><Input id="di-curve-asof" type="date" value={asOf} onChange={event => setAsOf(event.target.value)} disabled={curve.isPending && !localTimeout} className="mt-1.5 border-[#d8e5e2]" /></div><Button onClick={retry} disabled={!asOf || (curve.isPending && !localTimeout)} className="bg-[#173c45] text-white hover:bg-[#24515a]">{curve.isPending && !localTimeout ? <Loader2 className="animate-spin" /> : unavailable ? <RefreshCw /> : <ChartNoAxesCombined />} {unavailable ? "Tentar novamente" : "Coletar vértices DI1"}</Button></div>}
      {!autoCollect && unavailable && <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />A fonte B3 não respondeu com dados oficiais válidos nesta tentativa. Nenhuma curva alternativa foi estimada e o ajuste DI1 continua bloqueado.</p>}
      {curve.data && <div className="mt-5 space-y-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={statusTone}>{curve.data.curve.status}</Badge><span className="text-xs text-[#607a76]">{curve.data.curve.dataframe.length} vértice(s) · associação {curve.data.marketAssociationStatus}</span></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="border-b border-[#dfece8] text-[10px] uppercase tracking-[.12em] text-[#66837d]"><tr><th className="px-3 py-3">Série</th><th className="px-3 py-3">Vencimento</th><th className="px-3 py-3">Taxa de ajuste</th><th className="px-3 py-3">DU</th><th className="px-3 py-3">Arquivo / hash</th></tr></thead><tbody>{curve.data.curve.dataframe.map(point => <tr key={point.curve_point_id} className="border-b border-[#edf2f0] text-[#385954]"><td className="px-3 py-3 font-medium text-[#17363e]">{point.symbol}</td><td className="px-3 py-3">{point.maturity}</td><td className="px-3 py-3 font-mono">{new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(point.adjusted_rate_pct_aa252)}% a.a. / 252</td><td className="px-3 py-3">{point.business_days_to_maturity ?? "fora da cobertura oficial"}</td><td className="max-w-64 truncate px-3 py-3 font-mono text-[10px]" title={point.source_hash_sha256 ?? "hash indisponível"}>{point.source_file} · {point.source_hash_sha256 ?? "sem hash"}</td></tr>)}</tbody></table></div>{curve.data.curve.issues.length > 0 && <p className="rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">{curve.data.curve.issues.map(issue => issue.message).join(" ")}</p>}<p className="text-[10px] leading-4 text-[#6a827d]">CSV auditável: {curve.data.curve.csv.storageUrl} · manifesto: {curve.data.curve.manifest.storageUrl}</p></div>}
    </CardContent>
  </Card>;
}
