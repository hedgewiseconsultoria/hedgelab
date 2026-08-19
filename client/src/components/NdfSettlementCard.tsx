import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { isStrictlyPositiveFinite, parseLocalizedNumber } from "@/lib/ndfInputValidation";
import { AlertTriangle, BadgeDollarSign, Loader2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type Lineage = { sourceAsOf: string | null; sourceHashSha256: string | null };
const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);

export type NdfSessionSnapshot = {
  scenario: { scenario_id: string; scenario_name: string; fx_shock_pct: number | null; rate_shock_bps: number | null; volatility_shock_pct: number | null; created_at_utc: string };
  calculations: Array<{ calculation_id: string; scenario_id: string; method: string; formula_version: string; calculation_status: "SUCCESS" | "BLOCKED" | "WARNING"; result: Record<string, unknown>; warnings: string[]; calculated_at_utc: string }>;
};

export default function NdfSettlementCard({ ptaxSale, ptaxLineage, ettjLineage, onSessionSnapshot }: { ptaxSale?: number; ptaxLineage?: Lineage; ettjLineage?: Lineage; onSessionSnapshot?: (snapshot: NdfSessionSnapshot | null) => void }) {
  const [contractId, setContractId] = useState("NDF-CENARIO-001");
  const [direction, setDirection] = useState<"BUY_USD" | "SELL_USD">("BUY_USD");
  const [notionalUsd, setNotionalUsd] = useState("100000");
  const [contractedRate, setContractedRate] = useState("5,2000");
  const [fixingRate, setFixingRate] = useState(() => ptaxSale ? String(ptaxSale) : "");
  const [preRate, setPreRate] = useState("14");
  const [remainingDays, setRemainingDays] = useState("1");
  const input = useMemo(() => {
    if (!ptaxLineage?.sourceAsOf || !ettjLineage?.sourceAsOf) return null;
    const parsedNotionalUsd = parseLocalizedNumber(notionalUsd);
    const parsedContractedRate = parseLocalizedNumber(contractedRate);
    const parsedFixingRate = parseLocalizedNumber(fixingRate);
    const parsedPreRate = parseLocalizedNumber(preRate);
    const parsedRemainingDays = Number(remainingDays);
    if (!contractId.trim() || !isStrictlyPositiveFinite(parsedNotionalUsd) || !isStrictlyPositiveFinite(parsedContractedRate) || !isStrictlyPositiveFinite(parsedFixingRate) || !Number.isFinite(parsedPreRate) || parsedPreRate <= -100 || !Number.isInteger(parsedRemainingDays) || parsedRemainingDays < 0) return null;
    return {
      contractId, direction, notionalUsd: parsedNotionalUsd, contractedRateBrlPerUsd: parsedContractedRate, fixingRateBrlPerUsd: parsedFixingRate,
      valuationDate: ptaxLineage.sourceAsOf, remainingBusinessDays: parsedRemainingDays, preRatePctAa252: parsedPreRate, settlementCalendar: "ANBIMA_BANKING_2026" as const,
      ptaxLineage: { sourceId: "BCB_PTAX" as const, sourceAsOf: ptaxLineage.sourceAsOf, sourceHashSha256: ptaxLineage.sourceHashSha256 },
      ettjLineage: { sourceId: "ANBIMA_ETTJ" as const, sourceAsOf: ettjLineage.sourceAsOf, sourceHashSha256: ettjLineage.sourceHashSha256 },
    };
  }, [contractId, direction, notionalUsd, contractedRate, fixingRate, preRate, remainingDays, ptaxLineage, ettjLineage]);
  const scenario = trpc.hedge.ndfSettlementScenario.useQuery(input!, { enabled: Boolean(input), retry: false });
  const scenarioId = input ? `ndf-${input.contractId}-${input.valuationDate}-${input.fixingRateBrlPerUsd}-${input.remainingBusinessDays}` : null;
  useEffect(() => {
    if (!input || !scenarioId || !scenario.data) {
      onSessionSnapshot?.(null);
      return;
    }
    const now = new Date().toISOString();
    onSessionSnapshot?.({
      scenario: { scenario_id: scenarioId, scenario_name: `Liquidação NDF — ${input.contractId}`, fx_shock_pct: ((input.fixingRateBrlPerUsd / input.contractedRateBrlPerUsd) - 1) * 100, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: now },
      calculations: [{ calculation_id: `${scenarioId}-settlement`, scenario_id: scenarioId, method: "NDF_SETTLEMENT_PV", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { contract_id: input.contractId, direction: input.direction, notional_usd: input.notionalUsd, contracted_rate_brl_per_usd: input.contractedRateBrlPerUsd, fixing_rate_brl_per_usd: input.fixingRateBrlPerUsd, gross_settlement_brl: scenario.data.grossSettlementBrl, present_value_brl: scenario.data.presentValueBrl, settlement_date: scenario.data.settlementDate, remaining_business_days: input.remainingBusinessDays, lineage: scenario.data.lineage }, warnings: scenario.data.limitations, calculated_at_utc: now }],
    });
  }, [input, onSessionSnapshot, scenario.data, scenarioId]);

  return <Card className="mt-7 rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Instrumento OTC</p><CardTitle className="mt-1 text-base text-[#17363e]">Cenário de liquidação NDF</CardTitle></div><BadgeDollarSign className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">Cálculo de liquidação com taxa de fixing ou cenário informado e desconto PRE/252. Não representa MTM.</p></CardHeader><CardContent className="p-5"><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="ndf-id" className="text-xs">Identificador do contrato</Label><Input id="ndf-id" value={contractId} onChange={event => setContractId(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="ndf-direction" className="text-xs">Posição econômica</Label><select id="ndf-direction" value={direction} onChange={event => setDirection(event.target.value as typeof direction)} className="mt-1.5 h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#29474f]"><option value="BUY_USD">Compra USD</option><option value="SELL_USD">Venda USD</option></select></div><div><Label htmlFor="ndf-notional" className="text-xs">Nocional USD</Label><Input id="ndf-notional" inputMode="decimal" value={notionalUsd} onChange={event => setNotionalUsd(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="ndf-contracted" className="text-xs">Taxa contratada (BRL/USD)</Label><Input id="ndf-contracted" inputMode="decimal" value={contractedRate} onChange={event => setContractedRate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="ndf-fixing" className="text-xs">Fixing / cenário (BRL/USD)</Label><Input id="ndf-fixing" inputMode="decimal" value={fixingRate} onChange={event => setFixingRate(event.target.value)} placeholder={ptaxSale ? String(ptaxSale) : "PTAX"} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="ndf-pre" className="text-xs">Taxa PRE (% a.a./252)</Label><Input id="ndf-pre" inputMode="decimal" value={preRate} onChange={event => setPreRate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div className="sm:col-span-2"><Label htmlFor="ndf-days" className="text-xs">Dias úteis remanescentes</Label><Input id="ndf-days" inputMode="numeric" value={remainingDays} onChange={event => setRemainingDays(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div></div>{!input && <div className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs text-[#8a5d29]">Informe PTAX e ETTJ oficiais, além de nocional, taxa contratada, <strong>fixing positivo</strong>, PRE e dias úteis válidos. A API permanece bloqueada até então.</div>}{scenario.isLoading && <div className="mt-5 flex items-center gap-2 text-xs text-[#688188]"><Loader2 className="h-4 w-4 animate-spin" />Calculando cenário com linhagem de mercado…</div>}{scenario.data && <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">Liquidação bruta</p><p className="mt-1 text-sm font-semibold text-[#24594f]">{brl(scenario.data.grossSettlementBrl)}</p></div><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">Valor presente</p><p className="mt-1 text-sm font-semibold text-[#24594f]">{brl(scenario.data.presentValueBrl)}</p></div><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">Liquidação</p><p className="mt-1 font-mono text-sm font-semibold text-[#24594f]">{scenario.data.settlementDate}</p></div></div>}{scenario.data && <div className="mt-4 flex gap-2 rounded-lg border border-[#f0d5bc] bg-[#fff8ef] p-3 text-[11px] leading-5 text-[#8d6740]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b16a26]" /><p><strong>MTM bloqueado.</strong> {scenario.data.limitations[1]} Fontes: PTAX {scenario.data.lineage.ptaxLineage.sourceAsOf}; ETTJ {scenario.data.lineage.ettjLineage.sourceAsOf}; calendário bancário ANBIMA 2026.</p></div>}</CardContent></Card>;
}
