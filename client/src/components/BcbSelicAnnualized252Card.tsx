import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Database, Loader2 } from "lucide-react";
import React, { useState } from "react";

/** Consulta direta da SGS 1178; não deriva a taxa anualizada da SGS 11. */
export default function BcbSelicAnnualized252Card() {
  const [startDate, setStartDate] = useState("2026-08-01");
  const [endDate, setEndDate] = useState("2026-08-17");
  const selic = trpc.marketData.bcbSelicAnnualized252.useQuery({ startDate, endDate }, { enabled: false, retry: false });
  const last = selic.data?.dataframe.at(-1);

  return <Card className="mt-7 rounded-2xl border-[#dce8e5] bg-white shadow-none"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Fonte oficial BCB</p><CardTitle className="mt-1 text-base text-[#17363e]">Série SGS 1178 — Selic anualizada base 252</CardTitle></div><Database className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">Consulta direta da série anualizada publicada pelo BCB, em percentual ao ano. O cartão não calcula nem substitui valores a partir da série SGS 11.</p></CardHeader><CardContent className="p-5"><div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><div><Label htmlFor="sgs-1178-start" className="text-xs">Data inicial</Label><Input id="sgs-1178-start" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="sgs-1178-end" className="text-xs">Data final</Label><Input id="sgs-1178-end" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><Button onClick={() => selic.refetch()} disabled={selic.isFetching || !startDate || !endDate || startDate > endDate} className="bg-[#173c45] text-white hover:bg-[#24515a]">{selic.isFetching ? <Loader2 className="animate-spin" /> : <Database />} Consultar</Button></div>{selic.isError && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs text-[#8d6740]">A série anualizada não pôde ser recuperada para o período informado. Nenhuma taxa foi calculada como substituta.</p>}{last && <div className="mt-4 rounded-xl border border-[#c9e8df] bg-[#f0fbf7] p-4 text-xs"><p className="font-semibold text-[#20715f]">Última observação retornada: {last.asOf}</p><p className="mt-1 font-mono text-lg font-semibold text-[#20534b]">{new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 6 }).format(last.valuePct)}% a.a.</p><p className="mt-2 break-all text-[10px] text-[#4c746c]">Série {last.seriesCode} · hash {selic.data?.lineage.sourceHashSha256}</p></div>}</CardContent></Card>;
}
