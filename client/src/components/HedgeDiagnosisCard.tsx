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
type CommodityReference = "BGI" | "CCM" | "SOY" | "SJC";

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

const kindLabels: Record<ExposureKind, string> = {
  USD_PAYABLE: "Despesa ou pagamento em dólar",
  USD_RECEIVABLE: "Receita ou recebimento em dólar",
  CDI_LINKED_DEBT: "Dívida pós-fixada em CDI",
  COMMODITY_PURCHASE: "Compra de commodity",
  COMMODITY_SALE: "Venda de commodity",
};

const presets: Array<{ id: string; label: string; kind: ExposureKind; description: string; commodityReference?: CommodityReference }> = [
  { id: "usd-payable", label: "Pagamento USD", kind: "USD_PAYABLE", description: "Pagamento de importação" },
  { id: "usd-receivable", label: "Recebimento USD", kind: "USD_RECEIVABLE", description: "Receita de exportação" },
  { id: "cdi-debt", label: "Dívida CDI", kind: "CDI_LINKED_DEBT", description: "Dívida pós-fixada indexada ao CDI" },
  { id: "bgi-purchase", label: "Compra de boi", kind: "COMMODITY_PURCHASE", description: "Compra empresarial de boi gordo", commodityReference: "BGI" },
  { id: "ccm-purchase", label: "Compra de milho", kind: "COMMODITY_PURCHASE", description: "Compra empresarial de milho", commodityReference: "CCM" },
  { id: "soy-sale", label: "Venda de soja", kind: "COMMODITY_SALE", description: "Venda empresarial de soja", commodityReference: "SOY" },
];

function statusLabel(status: "eligible_with_market_data" | "contract_required" | "blocked") {
  if (status === "eligible_with_market_data") return "Depende de dados oficiais";
  if (status === "contract_required") return "Exige contrato";
  return "Bloqueada";
}

