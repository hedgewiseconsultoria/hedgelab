import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, FileUp, Loader2, ShieldCheck } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";

type Evidence = { sourceId: "USER_CONTRACT"; sourceUrl: string | null; sourceFile: string; sourceHashSha256: string; capturedAtUtc: string; storageKey: string };
type OtcKind = "OTC_NDF" | "OTC_FX_SWAP" | "OTC_RATE_SWAP";

export type OtcSessionInstrumentMasterRow = {
  instrument_id: string;
  kind: OtcKind;
  base_currency: "USD" | "BRL";
  quote_currency: "USD" | "BRL";
  notional_base_currency: number;
  trade_date: string;
  maturity: string;
  settlement_convention: string;
  terms: Record<string, unknown>;
  source: "USER_CONTRACT";
  evidence_source_file: string;
  evidence_source_url: string | null;
  evidence_sha256: string;
  evidence_captured_at_utc: string;
  validation_status: "validated_user_contract";
};

export type OtcHedgeSessionRow = {
  hedge_id: string;
  exposure_id: string;
  instrument_id: string;
  strategy: string;
  quantity: number;
  trade_date: string;
  maturity: string;
  method_version: string;
};

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo contratual."));
    reader.onload = () => resolve(String(reader.result).split(",").at(-1) ?? "");
    reader.readAsDataURL(file);
  });
}

