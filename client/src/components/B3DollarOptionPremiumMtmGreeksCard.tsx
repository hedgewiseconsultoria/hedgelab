import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Calculator, Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { CalculationRow, ScenarioRow } from "../../../server/domain/scenarioBundle";

const SHA256 = /^[a-f0-9]{64}$/;
export type B3DollarOptionPremiumMtmGreeksSnapshot = { scenario: ScenarioRow; calculations: CalculationRow[] };

function formatBrl(value: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value); }
function formatPct(value: number) { return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(value); }
function formatNumber(value: number, digits = 6) { return value.toLocaleString("pt-BR", { maximumFractionDigits: digits }); }

/**
 * Prêmio, MTM diário e Greeks (Black-76, aproximação europeia) de opção DOL a partir de
 * prêmios de liquidação B3 REAIS — nunca estima volatilidade nem taxa; ambas exigem fonte
 * validada com linhagem própria.
 */
export default function B3DollarOptionPremiumMtmGreeksCard({ onSnapshot }: { onSnapshot?: (snapshot: B3DollarOptionPremiumMtmGreeksSnapshot) => void }) {
  const [optionPosition, setOptionPosition] = useState<"LONG" | "SHORT">("LONG");
  const [optionType, setOptionType] = useState<"CALL" | "PUT">("CALL");
  const [contracts, setContracts] = useState("1");
  const [strike, setStrike] = useState("");
  const [underlyingSettlement, setUnderlyingSettlement] = useState("");
  const [underlyingSymbol, setUnderlyingSymbol] = useState("DOL");
  const [optionSeriesSymbol, setOptionSeriesSymbol] = useState("");
  const [observedPremium, setObservedPremium] = useState("");
  const [previousPremium, setPreviousPremium] = useState("");
  const [valuationDate, setValuationDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [calendarId, setCalendarId] = useState<"B3_TRADING_2026" | "ANBIMA_BANKING_2026">("B3_TRADING_2026");
  const [riskFreeRatePct, setRiskFreeRatePct] = useState("");
  const [rateSourceId, setRateSourceId] = useState<"B3_DI1_CURVE" | "BCB_SELIC">("B3_DI1_CURVE");
  const [rateAsOf, setRateAsOf] = useState("");
  const [premiumFile, setPremiumFile] = useState("");
  const [premiumHash, setPremiumHash] = useState("");
  const [previousPremiumFile, setPreviousPremiumFile] = useState("");
  const [previousPremiumHash, setPreviousPremiumHash] = useState("");

  const hasPreviousPremium = previousPremium.trim().length > 0;

  const input = useMemo(() => ({
    optionPosition, optionType, contracts: Number(contracts),
    strike: Number(strike), underlyingSettlement: Number(underlyingSettlement),
    observedOptionPremium: Number(observedPremium),
    previousOptionPremium: hasPreviousPremium ? Number(previousPremium) : undefined,
    valuationDate, expiryDate, calendarId,
    riskFreeRateAnnual: Number(riskFreeRatePct) / 100,
    underlyingSymbol, optionSeriesSymbol,
    premiumLineage: { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: valuationDate, sourceFile: premiumFile, sourceHashSha256: premiumHash },
    previousPremiumLineage: hasPreviousPremium ? { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: "", sourceFile: previousPremiumFile, sourceHashSha256: previousPremiumHash } : undefined,
    rateLineage: { sourceId: rateSourceId, sourceAsOf: rateAsOf, sourceHashSha256: null },
  }), [optionPosition, optionType, contracts, strike, underlyingSettlement, observedPremium, hasPreviousPremium, previousPremium, valuationDate, expiryDate, calendarId, riskFreeRatePct, underlyingSymbol, optionSeriesSymbol, premiumFile, premiumHash, previousPremiumFile, previousPremiumHash, rateSourceId, rateAsOf]);

  const calculation = trpc.hedge.b3DollarOptionPremiumMtmGreeks.useQuery(input, { enabled: false, retry: false });

  const canCalculate = Number.isInteger(input.contracts) && input.contracts > 0
    && input.strike > 0 && input.underlyingSettlement > 0 && input.observedOptionPremium >= 0
    && Number.isFinite(input.riskFreeRateAnnual) && Boolean(underlyingSymbol.trim() && optionSeriesSymbol.trim())
    && Boolean(valuationDate && expiryDate && rateAsOf)
    && SHA256.test(premiumHash) && Boolean(premiumFile.trim())
    && (!hasPreviousPremium || (SHA256.test(previousPremiumHash) && Boolean(previousPremiumFile.trim())));

  React.useEffect(() => {
    if (!calculation.data || !onSnapshot) return;
    const createdAtUtc = new Date().toISOString();
    const scenarioId = `opcao-dol-premium-greeks-${valuationDate}`;
    onSnapshot({
      scenario: { scenario_id: scenarioId, scenario_name: "Prêmio, MTM e Greeks de opção DOL (Black-76 aprox.)", fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: createdAtUtc },
      calculations: [{
        calculation_id: `b3-dol-option-premium-greeks-${valuationDate}`, scenario_id: scenarioId, method: calculation.data.method, formula_version: calculation.data.formulaVersion,
        calculation_status: "SUCCESS", result: calculation.data,
        warnings: [calculation.data.modelCaveat, "Bloqueado: prêmio de exercício antecipado e replicação do modelo binomial oficial da B3."],
        calculated_at_utc: createdAtUtc,
      }],
    });
  }, [calculation.data, onSnapshot, valuationDate]);

  return <Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none">
    <CardHeader className="border-b border-[#edf2f0] pb-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Câmbio · Opções B3</p><CardTitle className="mt-1 text-base text-[#17363e]">Prêmio, MTM e Greeks de opção DOL</CardTitle></div>
        <Calculator className="h-5 w-5 text-[#328a7a]" />
      </div>
      <p className="mt-2 text-xs leading-5 text-[#607a76]">Extrai volatilidade implícita e Greeks (Black-76) do prêmio de liquidação OFICIAL da série de opção — não do contrato-objeto. Aproximação europeia: não reproduz o modelo binomial americano oficial da B3. Volatilidade e taxa nunca são estimadas — exigem prêmio e fonte de taxa já validados.</p>
    </CardHeader>
    <CardContent className="p-5">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div><Label htmlFor="pg-position" className="text-xs">Posição na opção</Label><select id="pg-position" value={optionPosition} onChange={event => setOptionPosition(event.target.value as "LONG" | "SHORT")} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm"><option value="LONG">Comprada</option><option value="SHORT">Vendida</option></select></div>
        <div><Label htmlFor="pg-type" className="text-xs">Tipo</Label><select id="pg-type" value={optionType} onChange={event => setOptionType(event.target.value as "CALL" | "PUT")} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm"><option value="CALL">Call</option><option value="PUT">Put</option></select></div>
        <div><Label htmlFor="pg-contracts" className="text-xs">Contratos</Label><Input id="pg-contracts" inputMode="numeric" value={contracts} onChange={event => setContracts(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
        <div><Label htmlFor="pg-underlying" className="text-xs">Série do contrato-objeto B3</Label><Input id="pg-underlying" value={underlyingSymbol} onChange={event => setUnderlyingSymbol(event.target.value)} placeholder="DOLZ26" className="mt-1.5 border-[#d8e5e2] font-mono" /></div>
        <div><Label htmlFor="pg-series" className="text-xs">Série da opção B3</Label><Input id="pg-series" value={optionSeriesSymbol} onChange={event => setOptionSeriesSymbol(event.target.value)} placeholder="DOLZ26C520" className="mt-1.5 border-[#d8e5e2] font-mono" /></div>
        <div><Label htmlFor="pg-strike" className="text-xs">Strike (BRL/USD)</Label><Input id="pg-strike" inputMode="decimal" value={strike} onChange={event => setStrike(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
        <div><Label htmlFor="pg-underlying-settlement" className="text-xs">Liquidação do objeto (BRL/USD)</Label><Input id="pg-underlying-settlement" inputMode="decimal" value={underlyingSettlement} onChange={event => setUnderlyingSettlement(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
        <div><Label htmlFor="pg-premium" className="text-xs">Prêmio de liquidação da série (BRL/USD)</Label><Input id="pg-premium" inputMode="decimal" value={observedPremium} onChange={event => setObservedPremium(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
        <div><Label htmlFor="pg-valuation" className="text-xs">Data-base</Label><Input id="pg-valuation" type="date" value={valuationDate} onChange={event => setValuationDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
        <div><Label htmlFor="pg-expiry" className="text-xs">Vencimento da opção</Label><Input id="pg-expiry" type="date" value={expiryDate} onChange={event => setExpiryDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
        <div><Label htmlFor="pg-calendar" className="text-xs">Calendário oficial</Label><select id="pg-calendar" value={calendarId} onChange={event => setCalendarId(event.target.value as typeof calendarId)} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm"><option value="B3_TRADING_2026">B3 — sessões de negociação (2026)</option><option value="ANBIMA_BANKING_2026">ANBIMA — feriados bancários (2026)</option></select></div>
        <div><Label htmlFor="pg-rate" className="text-xs">Taxa livre de risco a.a. (base 252, %)</Label><Input id="pg-rate" inputMode="decimal" value={riskFreeRatePct} onChange={event => setRiskFreeRatePct(event.target.value)} placeholder="Ex.: 12,00" className="mt-1.5 border-[#d8e5e2]" /></div>
        <div><Label htmlFor="pg-rate-source" className="text-xs">Fonte da taxa</Label><select id="pg-rate-source" value={rateSourceId} onChange={event => setRateSourceId(event.target.value as typeof rateSourceId)} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm"><option value="B3_DI1_CURVE">Curva DI1 (B3)</option><option value="BCB_SELIC">Selic (BCB)</option></select></div>
        <div><Label htmlFor="pg-rate-asof" className="text-xs">Data-base da taxa</Label><Input id="pg-rate-asof" type="date" value={rateAsOf} onChange={event => setRateAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
        <div className="xl:col-span-2"><Label htmlFor="pg-premium-file" className="text-xs">Arquivo B3 do prêmio (data-base)</Label><Input id="pg-premium-file" value={premiumFile} onChange={event => setPremiumFile(event.target.value)} placeholder="BVBG.086.01...xml" className="mt-1.5 border-[#d8e5e2]" /></div>
        <div className="xl:col-span-2"><Label htmlFor="pg-premium-hash" className="text-xs">SHA-256 do arquivo B3 (data-base)</Label><Input id="pg-premium-hash" value={premiumHash} onChange={event => setPremiumHash(event.target.value)} className="mt-1.5 border-[#d8e5e2] font-mono text-xs" /></div>

        <div className="md:col-span-2 xl:col-span-4 mt-2 rounded-lg border border-dashed border-[#d8e5e2] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#6c8990]">Opcional — ajuste diário (MTM)</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div><Label htmlFor="pg-prev-premium" className="text-xs">Prêmio do dia anterior (BRL/USD)</Label><Input id="pg-prev-premium" inputMode="decimal" value={previousPremium} onChange={event => setPreviousPremium(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div>
            <div className="xl:col-span-2"><Label htmlFor="pg-prev-file" className="text-xs">Arquivo B3 do prêmio anterior</Label><Input id="pg-prev-file" value={previousPremiumFile} onChange={event => setPreviousPremiumFile(event.target.value)} placeholder="BVBG.086.01...xml" className="mt-1.5 border-[#d8e5e2]" disabled={!hasPreviousPremium} /></div>
            <div><Label htmlFor="pg-prev-hash" className="text-xs">SHA-256 do arquivo anterior</Label><Input id="pg-prev-hash" value={previousPremiumHash} onChange={event => setPreviousPremiumHash(event.target.value)} className="mt-1.5 border-[#d8e5e2] font-mono text-xs" disabled={!hasPreviousPremium} /></div>
          </div>
        </div>

        <div className="md:col-span-2 xl:col-span-4"><Button onClick={() => calculation.refetch()} disabled={!canCalculate || calculation.isFetching} className="w-full bg-[#173c45] text-white hover:bg-[#24515a] md:w-auto">{calculation.isFetching ? <Loader2 className="animate-spin" /> : <Calculator />} Calcular prêmio, MTM e Greeks</Button></div>
      </div>

      {calculation.isError && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">A evidência ou os parâmetros não foram aceitos. {calculation.error.message}</p>}

      {calculation.data && <div className="mt-5 space-y-3">
        <p className="rounded-lg bg-[#fff8ed] p-3 text-[11px] leading-5 text-[#8d6740]">{calculation.data.modelCaveat}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[#e2ebe8] bg-[#fbfdfc] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Volatilidade implícita (a.a.)</p><p className="mt-2 font-mono text-base font-semibold text-[#17363e]">{formatPct(calculation.data.impliedVolatilityAnnual)}</p></div>
          <div className="rounded-xl border border-[#e2ebe8] bg-[#fbfdfc] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Prazo até o vencimento</p><p className="mt-2 font-mono text-base font-semibold text-[#17363e]">{formatNumber(calculation.data.yearsToExpiry * 252, 0)} du</p></div>
          <div className="rounded-xl border border-[#e2ebe8] bg-[#fbfdfc] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Prêmio observado B3</p><p className="mt-2 font-mono text-base font-semibold text-[#17363e]">{formatNumber(calculation.data.observedPremium, 4)}</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#d5e6e0] bg-white p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Delta</p><p className="mt-2 font-mono text-sm font-semibold text-[#17363e]">{formatNumber(calculation.data.greeks.delta, 4)}</p></div>
          <div className="rounded-xl border border-[#d5e6e0] bg-white p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Gamma</p><p className="mt-2 font-mono text-sm font-semibold text-[#17363e]">{formatNumber(calculation.data.greeks.gamma, 6)}</p></div>
          <div className="rounded-xl border border-[#d5e6e0] bg-white p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Vega (por 1pp de vol)</p><p className="mt-2 font-mono text-sm font-semibold text-[#17363e]">{formatNumber(calculation.data.greeks.vegaPer1PctVol, 6)}</p></div>
          <div className="rounded-xl border border-[#d5e6e0] bg-white p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Theta (por dia)</p><p className="mt-2 font-mono text-sm font-semibold text-[#17363e]">{formatNumber(calculation.data.greeks.thetaPerCalendarDay, 6)}</p></div>
        </div>
        {calculation.data.dailyMtm && <div className="rounded-xl border border-[#c9e8df] bg-[#f0fbf7] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#4c746c]">Ajuste diário (MTM) — {input.contracts} contrato(s)</p><p className="mt-2 font-mono text-base font-semibold text-[#20715f]">{formatBrl(calculation.data.dailyMtm.grossResult)}</p></div>}
        <p className="text-[10px] leading-4 text-[#6a827d]">Bloqueado: prêmio de exercício antecipado e replicação do modelo binomial oficial da B3.</p>
      </div>}
    </CardContent>
  </Card>;
}
