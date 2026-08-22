import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowRightLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import type { CanonicalHedgeDataframes } from "../../../server/domain/dataframes";

type ExposureKind = "USD_PAYABLE" | "USD_RECEIVABLE" | "CDI_LINKED_DEBT" | "COMMODITY_PURCHASE" | "COMMODITY_SALE";
type CommodityReference = "BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC";

export type GuidedExposurePublication = {
  exposureId: string;
  description: string;
  amount: number;
  currency: "USD" | "BRL";
  direction: "PAYABLE" | "RECEIVABLE";
  maturityDate: string;
  kind: ExposureKind;
  economicVariable: "USD_BRL" | "CDI_RATE" | "B3_COMMODITY_PRICE";
  unit: string;
  commodityReference: CommodityReference | null;
  indexer: "CDI" | null;
  interestSpreadPctAa: number | null;
};

const commoditySpecs: Record<CommodityReference, { label: string; unit: string; currency: "USD" | "BRL" }> = {
  BGI: { label: "Boi Gordo", unit: "ARROBA", currency: "BRL" },
  ICF: { label: "Café Arábica 4/5", unit: "SACA_60KG", currency: "USD" },
  CNL: { label: "Café Conilon Robusta", unit: "SACA_60KG", currency: "BRL" },
  ETH: { label: "Etanol Hidratado", unit: "CUBIC_METER", currency: "BRL" },
  CCM: { label: "Milho", unit: "SACA_60KG", currency: "BRL" },
  GLD: { label: "Ouro", unit: "TROY_OUNCE", currency: "USD" },
  SOY: { label: "Soja FOB Santos", unit: "METRIC_TON", currency: "USD" },
  SJC: { label: "Soja referenciada no Mini de Soja CME", unit: "SACA_60KG", currency: "USD" },
};

const commodityReferences = Object.keys(commoditySpecs) as CommodityReference[];
const presets: Array<{ id: string; label: string; kind: ExposureKind; description: string; commodityReference?: CommodityReference }> = [
  { id: "usd-payable", label: "Pagamento USD", kind: "USD_PAYABLE", description: "Pagamento de importação" },
  { id: "usd-receivable", label: "Recebimento USD", kind: "USD_RECEIVABLE", description: "Receita de exportação" },
  { id: "cdi-debt", label: "Dívida CDI", kind: "CDI_LINKED_DEBT", description: "Dívida pós-fixada indexada ao CDI" },
  ...commodityReferences.flatMap(reference => [
    { id: `${reference.toLowerCase()}-purchase`, label: `Compra de ${commoditySpecs[reference].label}`, kind: "COMMODITY_PURCHASE" as const, description: `Compra empresarial de ${commoditySpecs[reference].label}`, commodityReference: reference },
    { id: `${reference.toLowerCase()}-sale`, label: `Venda de ${commoditySpecs[reference].label}`, kind: "COMMODITY_SALE" as const, description: `Venda empresarial de ${commoditySpecs[reference].label}`, commodityReference: reference },
  ]),
];

function statusLabel(status: "eligible_with_market_data" | "contract_required" | "blocked") {
  return status === "eligible_with_market_data" ? "Depende de dados oficiais" : status === "contract_required" ? "Exige contrato" : "Bloqueada";
}

