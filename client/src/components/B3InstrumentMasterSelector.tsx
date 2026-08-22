import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import React, { useMemo, useState } from "react";

type OfficialSpecification = {
  instrumentKey: "DOL" | "WDO" | "DOL_OPTION" | "DI1" | "DI1_OPTION" | "BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC" | "BGI_OPTION" | "CCM_OPTION" | "SOY_OPTION" | "SJC_OPTION";
  kind: "B3_FX_FUTURE" | "B3_FX_OPTION" | "B3_DI_FUTURE" | "B3_DI_OPTION" | "B3_COMMODITY_FUTURE" | "B3_COMMODITY_OPTION";
  description: string;
  evidence: { sourceUrl: string | null; sourceFile: string; sourceHashSha256: string | null; capturedAtUtc: string };
};

export type B3ProductSpecificationSessionRow = {
  instrument_id: string;
  instrument_key: "DOL" | "WDO" | "DOL_OPTION" | "DI1" | "DI1_OPTION" | "BGI" | "ICF" | "CNL" | "ETH" | "CCM" | "GLD" | "SOY" | "SJC" | "BGI_OPTION" | "CCM_OPTION" | "SOY_OPTION" | "SJC_OPTION";
  product_kind: "B3_FX_FUTURE" | "B3_FX_OPTION" | "B3_DI_FUTURE" | "B3_DI_OPTION" | "B3_COMMODITY_FUTURE" | "B3_COMMODITY_OPTION";
  description: string;
  terms: Record<string, unknown>;
  source: "B3_PRODUCT_SPECIFICATION";
  evidence_source_file: string;
  evidence_source_url: string;
  evidence_sha256: string;
  evidence_captured_at_utc: string;
  validation_status: "official_specification_loaded";
  series_status: "no_b3_series_selected";
};

export default function B3InstrumentMasterSelector({ onSelected }: { onSelected?: (row: B3ProductSpecificationSessionRow) => void }) {
  const master = trpc.marketData.officialInstrumentMaster.useQuery();
  const [key, setKey] = useState<OfficialSpecification["instrumentKey"]>("DOL");
  const selected = useMemo(() => (master.data as readonly OfficialSpecification[] | undefined)?.find(item => item.instrumentKey === key), [key, master.data]);
  function add() {
    if (!selected?.evidence.sourceUrl || !selected.evidence.sourceHashSha256) return;
    onSelected?.({ instrument_id: `B3_PRODUCT_SPEC::${selected.instrumentKey}`, instrument_key: selected.instrumentKey, product_kind: selected.kind, description: selected.description, terms: selected as unknown as Record<string, unknown>, source: "B3_PRODUCT_SPECIFICATION", evidence_source_file: selected.evidence.sourceFile, evidence_source_url: selected.evidence.sourceUrl, evidence_sha256: selected.evidence.sourceHashSha256, evidence_captured_at_utc: selected.evidence.capturedAtUtc, validation_status: "official_specification_loaded", series_status: "no_b3_series_selected" });
  }
  return <Card className="mt-7 rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Produto oficial</p><CardTitle className="mt-1 text-base text-[#17363e]">Instrument Master B3</CardTitle></div><CheckCircle2 className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">A seleção preserva a especificação oficial do produto. Não seleciona uma série B3, vencimento ou preço.</p></CardHeader><CardContent className="p-5">{master.isLoading ? <p className="flex items-center gap-2 text-xs text-[#688188]"><Loader2 className="h-4 w-4 animate-spin" />Carregando evidências B3…</p> : <><Label htmlFor="b3-product" className="text-xs">Especificação oficial</Label><select id="b3-product" value={key} onChange={event => setKey(event.target.value as typeof key)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]">{(master.data as readonly OfficialSpecification[] | undefined)?.map(item => <option key={item.instrumentKey} value={item.instrumentKey}>{item.instrumentKey} — {item.description}</option>)}</select>{selected && <div className="mt-4 rounded-lg border border-[#f0d5bc] bg-[#fff8ef] p-3 text-[11px] leading-5 text-[#80552b]"><ShieldAlert className="mr-1 inline h-4 w-4" />Série contratual, vencimento, ajuste e MTM continuam bloqueados até o InstrumentReport/PriceReport B3 correspondente ser selecionado e validado.</div>}<Button onClick={add} disabled={!selected?.evidence.sourceUrl || !selected.evidence.sourceHashSha256} className="mt-4 bg-[#173c45] text-white hover:bg-[#24515a]">Adicionar especificação à sessão</Button></>}</CardContent></Card>;
}