export default function OtcContractMasterCard({ onMasterCreated, exposures, onHedgeCreated }: { onMasterCreated?: (master: OtcSessionInstrumentMasterRow) => void; exposures?: Array<{ exposure_id: string; description: string }>; onHedgeCreated?: (hedge: OtcHedgeSessionRow) => void }) {
  const [kind, setKind] = useState<OtcKind>("OTC_NDF");
  const [instrumentId, setInstrumentId] = useState("NDF-001");
  const [notional, setNotional] = useState("100000");
  const [tradeDate, setTradeDate] = useState("2026-08-13");
  const [maturityDate, setMaturityDate] = useState("2026-09-14");
  const [settlementConvention, setSettlementConvention] = useState("Liquidação financeira D+1 conforme contrato");
  const [forwardRate, setForwardRate] = useState("");
  const [fixingDate, setFixingDate] = useState("");
  const [settlementDate, setSettlementDate] = useState("");
  const [domesticLegIndex, setDomesticLegIndex] = useState("");
  const [foreignLegIndex, setForeignLegIndex] = useState("");
  const [swapStartDate, setSwapStartDate] = useState("");
  const [swapEndDate, setSwapEndDate] = useState("");
  const [ratePayerLeg, setRatePayerLeg] = useState<"PAY_FIXED_RECEIVE_FLOATING" | "RECEIVE_FIXED_PAY_FLOATING">("PAY_FIXED_RECEIVE_FLOATING");
  const [floatingLegIndex, setFloatingLegIndex] = useState("");
  const [fixedLegConvention, setFixedLegConvention] = useState("");
  const [paymentSchedule, setPaymentSchedule] = useState("");
  const [rateStartDate, setRateStartDate] = useState("");
  const [rateEndDate, setRateEndDate] = useState("");
  const [hedgedExposureId, setHedgedExposureId] = useState("");
  const [evidence, setEvidence] = useState<Evidence | null>(null);
  const persistEvidence = trpc.hedge.persistOtcContractEvidence.useMutation({ onError: error => toast.error(error.message), onSuccess: result => { setEvidence(result); toast.success("Contrato preservado com hash SHA-256."); } });
  const createMaster = trpc.hedge.createOtcInstrumentMaster.useMutation({ onError: error => toast.error(error.message), onSuccess: result => {
    if (!result.evidence.sourceHashSha256) { toast.error("A API não retornou o hash do contrato validado."); return; }
    onMasterCreated?.({ instrument_id: result.instrumentId, kind: result.kind, base_currency: result.baseCurrency as "USD" | "BRL", quote_currency: result.quoteCurrency as "USD" | "BRL", notional_base_currency: result.notionalBaseCurrency, trade_date: result.tradeDate, maturity: result.maturityDate, settlement_convention: result.settlementConvention, terms: result.terms, source: "USER_CONTRACT", evidence_source_file: result.evidence.sourceFile, evidence_source_url: result.evidence.sourceUrl, evidence_sha256: result.evidence.sourceHashSha256, evidence_captured_at_utc: result.evidence.capturedAtUtc, validation_status: result.validationStatus });
    if (hedgedExposureId) onHedgeCreated?.({ hedge_id: crypto.randomUUID(), exposure_id: hedgedExposureId, instrument_id: result.instrumentId, strategy: result.kind === "OTC_NDF" ? "NDF_CONTRATUAL" : result.kind === "OTC_FX_SWAP" ? "SWAP_CAMBIAL_CONTRATUAL" : "SWAP_TAXA_CONTRATUAL", quantity: 1, trade_date: result.tradeDate, maturity: result.maturityDate, method_version: "otc-contract-master-v1" });
    toast.success("Instrument Master OTC validado para a sessão.");
  } });

  async function uploadContract(file?: File) {
    if (!file) return;
    if (file.size > 10_000_000) { toast.error("O contrato deve ter no máximo 10 MB nesta versão."); return; }
    try { persistEvidence.mutate({ fileName: file.name, contentBase64: await fileToBase64(file), contentType: file.type || "application/octet-stream" }); } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao preparar contrato."); }
  }

  function create() {
    if (!evidence) { toast.error("Preserve primeiro o arquivo contratual com hash."); return; }
    const common = { instrumentId, baseCurrency: kind === "OTC_RATE_SWAP" ? "BRL" as const : "USD" as const, quoteCurrency: kind === "OTC_RATE_SWAP" ? "BRL" as const : "BRL" as const, notionalBaseCurrency: Number(notional.replace(",", ".")), tradeDate, maturityDate, settlementConvention, evidence };
    if (kind === "OTC_NDF") createMaster.mutate({ ...common, kind, terms: { kind, forwardRateBrlPerUsd: Number(forwardRate.replace(",", ".")), fixingDate, settlementDate } });
    else if (kind === "OTC_FX_SWAP") createMaster.mutate({ ...common, kind, terms: { kind, domesticLegIndex, foreignLegIndex, startDate: swapStartDate, endDate: swapEndDate } });
    else createMaster.mutate({ ...common, kind, terms: { kind, payerLeg: ratePayerLeg, floatingLegIndex, fixedLegConvention, paymentSchedule, startDate: rateStartDate, endDate: rateEndDate } });
  }

  const notionalLabel = kind === "OTC_RATE_SWAP" ? "Nocional contratual em BRL" : "Nocional em USD";
  return <Card className="mt-7 rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Contrato bilateral</p><CardTitle className="mt-1 text-base text-[#17363e]">Instrument Master OTC</CardTitle></div><ShieldCheck className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">NDF, swap cambial e swap de taxa só são admitidos após preservar o contrato com hash. Taxas, índices, calendário e cláusulas permanecem declarados; nenhum termo é preenchido por presunção.</p></CardHeader><CardContent className="p-5"><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="otc-kind" className="text-xs">Tipo</Label><select id="otc-kind" value={kind} onChange={event => setKind(event.target.value as OtcKind)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]"><option value="OTC_NDF">NDF cambial</option><option value="OTC_FX_SWAP">Swap cambial</option><option value="OTC_RATE_SWAP">Swap de taxa bilateral</option></select></div><div><Label htmlFor="otc-id" className="text-xs">Identificador</Label><Input id="otc-id" value={instrumentId} onChange={event => setInstrumentId(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="otc-notional" className="text-xs">{notionalLabel}</Label><Input id="otc-notional" inputMode="decimal" value={notional} onChange={event => setNotional(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="otc-trade-date" className="text-xs">Data de contratação</Label><Input id="otc-trade-date" type="date" value={tradeDate} onChange={event => setTradeDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="otc-maturity" className="text-xs">Vencimento</Label><Input id="otc-maturity" type="date" value={maturityDate} onChange={event => setMaturityDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="otc-settlement" className="text-xs">Convenção declarada</Label><Input id="otc-settlement" value={settlementConvention} onChange={event => setSettlementConvention(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div className="sm:col-span-2"><Label htmlFor="otc-hedged-exposure" className="text-xs">Exposição vinculada (opcional)</Label><select id="otc-hedged-exposure" value={hedgedExposureId} onChange={event => setHedgedExposureId(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]"><option value="">Não criar designação de hedge</option>{(exposures ?? []).map(exposure => <option key={exposure.exposure_id} value={exposure.exposure_id}>{exposure.description}</option>)}</select><p className="mt-1 text-[10px] text-[#7b9195]">A linha de hedge só é criada quando uma exposição for selecionada explicitamente.</p></div>{kind === "OTC_NDF" ? <><div><Label htmlFor="ndf-forward" className="text-xs">Taxa a termo declarada (BRL/USD)</Label><Input id="ndf-forward" inputMode="decimal" value={forwardRate} onChange={event => setForwardRate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="ndf-fixing-date" className="text-xs">Data de fixing</Label><Input id="ndf-fixing-date" type="date" value={fixingDate} onChange={event => setFixingDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="ndf-settlement-date" className="text-xs">Data de liquidação</Label><Input id="ndf-settlement-date" type="date" value={settlementDate} onChange={event => setSettlementDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div></> : kind === "OTC_FX_SWAP" ? <><div><Label htmlFor="swap-domestic" className="text-xs">Indexador da perna doméstica</Label><Input id="swap-domestic" value={domesticLegIndex} onChange={event => setDomesticLegIndex(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="swap-foreign" className="text-xs">Indexador da perna estrangeira</Label><Input id="swap-foreign" value={foreignLegIndex} onChange={event => setForeignLegIndex(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="swap-start" className="text-xs">Início das pernas</Label><Input id="swap-start" type="date" value={swapStartDate} onChange={event => setSwapStartDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="swap-end" className="text-xs">Fim das pernas</Label><Input id="swap-end" type="date" value={swapEndDate} onChange={event => setSwapEndDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div></> : <><div><Label htmlFor="rate-payer-leg" className="text-xs">Posição declarada nas pernas</Label><select id="rate-payer-leg" value={ratePayerLeg} onChange={event => setRatePayerLeg(event.target.value as typeof ratePayerLeg)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]"><option value="PAY_FIXED_RECEIVE_FLOATING">Paga fixa; recebe flutuante</option><option value="RECEIVE_FIXED_PAY_FLOATING">Recebe fixa; paga flutuante</option></select></div><div><Label htmlFor="rate-floating-index" className="text-xs">Indexador da perna flutuante</Label><Input id="rate-floating-index" value={floatingLegIndex} onChange={event => setFloatingLegIndex(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="rate-fixed-convention" className="text-xs">Convenção da perna fixa</Label><Input id="rate-fixed-convention" value={fixedLegConvention} onChange={event => setFixedLegConvention(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="rate-payment-schedule" className="text-xs">Calendário de pagamentos</Label><Input id="rate-payment-schedule" value={paymentSchedule} onChange={event => setPaymentSchedule(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="rate-start" className="text-xs">Início das pernas</Label><Input id="rate-start" type="date" value={rateStartDate} onChange={event => setRateStartDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="rate-end" className="text-xs">Fim das pernas</Label><Input id="rate-end" type="date" value={rateEndDate} onChange={event => setRateEndDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><p className="sm:col-span-2 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">Este cadastro registra somente a referência contratual do swap de taxa. Precificação, MTM, curva, taxa over, DV01, valor justo e resultado financeiro continuam bloqueados.</p></>}<div className="sm:col-span-2"><Label htmlFor="otc-contract" className="text-xs">Arquivo contratual</Label><Input id="otc-contract" type="file" accept=".pdf,.txt,.md,.doc,.docx" onChange={event => uploadContract(event.target.files?.[0])} disabled={persistEvidence.isPending} className="mt-1.5 border-[#d8e5e2] file:mr-3 file:border-0 file:bg-[#effbf7] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-[#176957]" /></div></div>{persistEvidence.isPending && <p className="mt-4 flex items-center gap-2 text-xs text-[#688188]"><Loader2 className="h-4 w-4 animate-spin" />Preservando contrato e calculando hash…</p>}{evidence && <div className="mt-4 rounded-lg border border-[#cce4df] bg-[#f1fbf7] p-3 text-[11px] text-[#436d63]"><p className="flex items-center gap-1.5 font-semibold text-[#20715f]"><CheckCircle2 className="h-3.5 w-3.5" />Evidência validada</p><p className="mt-1 break-all font-mono">{evidence.sourceFile} • SHA-256 {evidence.sourceHashSha256}</p><a href={evidence.sourceUrl ?? undefined} target="_blank" rel="noreferrer" className="mt-1 inline-block font-semibold text-[#17745f] underline">Abrir objeto preservado</a></div>}<Button onClick={create} disabled={!evidence || createMaster.isPending} className="mt-5 bg-[#173c45] text-white hover:bg-[#24515a]">{createMaster.isPending ? <Loader2 className="animate-spin" /> : <FileUp />} Criar Instrument Master</Button></CardContent></Card>;
}
