import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Database, FileKey2, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type SourceId = "BCB_PTAX" | "BCB_SGS_11_SELIC" | "BCB_SGS_1178_SELIC_AA252" | "IBGE_IPCA" | "ANBIMA_ETTJ" | "FGV_IGPM";

export default function OfficialManualCollectionCard() {
  const [sourceId, setSourceId] = useState<SourceId>("BCB_PTAX");
  const [asOf, setAsOf] = useState("2026-08-13");
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-17");
  const [period, setPeriod] = useState("202607");
  const [fgvUrl, setFgvUrl] = useState("https://portal.fgv.br/noticias/igp-m-2026");
  const [fgvYear, setFgvYear] = useState("2026");
  const [lastResult, setLastResult] = useState<any>(null);
  const collection = trpc.marketData.collectOfficialDataset.useMutation({
    onSuccess: result => { setLastResult(result); toast.success(`${result.sourceId}: ${result.records} registro(s) preservado(s) com hash e linhagem.`); },
    onError: error => toast.error(error.message),
  });

  const isPtax = sourceId === "BCB_PTAX";
  const isSgs = sourceId === "BCB_SGS_11_SELIC" || sourceId === "BCB_SGS_1178_SELIC_AA252";
  function collect() {
    if (isPtax) collection.mutate({ sourceId, asOf });
    else if (isSgs) collection.mutate({ sourceId, startDate, endDate });
    else if (sourceId === "IBGE_IPCA") collection.mutate({ sourceId, period });
    else if (sourceId === "ANBIMA_ETTJ") collection.mutate({ sourceId });
    else collection.mutate({ sourceId, sourceUrl: fgvUrl, year: Number(fgvYear) });
  }

  const invalidInput = isPtax ? !asOf : isSgs ? !startDate || !endDate || startDate > endDate : sourceId === "IBGE_IPCA" ? !/^\d{6}$/.test(period) : sourceId === "FGV_IGPM" ? !/^https:\/\/portal\.fgv\.br\//.test(fgvUrl) || !/^\d{4}$/.test(fgvYear) : false;
  return <Card className="mt-7 rounded-2xl border-[#cce4df] bg-white shadow-[0_20px_45px_-38px_rgba(16,58,58,.35)]"><CardHeader className="border-b border-[#e8f1ef] bg-[#f6fbf9] pb-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#5f8981]">Coleta oficial sob demanda</p><CardTitle className="mt-1 text-base text-[#173c3b]">BCB, IBGE, ANBIMA e FGV</CardTitle></div><Database className="h-5 w-5 text-[#21826d]" /></div><p className="mt-3 text-xs leading-5 text-[#5d7875]">A operação baixa exclusivamente a fonte documentada, grava payload bruto, DataFrame CSV e manifesto com SHA-256 em armazenamento de objetos. Nenhum dado é persistido em banco.</p></CardHeader><CardContent className="p-5"><div className="grid gap-4 md:grid-cols-[1fr_260px_auto] md:items-end"><div><Label htmlFor="official-manual-source" className="text-xs text-[#496762]">Fonte oficial</Label><select id="official-manual-source" value={sourceId} onChange={event => setSourceId(event.target.value as SourceId)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]"><option value="BCB_PTAX">BCB — PTAX USD</option><option value="BCB_SGS_11_SELIC">BCB — SGS 11 Selic diária</option><option value="BCB_SGS_1178_SELIC_AA252">BCB — SGS 1178 Selic anualizada base 252</option><option value="IBGE_IPCA">IBGE — IPCA mensal (SIDRA 1737)</option><option value="ANBIMA_ETTJ">ANBIMA — ETTJ/Inflação implícita</option><option value="FGV_IGPM">FGV — IGP-M publicado</option></select></div><div>{isPtax ? <><Label htmlFor="official-manual-asof" className="text-xs text-[#496762]">Data-base</Label><Input id="official-manual-asof" type="date" value={asOf} onChange={event => setAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></> : isSgs ? <div className="grid gap-2 sm:grid-cols-2"><div><Label htmlFor="official-manual-sgs-start" className="text-xs text-[#496762]">Data inicial</Label><Input id="official-manual-sgs-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="official-manual-sgs-end" className="text-xs text-[#496762]">Data final</Label><Input id="official-manual-sgs-end" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div></div> : sourceId === "IBGE_IPCA" ? <><Label htmlFor="official-manual-period" className="text-xs text-[#496762]">Competência</Label><Input id="official-manual-period" inputMode="numeric" pattern="[0-9]*" value={period} onChange={event => setPeriod(event.target.value)} placeholder="AAAAMM" className="mt-1.5 border-[#d8e5e2] font-mono" /></> : sourceId === "FGV_IGPM" ? <div className="grid gap-2 sm:grid-cols-[1fr_70px]"><div><Label htmlFor="official-manual-fgv-url" className="text-xs text-[#496762]">URL oficial da publicação</Label><Input id="official-manual-fgv-url" value={fgvUrl} onChange={event => setFgvUrl(event.target.value)} className="mt-1.5 border-[#d8e5e2] text-xs" /></div><div><Label htmlFor="official-manual-fgv-year" className="text-xs text-[#496762]">Ano</Label><Input id="official-manual-fgv-year" value={fgvYear} onChange={event => setFgvYear(event.target.value)} inputMode="numeric" className="mt-1.5 border-[#d8e5e2] font-mono" /></div></div> : <p className="rounded-md border border-[#d8e5e2] bg-[#fbfdfc] px-3 py-2 text-xs leading-5 text-[#58746f]">A página pública ETTJ é coletada na data-base publicada pela ANBIMA.</p>}</div><Button onClick={collect} disabled={collection.isPending || invalidInput} className="bg-[#173c45] text-white hover:bg-[#24515a]">{collection.isPending ? <Loader2 className="animate-spin" /> : <Database />} Coletar agora</Button></div>{lastResult && <div className="mt-5 rounded-xl border border-[#c9e8df] bg-[#f0fbf7] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-1.5 text-xs font-semibold text-[#20715f]"><CheckCircle2 className="h-4 w-4" />{lastResult.sourceId} validada</p><span className="font-mono text-[10px] text-[#4c746c]">{lastResult.records} linhas · {lastResult.columns.length} colunas</span></div><p className="mt-3 break-all text-[10px] text-[#4c746c]">Fonte: {lastResult.lineage.sourceUrl}</p><p className="mt-1 break-all font-mono text-[10px] text-[#4c746c]">SHA-256 oficial: {lastResult.lineage.sourceHashSha256 ?? "não informado pela fonte"}</p><div className="mt-3 flex flex-wrap gap-3 text-[11px] font-semibold text-[#17745f]"><a href={lastResult.raw.storageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><FileKey2 className="h-3.5 w-3.5" />Payload bruto</a><a href={lastResult.csv.storageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">DataFrame CSV</a><a href={lastResult.manifest.storageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">Manifesto</a></div></div>}</CardContent></Card>;
}