/** Cadastro econômico antes da escolha de uma estratégia ou série de derivativo. */
export default function HedgeDiagnosisCard({ onCanonicalDataframes, onRegistered }: { onCanonicalDataframes?: (dataframes: CanonicalHedgeDataframes) => void; onRegistered?: (publication: GuidedExposurePublication) => void }) {
  const [kind, setKind] = useState<ExposureKind>("USD_PAYABLE");
  const [description, setDescription] = useState("Pagamento de importação");
  const [amount, setAmount] = useState("");
  const [maturityDate, setMaturityDate] = useState("");
  const [commodityReference, setCommodityReference] = useState<CommodityReference>("CCM");
  const [unit, setUnit] = useState("USD");
  const [interestSpread, setInterestSpread] = useState("");
  const [registeredResult, setRegisteredResult] = useState<ReturnType<typeof diagnosisShape> | null>(null);
  const isCommodity = kind === "COMMODITY_PURCHASE" || kind === "COMMODITY_SALE";
  const currency = kind === "USD_PAYABLE" || kind === "USD_RECEIVABLE" ? "USD" as const : isCommodity ? commoditySpecs[commodityReference].currency : "BRL" as const;
  const economicVariable = kind === "CDI_LINKED_DEBT" ? "CDI_RATE" as const : isCommodity ? "B3_COMMODITY_PRICE" as const : "USD_BRL" as const;
  const direction = kind === "USD_RECEIVABLE" || kind === "COMMODITY_SALE" ? "RECEIVABLE" as const : "PAYABLE" as const;
  const input = useMemo(() => ({
    exposureId: crypto.randomUUID(), kind, description, notional: Number(amount.replace(",", ".")), currency, maturityDate,
    ...(isCommodity ? { commodityReference } : {}),
    ...(kind === "CDI_LINKED_DEBT" ? { indexer: "CDI" as const, interestSpreadPctAa: interestSpread.trim() ? Number(interestSpread.replace(",", ".")) : undefined } : {}),
  }), [amount, commodityReference, currency, description, interestSpread, isCommodity, kind, maturityDate]);
  const diagnosis = trpc.hedge.diagnoseAlternatives.useQuery(input, { enabled: false, retry: false });
  const canRegister = description.trim().length > 0 && Number.isFinite(input.notional) && input.notional > 0 && Boolean(maturityDate) && (!isCommodity || unit.trim().length > 0) && (kind !== "CDI_LINKED_DEBT" || !interestSpread.trim() || Number.isFinite(Number(interestSpread.replace(",", "."))));

  const applyPreset = (preset: (typeof presets)[number]) => {
    setKind(preset.kind);
    setDescription(preset.description);
    if (preset.commodityReference) {
      setCommodityReference(preset.commodityReference);
      setUnit(commoditySpecs[preset.commodityReference].unit);
      return;
    }
    setUnit(preset.kind === "CDI_LINKED_DEBT" ? "BRL" : "USD");
  };

  const registerExposure = async () => {
    const result = await diagnosis.refetch();
    const diagnosed = result?.data ?? diagnosis.data;
    if (!diagnosed) return;
    onCanonicalDataframes?.(diagnosed.canonicalDataframes);
    onRegistered?.({ exposureId: input.exposureId, description: description.trim(), amount: input.notional, currency, direction, maturityDate, kind, economicVariable, unit: isCommodity ? unit : currency, commodityReference: isCommodity ? commodityReference : null, indexer: kind === "CDI_LINKED_DEBT" ? "CDI" : null, interestSpreadPctAa: kind === "CDI_LINKED_DEBT" && interestSpread.trim() ? Number(interestSpread.replace(",", ".")) : null });
    setRegisteredResult(diagnosed);
    toast.success("Exposição econômica declarada e alternativas vinculadas à sessão.");
  };

  return <Card className="overflow-hidden rounded-2xl border-[#bddbd5] bg-white shadow-[0_20px_45px_-38px_rgba(16,58,58,.35)]">
    <CardHeader className="border-b border-[#dfece8] bg-[linear-gradient(115deg,#eef9f6,#fbfefd)] pb-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#176957]">Etapa 1 · exposição econômica</p><CardTitle className="mt-1 text-xl text-[#17363e]">O que a empresa quer proteger?</CardTitle></div><ShieldCheck className="h-5 w-5 text-[#20725f]" /></div><p className="mt-2 max-w-3xl text-sm leading-6 text-[#3f6065]">Declare primeiro a variável econômica, quantidade ou valor e horizonte. O sistema mostra possibilidades de hedge, mas não escolhe contrato, preço ou estratégia.</p></CardHeader>
    <CardContent className="p-5">
      <div className="rounded-xl border border-[#c6ddd7] bg-[#f7fcfa] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#456970]">Atalhos de negócio</p><div className="mt-3 flex flex-wrap gap-2">{presets.map(preset => <Button key={preset.id} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)} className="border-[#b8d7cf] bg-white text-[#1f6157] hover:bg-[#e9f7f2]">{preset.label}</Button>)}</div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div><Label htmlFor="guided-kind" className="font-semibold text-[#294a50]">Variável econômica</Label><select id="guided-kind" value={kind} onChange={event => setKind(event.target.value as ExposureKind)} className="mt-1.5 h-10 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]"><option value="USD_PAYABLE">USD/BRL — despesa em dólar</option><option value="USD_RECEIVABLE">USD/BRL — receita em dólar</option><option value="CDI_LINKED_DEBT">CDI — dívida pós-fixada</option><option value="COMMODITY_PURCHASE">Preço de commodity — compra</option><option value="COMMODITY_SALE">Preço de commodity — venda</option></select></div>
        <div><Label htmlFor="guided-description" className="font-semibold text-[#294a50]">Descrição do compromisso</Label><Input id="guided-description" value={description} onChange={event => setDescription(event.target.value)} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e]" /></div>
        <div><Label htmlFor="guided-amount" className="font-semibold text-[#294a50]">{isCommodity ? "Quantidade física declarada" : "Valor financeiro da exposição"}</Label><Input id="guided-amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder={isCommodity ? "Ex.: 1.000" : "Ex.: 250.000,00"} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e] placeholder:text-[#58747a]" /></div>
        {isCommodity && <><div><Label htmlFor="guided-commodity" className="font-semibold text-[#294a50]">Referência econômica</Label><select id="guided-commodity" value={commodityReference} onChange={event => { const next = event.target.value as CommodityReference; setCommodityReference(next); setUnit(commoditySpecs[next].unit); }} className="mt-1.5 h-10 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]">{commodityReferences.map(reference => <option key={reference} value={reference}>{commoditySpecs[reference].label} ({reference})</option>)}</select></div><div><Label htmlFor="guided-unit" className="font-semibold text-[#294a50]">Unidade física declarada</Label><select id="guided-unit" value={unit} onChange={event => setUnit(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]"><option value="ARROBA">Arroba</option><option value="SACA_60KG">Saca de 60 kg</option><option value="METRIC_TON">Tonelada métrica</option><option value="CUBIC_METER">Metro cúbico</option><option value="TROY_OUNCE">Onça troy</option></select><p className="mt-1 text-[11px] text-[#4d6d72]">Cotação de referência: {currency}. Nenhuma conversão automática de unidade ou moeda é aplicada.</p></div></>}
        {kind === "CDI_LINKED_DEBT" && <div><Label htmlFor="guided-spread" className="font-semibold text-[#294a50]">Spread contratual (% a.a., opcional)</Label><Input id="guided-spread" inputMode="decimal" value={interestSpread} onChange={event => setInterestSpread(event.target.value)} placeholder="Ex.: 2,00" className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e]" /></div>}
        <div><Label htmlFor="guided-maturity" className="font-semibold text-[#294a50]">Vencimento ou horizonte</Label><Input id="guided-maturity" type="date" value={maturityDate} onChange={event => setMaturityDate(event.target.value)} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e]" /></div>
        <div className="flex items-end"><Button onClick={registerExposure} disabled={!canRegister || diagnosis.isFetching} className="h-10 w-full bg-[#173c45] text-white hover:bg-[#24515a]">{diagnosis.isFetching ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />} Registrar e diagnosticar</Button></div>
      </div>
      {diagnosis.isError && <p className="mt-4 rounded-lg border border-[#e8c98e] bg-[#fff6e5] p-3 text-xs font-medium text-[#755021]">Não foi possível validar a exposição declarada. Nenhuma alternativa foi presumida.</p>}
      {registeredResult && <div className="mt-5 rounded-xl border border-[#b9dfd4] bg-[#effbf7] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#155f51]"><CheckCircle2 className="h-4 w-4" />Exposição registrada para {economicVariable}</div><div className="mt-4 grid gap-3 md:grid-cols-3"><div><p className="text-[11px] text-[#456970]">Movimento adverso</p><p className="mt-1 text-sm font-medium text-[#17363e]">{registeredResult.diagnosis.adverseMove}</p></div><div><p className="text-[11px] text-[#456970]">Impacto econômico</p><p className="mt-1 text-sm font-medium text-[#17363e]">{registeredResult.diagnosis.economicImpact}</p></div><div><p className="text-[11px] text-[#456970]">Alternativas identificadas</p><p className="mt-1 text-sm font-medium text-[#17363e]">{registeredResult.alternatives.length} alternativa(s)</p></div></div><div className="mt-4 flex flex-wrap gap-2">{registeredResult.alternatives.map(alternative => <Badge key={alternative.kind} variant="outline" className={alternative.status === "eligible_with_market_data" ? "border-[#8fcebd] bg-white text-[#155f51]" : "border-[#dfc289] bg-[#fff9ed] text-[#755021]"}>{alternative.label} · {statusLabel(alternative.status)}</Badge>)}</div></div>}
    </CardContent>
  </Card>;
}

function diagnosisShape() {
  return { diagnosis: { riskFactor: "", adverseMove: "", economicImpact: "" }, alternatives: [] as Array<{ kind: string; label: string; status: "eligible_with_market_data" | "contract_required" | "blocked" }> };
}