/** Cadastro guiado: o usuário declara o risco econômico antes de selecionar derivativos. */
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
  const currency = kind === "USD_PAYABLE" || kind === "USD_RECEIVABLE" ? "USD" as const : "BRL" as const;
  const economicVariable = kind === "CDI_LINKED_DEBT" ? "CDI_RATE" as const : isCommodity ? "B3_COMMODITY_PRICE" as const : "USD_BRL" as const;
  const direction = kind === "USD_RECEIVABLE" || kind === "COMMODITY_SALE" ? "RECEIVABLE" as const : "PAYABLE" as const;
  const amountLabel = isCommodity ? "Quantidade física declarada" : "Valor financeiro da exposição";
  const input = useMemo(() => ({
    exposureId: crypto.randomUUID(),
    kind,
    description,
    notional: Number(amount.replace(",", ".")),
    currency,
    maturityDate,
    ...(isCommodity ? { commodityReference } : {}),
    ...(kind === "CDI_LINKED_DEBT" ? { indexer: "CDI" as const, interestSpreadPctAa: interestSpread.trim() ? Number(interestSpread.replace(",", ".")) : undefined } : {}),
  }), [amount, commodityReference, currency, description, interestSpread, isCommodity, kind, maturityDate]);
  const diagnosis = trpc.hedge.diagnoseAlternatives.useQuery(input, { enabled: false, retry: false });
  const canRegister = description.trim().length > 0 && Number.isFinite(input.notional) && input.notional > 0 && Boolean(maturityDate) && (!isCommodity || unit.trim().length > 0) && (kind !== "CDI_LINKED_DEBT" || !interestSpread.trim() || Number.isFinite(Number(interestSpread.replace(",", "."))));

  const applyPreset = (preset: (typeof presets)[number]) => {
    setKind(preset.kind);
    setDescription(preset.description);
    if (preset.commodityReference) setCommodityReference(preset.commodityReference);
    setUnit(preset.kind === "COMMODITY_PURCHASE" || preset.kind === "COMMODITY_SALE" ? "SACA_60KG" : preset.kind === "CDI_LINKED_DEBT" ? "BRL" : "USD");
  };

  const registerExposure = async () => {
    const result = await diagnosis.refetch();
    const diagnosed = result?.data ?? diagnosis.data;
    if (!diagnosed) return;
    onCanonicalDataframes?.(diagnosed.canonicalDataframes);
    const published: GuidedExposurePublication = {
      exposureId: input.exposureId, description: description.trim(), amount: input.notional, currency, direction, maturityDate, kind, economicVariable, unit: isCommodity ? unit : currency,
      commodityReference: isCommodity ? commodityReference : null, indexer: kind === "CDI_LINKED_DEBT" ? "CDI" : null,
      interestSpreadPctAa: kind === "CDI_LINKED_DEBT" && interestSpread.trim() ? Number(interestSpread.replace(",", ".")) : null,
    };
    onRegistered?.(published);
    setRegisteredResult(diagnosed);
    toast.success("Exposição econômica declarada e alternativas vinculadas à sessão.");
  };

  return <Card className="overflow-hidden rounded-2xl border-[#bddbd5] bg-white shadow-[0_20px_45px_-38px_rgba(16,58,58,.35)]"><CardHeader className="border-b border-[#dfece8] bg-[linear-gradient(115deg,#eef9f6,#fbfefd)] pb-5"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#176957]">Etapa 2 · exposição econômica</p><CardTitle className="mt-1 text-xl text-[#17363e]">O que a empresa quer proteger?</CardTitle></div><ShieldCheck className="h-5 w-5 text-[#20725f]" /></div><p className="mt-2 max-w-3xl text-sm leading-6 text-[#3f6065]">Declare primeiro a variável econômica, o valor ou a quantidade e o vencimento. O aplicativo identifica a direção do risco e apresenta alternativas; não escolhe contrato, preço ou estratégia por você.</p></CardHeader><CardContent className="p-5"><div className="rounded-xl border border-[#c6ddd7] bg-[#f7fcfa] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#456970]">Atalhos de negócio</p><div className="mt-3 flex flex-wrap gap-2">{presets.map(preset => <Button key={preset.id} type="button" variant="outline" size="sm" onClick={() => applyPreset(preset)} className="border-[#b8d7cf] bg-white text-[#1f6157] hover:bg-[#e9f7f2]">{preset.label}</Button>)}</div></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3"><div><Label htmlFor="guided-kind" className="font-semibold text-[#294a50]">Variável econômica</Label><select id="guided-kind" value={kind} onChange={event => setKind(event.target.value as ExposureKind)} className="mt-1.5 h-10 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]"><option value="USD_PAYABLE">USD/BRL — despesa em dólar</option><option value="USD_RECEIVABLE">USD/BRL — receita em dólar</option><option value="CDI_LINKED_DEBT">CDI — dívida pós-fixada</option><option value="COMMODITY_PURCHASE">Preço de commodity — compra</option><option value="COMMODITY_SALE">Preço de commodity — venda</option></select><p className="mt-1 text-[11px] text-[#4d6d72]">{kindLabels[kind]}</p></div><div><Label htmlFor="guided-description" className="font-semibold text-[#294a50]">Descrição do compromisso</Label><Input id="guided-description" value={description} onChange={event => setDescription(event.target.value)} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e]" /></div><div><Label htmlFor="guided-amount" className="font-semibold text-[#294a50]">{amountLabel}</Label><Input id="guided-amount" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} placeholder={isCommodity ? "Ex.: 1.000" : "Ex.: 250.000,00"} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e] placeholder:text-[#58747a]" /></div>{isCommodity && <><div><Label htmlFor="guided-commodity" className="font-semibold text-[#294a50]">Referência econômica</Label><select id="guided-commodity" value={commodityReference} onChange={event => setCommodityReference(event.target.value as CommodityReference)} className="mt-1.5 h-10 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]"><option value="BGI">Boi gordo (BGI)</option><option value="CCM">Milho (CCM)</option><option value="SOY">Soja FOB Santos (SOY)</option><option value="SJC">Soja mini CME (SJC)</option></select></div><div><Label htmlFor="guided-unit" className="font-semibold text-[#294a50]">Unidade física declarada</Label><select id="guided-unit" value={unit} onChange={event => setUnit(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#9fbbb5] bg-white px-3 text-sm font-medium text-[#17363e]"><option value="ARROBA">Arroba</option><option value="SACA_60KG">Saca de 60 kg</option><option value="METRIC_TON">Tonelada métrica</option></select></div></>}{kind === "CDI_LINKED_DEBT" && <div><Label htmlFor="guided-spread" className="font-semibold text-[#294a50]">Spread contratual (% a.a., opcional)</Label><Input id="guided-spread" inputMode="decimal" value={interestSpread} onChange={event => setInterestSpread(event.target.value)} placeholder="Ex.: 2,00" className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e] placeholder:text-[#58747a]" /><p className="mt-1 text-[11px] text-[#4d6d72]">O indexador CDI é declarado explicitamente; o spread não cria MTM ou curva.</p></div>}<div><Label htmlFor="guided-maturity" className="font-semibold text-[#294a50]">Vencimento ou horizonte</Label><Input id="guided-maturity" type="date" value={maturityDate} onChange={event => setMaturityDate(event.target.value)} className="mt-1.5 border-[#9fbbb5] bg-white text-[#17363e]" /></div><div className="flex items-end"><Button onClick={registerExposure} disabled={!canRegister || diagnosis.isFetching} className="h-10 w-full bg-[#173c45] text-white hover:bg-[#24515a]">{diagnosis.isFetching ? <Loader2 className="animate-spin" /> : <ArrowRightLeft />} Registrar e diagnosticar</Button></div></div>{diagnosis.isError && <p className="mt-4 rounded-lg border border-[#e8c98e] bg-[#fff6e5] p-3 text-xs font-medium text-[#755021]">Não foi possível validar a exposição declarada. Nenhuma alternativa foi presumida.</p>}{registeredResult && <div className="mt-5 rounded-xl border border-[#b9dfd4] bg-[#effbf7] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#155f51]"><CheckCircle2 className="h-4 w-4" />Exposição registrada para {economicVariable}</div><div className="mt-4 grid gap-3 md:grid-cols-3"><div><p className="text-[11px] text-[#456970]">Movimento adverso</p><p className="mt-1 text-sm font-medium text-[#17363e]">{registeredResult.diagnosis.adverseMove}</p></div><div><p className="text-[11px] text-[#456970]">Impacto econômico</p><p className="mt-1 text-sm font-medium text-[#17363e]">{registeredResult.diagnosis.economicImpact}</p></div><div><p className="text-[11px] text-[#456970]">Alternativas identificadas</p><p className="mt-1 text-sm font-medium text-[#17363e]">{registeredResult.alternatives.length} alternativa(s)</p></div></div><div className="mt-4 flex flex-wrap gap-2">{registeredResult.alternatives.map(alternative => <Badge key={alternative.kind} variant="outline" className={alternative.status === "eligible_with_market_data" ? "border-[#8fcebd] bg-white text-[#155f51]" : "border-[#dfc289] bg-[#fff9ed] text-[#755021]"}>{alternative.label} · {statusLabel(alternative.status)}</Badge>)}</div></div>}</CardContent></Card>;
}

function diagnosisShape() {
  return { diagnosis: { riskFactor: "", adverseMove: "", economicImpact: "" }, alternatives: [] as Array<{ kind: string; label: string; status: "eligible_with_market_data" | "contract_required" | "blocked" }> };
}
