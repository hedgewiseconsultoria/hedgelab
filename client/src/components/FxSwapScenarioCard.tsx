import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeftRight, Calculator, Loader2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import type { OtcSessionInstrumentMasterRow } from "./OtcContractMasterCard";
import type { HedgeRow, CalculationRow, ScenarioRow } from "../../../server/domain/scenarioBundle";

const BCB_SWAP_DESCRIPTION_URL = "https://www.bcb.gov.br/estabilidadefinanceira/swapcambial";
const SHA256 = /^[a-f0-9]{64}$/i;

export type FxSwapScenarioSnapshot = { scenario: ScenarioRow; calculations: CalculationRow[] };

function parseDecimal(value: string) {
  return Number(value.trim().replace(/\./g, "").replace(",", "."));
}

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

/** Cenário de fluxo de swap cambial; não usa nem declara MTM contratual. */
export default function FxSwapScenarioCard({ instrumentMasterRows, hedgeRows, onSnapshot }: { instrumentMasterRows: Array<OtcSessionInstrumentMasterRow | Record<string, unknown>>; hedgeRows: HedgeRow[]; onSnapshot?: (snapshot: FxSwapScenarioSnapshot | null) => void }) {
  const eligibleContracts = useMemo(() => instrumentMasterRows.filter((row): row is OtcSessionInstrumentMasterRow => row.kind === "OTC_FX_SWAP" && row.validation_status === "validated_user_contract" && typeof row.evidence_sha256 === "string" && hedgeRows.some(hedge => hedge.instrument_id === row.instrument_id && hedge.strategy === "SWAP_CAMBIAL_CONTRATUAL")), [hedgeRows, instrumentMasterRows]);
  const [contractId, setContractId] = useState("");
  const [position, setPosition] = useState<"RECEIVE_FX_COUPON_PAY_SELIC" | "PAY_FX_COUPON_RECEIVE_SELIC">("RECEIVE_FX_COUPON_PAY_SELIC");
  const [notionalUsd, setNotionalUsd] = useState("");
  const [initialFx, setInitialFx] = useState("");
  const [finalFx, setFinalFx] = useState("");
  const [fxCoupon, setFxCoupon] = useState("");
  const [selic, setSelic] = useState("");
  const [businessDays, setBusinessDays] = useState("");
  const [fxAsOf, setFxAsOf] = useState("");
  const [fxHash, setFxHash] = useState("");
  const [selicAsOf, setSelicAsOf] = useState("");
  const [selicHash, setSelicHash] = useState("");
  const selectedContract = eligibleContracts.find(contract => contract.instrument_id === contractId);
  const input = useMemo(() => {
    const parsedNotional = parseDecimal(notionalUsd);
    const parsedInitialFx = parseDecimal(initialFx);
    const parsedFinalFx = parseDecimal(finalFx);
    const parsedFxCoupon = parseDecimal(fxCoupon);
    const parsedSelic = parseDecimal(selic);
    const parsedBusinessDays = Number(businessDays);
    if (!selectedContract || !Number.isFinite(parsedNotional) || parsedNotional <= 0 || !Number.isFinite(parsedInitialFx) || parsedInitialFx <= 0 || !Number.isFinite(parsedFinalFx) || parsedFinalFx <= 0 || !Number.isFinite(parsedFxCoupon) || !Number.isFinite(parsedSelic) || !Number.isInteger(parsedBusinessDays) || parsedBusinessDays < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(fxAsOf) || !/^\d{4}-\d{2}-\d{2}$/.test(selicAsOf) || !SHA256.test(fxHash) || !SHA256.test(selicHash)) return null;
    return {
      contractId: selectedContract.instrument_id,
      position,
      notionalUsd: parsedNotional,
      initialFxBrlPerUsd: parsedInitialFx,
      finalFxBrlPerUsd: parsedFinalFx,
      fxCouponPctAa252: parsedFxCoupon,
      selicPctAa252: parsedSelic,
      businessDays: parsedBusinessDays,
      bcbSwapLineage: { sourceId: "BCB_FX_SWAP" as const, sourceUrl: BCB_SWAP_DESCRIPTION_URL, extractedAtUtc: new Date().toISOString() },
      fxLineage: { sourceId: "BCB_PTAX" as const, sourceAsOf: fxAsOf, sourceHashSha256: fxHash },
      domesticRateLineage: { sourceId: "BCB_SELIC" as const, sourceAsOf: selicAsOf, sourceHashSha256: selicHash },
    };
  }, [businessDays, finalFx, fxAsOf, fxCoupon, fxHash, initialFx, notionalUsd, position, selectedContract, selic, selicAsOf, selicHash]);
  const scenario = trpc.hedge.bcbTraditionalFxSwapScenario.useQuery(input!, { enabled: false, retry: false });
  const canCalculate = Boolean(input);

  useEffect(() => {
    if (!scenario.data || !input || !selectedContract) {
      onSnapshot?.(null);
      return;
    }
    const createdAtUtc = new Date().toISOString();
    const scenarioId = `swap-cambial-${input.contractId}-${input.fxLineage.sourceAsOf}-${input.domesticRateLineage.sourceAsOf}`;
    onSnapshot?.({
      scenario: { scenario_id: scenarioId, scenario_name: `Swap cambial — ${input.contractId}`, fx_shock_pct: ((input.finalFxBrlPerUsd / input.initialFxBrlPerUsd) - 1) * 100, rate_shock_bps: (input.selicPctAa252 - input.fxCouponPctAa252) * 100, volatility_shock_pct: null, created_at_utc: createdAtUtc },
      calculations: [{ calculation_id: `${scenarioId}-fluxo`, scenario_id: scenarioId, method: scenario.data.method, formula_version: "1.0.0", calculation_status: "SUCCESS", result: { contract_id: input.contractId, source_contract_sha256: selectedContract.evidence_sha256, notional_usd: input.notionalUsd, initial_fx_brl_per_usd: input.initialFxBrlPerUsd, final_fx_brl_per_usd: input.finalFxBrlPerUsd, fx_coupon_pct_aa252: input.fxCouponPctAa252, selic_pct_aa252: input.selicPctAa252, business_days: input.businessDays, net_cashflow_brl: scenario.data.netCashflowBrl, pricing_status: scenario.data.pricingStatus, lineage: { bcbSwapLineage: input.bcbSwapLineage, fxLineage: input.fxLineage, domesticRateLineage: input.domesticRateLineage } }, warnings: scenario.data.limitations, calculated_at_utc: createdAtUtc }],
    });
  }, [input, onSnapshot, scenario.data, selectedContract]);

  return <Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Câmbio · contrato OTC</p><CardTitle className="mt-1 text-base text-[#17363e]">Cenário de fluxo do swap cambial</CardTitle></div><ArrowLeftRight className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">Aplica a estrutura de fluxo descrita pelo BCB a parâmetros declarados do contrato e do cenário. Exige contrato bilateral hasheado e designação de hedge; <strong>não calcula MTM nem valor justo</strong>.</p></CardHeader><CardContent className="p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div className="xl:col-span-2"><Label htmlFor="fx-swap-contract" className="text-xs">Contrato OTC de swap cambial</Label><select id="fx-swap-contract" value={contractId} onChange={event => setContractId(event.target.value)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e]"><option value="">Selecione um contrato hasheado e designado</option>{eligibleContracts.map(contract => <option key={contract.instrument_id} value={contract.instrument_id}>{contract.instrument_id}</option>)}</select></div><div><Label htmlFor="fx-swap-position" className="text-xs">Perna recebida / paga</Label><select id="fx-swap-position" value={position} onChange={event => setPosition(event.target.value as typeof position)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e]"><option value="RECEIVE_FX_COUPON_PAY_SELIC">Recebe variação USD + cupom; paga Selic</option><option value="PAY_FX_COUPON_RECEIVE_SELIC">Paga variação USD + cupom; recebe Selic</option></select></div><div><Label htmlFor="fx-swap-notional" className="text-xs">Nocional USD contratual</Label><Input id="fx-swap-notional" inputMode="decimal" value={notionalUsd} onChange={event => setNotionalUsd(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-swap-initial" className="text-xs">FX inicial declarado (BRL/USD)</Label><Input id="fx-swap-initial" inputMode="decimal" value={initialFx} onChange={event => setInitialFx(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-swap-final" className="text-xs">FX final de cenário (BRL/USD)</Label><Input id="fx-swap-final" inputMode="decimal" value={finalFx} onChange={event => setFinalFx(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-swap-coupon" className="text-xs">Cupom cambial (% a.a./252)</Label><Input id="fx-swap-coupon" inputMode="decimal" value={fxCoupon} onChange={event => setFxCoupon(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-swap-selic" className="text-xs">Selic (% a.a./252)</Label><Input id="fx-swap-selic" inputMode="decimal" value={selic} onChange={event => setSelic(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-swap-days" className="text-xs">Dias úteis declarados</Label><Input id="fx-swap-days" inputMode="numeric" value={businessDays} onChange={event => setBusinessDays(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div className="flex items-end"><Button onClick={() => scenario.refetch()} disabled={!canCalculate || scenario.isFetching} className="w-full bg-[#173c45] text-white hover:bg-[#24515a]">{scenario.isFetching ? <Loader2 className="animate-spin" /> : <Calculator />} Calcular fluxo</Button></div><div><Label htmlFor="fx-swap-fx-asof" className="text-xs">Data-base PTAX</Label><Input id="fx-swap-fx-asof" type="date" value={fxAsOf} onChange={event => setFxAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div className="xl:col-span-2"><Label htmlFor="fx-swap-fx-hash" className="text-xs">SHA-256 do artefato PTAX</Label><Input id="fx-swap-fx-hash" value={fxHash} onChange={event => setFxHash(event.target.value)} className="mt-1.5 border-[#d8e5e2] font-mono text-xs" /></div><div><Label htmlFor="fx-swap-selic-asof" className="text-xs">Data-base Selic</Label><Input id="fx-swap-selic-asof" type="date" value={selicAsOf} onChange={event => setSelicAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div className="xl:col-span-2"><Label htmlFor="fx-swap-selic-hash" className="text-xs">SHA-256 do artefato Selic</Label><Input id="fx-swap-selic-hash" value={selicHash} onChange={event => setSelicHash(event.target.value)} className="mt-1.5 border-[#d8e5e2] font-mono text-xs" /></div></div>{eligibleContracts.length === 0 && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">Crie primeiro um Instrument Master de <strong>swap cambial</strong>, preserve o arquivo contratual com SHA-256 e vincule-o explicitamente a uma exposição USD. O cenário não escolhe contrato nem exposição por inferência.</p>}{!canCalculate && eligibleContracts.length > 0 && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">Preencha todos os parâmetros de cenário e informe data-base e SHA-256 dos artefatos oficiais PTAX e Selic. Os valores de FX, cupom, Selic e dias úteis são parâmetros declarados; nenhuma cotação é criada ou substituída.</p>}{scenario.isError && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">O cenário não foi aceito. {scenario.error.message}</p>}{scenario.data && <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#e2ebe8] bg-[#fbfdfc] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Base nocional</p><p className="mt-2 font-mono text-base font-semibold text-[#17363e]">{formatBrl(scenario.data.notionalReferenceBrl)}</p></div><div className="rounded-xl border border-[#c9e8df] bg-[#f0fbf7] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#4c746c]">Fluxo líquido</p><p className="mt-2 font-mono text-base font-semibold text-[#20715f]">{formatBrl(scenario.data.netCashflowBrl)}</p></div><div className="rounded-xl border border-[#d5e6e0] bg-white p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Status</p><p className="mt-2 text-sm font-semibold text-[#17363e]">Cenário de fluxo; não MTM</p></div></div>}<p className="mt-4 text-[10px] leading-4 text-[#71878e]">Referência institucional: <a className="font-semibold text-[#176957] underline" href={BCB_SWAP_DESCRIPTION_URL} target="_blank" rel="noreferrer">página de swap cambial do Banco Central</a>. A referência não substitui as cláusulas do contrato bilateral preservado.</p></CardContent></Card>;
}
