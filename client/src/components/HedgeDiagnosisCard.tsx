import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRightLeft, Loader2, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { CanonicalHedgeDataframes } from "../../../server/domain/dataframes";

type ExposureKind = "USD_PAYABLE" | "USD_RECEIVABLE" | "CDI_LINKED_DEBT" | "COMMODITY_PURCHASE" | "COMMODITY_SALE";

const kindLabels: Record<ExposureKind, string> = {
  USD_PAYABLE: "Pagamento em USD",
  USD_RECEIVABLE: "Recebimento em USD",
  CDI_LINKED_DEBT: "Dívida pós-fixada em CDI",
  COMMODITY_PURCHASE: "Compra de commodity",
  COMMODITY_SALE: "Venda de commodity",
};

const businessCasePresets: Array<{ id: string; label: string; kind: ExposureKind; description: string; commodityReference?: "BGI" | "CCM" | "SOY" | "SJC" }> = [
  { id: "usd-payable", label: "Pagamento USD", kind: "USD_PAYABLE", description: "Pagamento empresarial em USD" },
  { id: "usd-receivable", label: "Recebimento USD", kind: "USD_RECEIVABLE", description: "Recebimento empresarial em USD" },
  { id: "cdi-debt", label: "Dívida CDI", kind: "CDI_LINKED_DEBT", description: "Dívida pós-fixada indexada ao CDI" },
  { id: "bgi-purchase", label: "Compra de boi", kind: "COMMODITY_PURCHASE", description: "Compra empresarial de boi gordo", commodityReference: "BGI" },
  { id: "ccm-purchase", label: "Compra de milho", kind: "COMMODITY_PURCHASE", description: "Compra empresarial de milho", commodityReference: "CCM" },
  { id: "soy-sale", label: "Venda de soja", kind: "COMMODITY_SALE", description: "Venda empresarial de soja", commodityReference: "SOY" },
];

function statusLabel(status: "eligible_with_market_data" | "contract_required" | "blocked") {
  if (status === "eligible_with_market_data") return "Depende de dados B3";
  if (status === "contract_required") return "Exige contrato";
  return "Bloqueada";
}

