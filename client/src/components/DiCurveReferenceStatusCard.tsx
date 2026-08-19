import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartNoAxesCombined } from "lucide-react";
import React from "react";
import type { DiFutureCurveDataset } from "../../../server/domain/diFutureCurve";

export default function DiCurveReferenceStatusCard({ curve }: { curve: DiFutureCurveDataset | null }) {
  if (!curve) return null;
  const first = curve.dataframe[0];
  return <Card className="mt-7 rounded-2xl border-[#c9e8df] bg-[#f4fcf8] shadow-none" data-testid="di-curve-reference-status">
    <CardHeader className="border-b border-[#dceee7] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#487b70]">Juros · referência conectada</p><CardTitle className="mt-1 text-base text-[#17363e]">Vértices DI1 disponíveis para conferência do ajuste</CardTitle></div><ChartNoAxesCombined className="h-5 w-5 text-[#238b76]" /></div></CardHeader>
    <CardContent className="p-5"><div className="flex flex-wrap gap-2"><Badge variant="outline" className="border-[#bde6db] bg-white text-[#236d5d]">{curve.status}</Badge><Badge variant="outline" className="border-[#d2e8e1] bg-white text-[#426b63]">{curve.dataframe.length} vértice(s)</Badge><Badge variant="outline" className="border-[#d2e8e1] bg-white text-[#426b63]">data-base {curve.asof ?? "indisponível"}</Badge></div><p className="mt-3 text-xs leading-5 text-[#52756e]">A referência B3 foi recebida pelo fluxo DI1 para reconciliação de data-base, calendário e linhagem. O ajuste diário continua exigindo PU e evidências próprios; nenhum vértice é transformado em preço, taxa de correção, MTM, DV01, FRA ou curva interpolada.</p>{first && <p className="mt-3 break-all font-mono text-[10px] text-[#587a73]">Primeiro vértice: {first.symbol} · vencimento {first.maturity} · {first.source_file} · {first.source_hash_sha256 ?? "sem hash"}</p>}</CardContent>
  </Card>;
}
