import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const parse = (value: string) => Number(value.trim().replace(",", "."));
const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);

export type ResidualRiskSessionSnapshot = {
  scenario: { scenario_id: string; scenario_name: string; fx_shock_pct: number | null; rate_shock_bps: number | null; volatility_shock_pct: number | null; created_at_utc: string };
  calculations: Array<{ calculation_id: string; scenario_id: string; method: string; formula_version: string; calculation_status: "SUCCESS" | "BLOCKED" | "WARNING"; result: Record<string, unknown>; warnings: string[]; calculated_at_utc: string }>;
};

export default function ResidualRiskCard({ valuationAsOf, sourceIds, onSessionSnapshot }: { valuationAsOf?: string | null; sourceIds: string[]; onSessionSnapshot?: (snapshot: ResidualRiskSessionSnapshot | null) => void }) {
  const [grossExposure, setGrossExposure] = useState("");
  const [hedgeExposure, setHedgeExposure] = useState("");
  const [volatility, setVolatility] = useState("1");
  const [days, setDays] = useState("1");
  const [confidence, setConfidence] = useState("0,95");
  const input = useMemo(() => {
    const grossExposureBrl = parse(grossExposure); const hedgeEquivalentExposureBrl = parse(hedgeExposure); const dailyVolatilityPct = parse(volatility) / 100; const holdingPeriodBusinessDays = Number(days); const confidenceLevel = parse(confidence);
    if (!valuationAsOf || sourceIds.length === 0 || !grossExposure.trim() || !hedgeExposure.trim() || !Number.isFinite(grossExposureBrl) || grossExposureBrl === 0 || !Number.isFinite(hedgeEquivalentExposureBrl) || !Number.isFinite(dailyVolatilityPct) || dailyVolatilityPct <= 0 || !Number.isInteger(holdingPeriodBusinessDays) || holdingPeriodBusinessDays <= 0 || !Number.isFinite(confidenceLevel) || confidenceLevel <= 0 || confidenceLevel >= 1) return null;
    return { grossExposureBrl, hedgeEquivalentExposureBrl, dailyVolatilityPct, holdingPeriodBusinessDays, confidenceLevel, lineage: { valuationAsOf, sourceIds } };
  }, [grossExposure, hedgeExposure, volatility, days, confidence, valuationAsOf, sourceIds]);
  const risk = trpc.risk.residualRisk.useQuery(input!, { enabled: Boolean(input), retry: false });
  const scenarioId = input ? `residual-risk-${input.lineage.valuationAsOf}-${input.grossExposureBrl}-${input.hedgeEquivalentExposureBrl}-${input.holdingPeriodBusinessDays}-${input.confidenceLevel}` : null;
  useEffect(() => {
    if (!input || !scenarioId || !risk.data) {
      onSessionSnapshot?.(null);
      return;
    }
    const now = new Date().toISOString();
    onSessionSnapshot?.({
      scenario: { scenario_id: scenarioId, scenario_name: `Risco residual — ${input.lineage.valuationAsOf}`, fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: input.dailyVolatilityPct * 100, created_at_utc: now },
      calculations: [{ calculation_id: `${scenarioId}-var`, scenario_id: scenarioId, method: "RESIDUAL_PARAMETRIC_VAR", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { residual_exposure_brl: risk.data.residualExposureBrl, coverage_pct: risk.data.coveragePct, residual_var_brl: risk.data.residualVarBrl, gross_exposure_brl: input.grossExposureBrl, hedge_equivalent_exposure_brl: input.hedgeEquivalentExposureBrl, holding_period_business_days: input.holdingPeriodBusinessDays, confidence_level: input.confidenceLevel }, warnings: risk.data.calculationMemory, calculated_at_utc: now }],
    });
  }, [input, onSessionSnapshot, risk.data, scenarioId]);
  return <Card className="mt-7 rounded-2xl border-[#dce8e5] bg-white shadow-[0_22px_45px_-38px_rgba(16,58,58,.4)]"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Risco consolidado</p><CardTitle className="mt-1 text-base text-[#17363e]">Exposição residual e VaR</CardTitle></div><ShieldAlert className="h-5 w-5 text-[#b16a26]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">Cálculo paramétrico sobre a exposição líquida equivalente. A volatilidade é uma entrada explícita, não uma estimativa implícita.</p></CardHeader><CardContent className="p-5"><div className="grid gap-3 sm:grid-cols-2"><div><Label htmlFor="gross-risk" className="text-xs">Exposição bruta (BRL)</Label><Input id="gross-risk" inputMode="decimal" value={grossExposure} onChange={event => setGrossExposure(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="hedge-risk" className="text-xs">Equivalente do hedge (BRL)</Label><Input id="hedge-risk" inputMode="decimal" value={hedgeExposure} onChange={event => setHedgeExposure(event.target.value)} placeholder="Negativo se compensar" className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="residual-vol" className="text-xs">Volatilidade diária (%)</Label><Input id="residual-vol" inputMode="decimal" value={volatility} onChange={event => setVolatility(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="residual-days" className="text-xs">Horizonte (DU)</Label><Input id="residual-days" inputMode="numeric" value={days} onChange={event => setDays(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="residual-confidence" className="text-xs">Confiança (0 a 1)</Label><Input id="residual-confidence" inputMode="decimal" value={confidence} onChange={event => setConfidence(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div></div>{!input && <div className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs text-[#8a5d29]">Informe exposições, volatilidade, horizonte, confiança e carregue uma fonte oficial para habilitar o cálculo.</div>}{risk.isLoading && <div className="mt-4 flex items-center gap-2 text-xs text-[#688188]"><Loader2 className="h-4 w-4 animate-spin" />Calculando risco residual…</div>}{risk.data && <div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">Residual</p><p className="mt-1 text-sm font-semibold text-[#24594f]">{brl(risk.data.residualExposureBrl)}</p></div><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">Cobertura</p><p className="mt-1 text-sm font-semibold text-[#24594f]">{(risk.data.coveragePct * 100).toFixed(2)}%</p></div><div className="rounded-lg bg-[#f4faf8] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.1em] text-[#75928a]">VaR residual</p><p className="mt-1 text-sm font-semibold text-[#24594f]">{brl(risk.data.residualVarBrl)}</p></div></div>}{risk.data && <div className="mt-4 flex gap-2 rounded-lg border border-[#f0d5bc] bg-[#fff8ef] p-3 text-[11px] leading-5 text-[#8d6740]"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b16a26]" /><p>{risk.data.calculationMemory[2]}</p></div>}</CardContent></Card>;
}