/** Diagnóstico econômico; não recomenda nem precifica instrumento sem os insumos exigidos. */
export default function HedgeDiagnosisCard({ onCanonicalDataframes }: { onCanonicalDataframes?: (dataframes: CanonicalHedgeDataframes) => void }) {
  const [kind, setKind] = useState<ExposureKind>("USD_PAYABLE");
  const [description, setDescription] = useState("Pagamento de importação");
  const [notional, setNotional] = useState("2000000");
  const [maturityDate, setMaturityDate] = useState("2026-12-15");
  const [commodityReference, setCommodityReference] = useState<"BGI" | "CCM" | "SOY" | "SJC">("CCM");
  const isCommodity = kind === "COMMODITY_PURCHASE" || kind === "COMMODITY_SALE";
  const input = useMemo(() => ({
    exposureId: "diagnostico-local",
    kind,
    description,
    notional: Number(notional),
    currency: kind === "USD_PAYABLE" || kind === "USD_RECEIVABLE" ? "USD" as const : "BRL" as const,
    maturityDate,
    ...(isCommodity ? { commodityReference } : {}),
    ...(kind === "CDI_LINKED_DEBT" ? { indexer: "CDI" as const } : {}),
  }), [commodityReference, description, isCommodity, kind, maturityDate, notional]);
  const diagnosis = trpc.hedge.diagnoseAlternatives.useQuery(input, { enabled: false, retry: false });
  const canDiagnose = description.trim().length > 0 && Number.isFinite(Number(notional)) && Number(notional) > 0 && Boolean(maturityDate);
  const applyPreset = (preset: (typeof businessCasePresets)[number]) => {
    setKind(preset.kind);
    setDescription(preset.description);
    if (preset.commodityReference) setCommodityReference(preset.commodityReference);
  };
  React.useEffect(() => {
    if (diagnosis.data?.canonicalDataframes) onCanonicalDataframes?.(diagnosis.data.canonicalDataframes);
  }, [diagnosis.data, onCanonicalDataframes]);

  return <Card className="mt-7 overflow-hidden rounded-2xl border-[#bddbd5] bg-[#fbfefd] shadow-none"><CardHeader className="border-b border-[#dfece8] bg-[linear-gradient(115deg,#f0faf7,#f9fdfc)] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#328a7a]">Diagnóstico de exposição</p><CardTitle className="mt-1 text-lg text-[#17363e]">Comece pelo risco econômico, não pelo derivativo</CardTitle></div><ShieldCheck className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 max-w-3xl text-xs leading-5 text-[#607a76]">Informe a situação da empresa. O HEDGE LAB identifica a direção de risco e relaciona alternativas de mercado, mas só libera cálculo quando existirem série, preço, contrato e convenções auditáveis.</p></CardHeader><CardContent className="p-5"><div className="mb-5 rounded-xl border border-[#dceae6] bg-white p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#64817a]">Atalhos de caso empresarial</p><p className="mt-1 text-xs leading-5 text-[#607a76]">Os atalhos só definem o contexto econômico e a referência de commodity; valor/quantidade, vencimento, série, preço e contrato continuam sob declaração e evidência do usuário.</p><div className="mt-3 flex flex-wrap gap-2">{businessCasePresets.map(preset => <Button key={preset.id} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)} className="border-[#c9e2dc] bg-[#fbfefd] text-[#2f665e] hover:bg-[#eef9f5]">{preset.label}</Button>)}</div></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div><Label htmlFor="hedge-diagnosis-kind" className="text-xs">Situação econômica</Label><select id="hedge-diagnosis-kind" value={kind} onChange={event => setKind(event.target.value as ExposureKind)} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e] outline-none focus:ring-2 focus:ring-[#328a7a]">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div><div><Label htmlFor="hedge-diagnosis-description" className="text-xs">Descrição</Label><Input id="hedge-diagnosis-description" value={description} onChange={event => setDescription(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="hedge-diagnosis-notional" className="text-xs">Valor ou quantidade da exposição</Label><Input id="hedge-diagnosis-notional" inputMode="decimal" value={notional} onChange={event => setNotional(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="hedge-diagnosis-maturity" className="text-xs">Data de vencimento</Label><Input id="hedge-diagnosis-maturity" type="date" value={maturityDate} onChange={event => setMaturityDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>{isCommodity && <div><Label htmlFor="hedge-diagnosis-commodity" className="text-xs">Referência B3</Label><select id="hedge-diagnosis-commodity" value={commodityReference} onChange={event => setCommodityReference(event.target.value as "BGI" | "CCM" | "SOY" | "SJC")} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e] outline-none focus:ring-2 focus:ring-[#328a7a]"><option value="BGI">BGI — boi gordo</option><option value="CCM">CCM — milho</option><option value="SOY">SOY — soja FOB Santos</option><option value="SJC">SJC — soja referenciada no mini CME</option></select></div>}<div className="flex items-end"><Button onClick={() => diagnosis.refetch()} disabled={!canDiagnose || diagnosis.isFetching} className="w-full bg-[#173c45] text-white hover:bg-[#24515a]">{diagnosis.isFetching ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />} Diagnosticar</Button></div></div>{diagnosis.isError && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs text-[#8d6740]">Não foi possível validar a exposição informada. Nenhuma alternativa foi presumida.</p>}{diagnosis.data && <div className="mt-5 space-y-4"><div className="grid gap-3 rounded-xl border border-[#c9e8df] bg-[#f0fbf7] p-4 text-xs sm:grid-cols-3"><div><p className="text-[#4c746c]">Fator de risco</p><p className="mt-1 font-semibold text-[#20534b]">{diagnosis.data.diagnosis.riskFactor}</p></div><div><p className="text-[#4c746c]">Movimento adverso</p><p className="mt-1 font-semibold text-[#20534b]">{diagnosis.data.diagnosis.adverseMove}</p></div><div><p className="text-[#4c746c]">Impacto econômico</p><p className="mt-1 font-semibold text-[#20534b]">{diagnosis.data.diagnosis.economicImpact}</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="border-b border-[#dfece8] text-[10px] uppercase tracking-[.12em] text-[#66837d]"><tr><th className="px-3 py-3">Alternativa</th><th className="px-3 py-3">Direção</th><th className="px-3 py-3">Estado</th><th className="px-3 py-3">Dados exigidos</th></tr></thead><tbody>{diagnosis.data.alternatives.map(alternative => <tr key={alternative.kind} className="border-b border-[#edf2f0] align-top text-[#385954]"><td className="px-3 py-3 font-medium text-[#17363e]">{alternative.label}</td><td className="px-3 py-3">{alternative.hedgeDirection === "BUY" ? "Compra" : "Venda"}</td><td className="px-3 py-3"><Badge variant="outline" className={alternative.status === "eligible_with_market_data" ? "border-[#9cd6c8] bg-[#effbf7] text-[#20715f]" : "border-[#e8d1a6] bg-[#fff8ed] text-[#8d6740]"}>{statusLabel(alternative.status)}</Badge>{alternative.blockingReason && <p className="mt-1 max-w-xs text-[10px] leading-4 text-[#8d6740]">{alternative.blockingReason}</p>}</td><td className="px-3 py-3 text-[#607a76]">{alternative.requiredData.join(" · ")}</td></tr>)}</tbody></table></div></div>}</CardContent></Card>;
}
