import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, CircleAlert, Gauge, ShieldAlert } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type Exposure = {
  exposure_id: string;
  description: string;
  currency: string;
  direction: "RECEIVABLE" | "PAYABLE";
  notional: number;
  exposureClass?: "FINANCIAL" | "PHYSICAL_COMMODITY";
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(value);
}

export type FxScenarioSessionSnapshot = {
  scenario: { scenario_id: string; scenario_name: string; fx_shock_pct: number | null; rate_shock_bps: number | null; volatility_shock_pct: number | null; created_at_utc: string };
  calculations: Array<{ calculation_id: string; scenario_id: string; method: string; formula_version: string; calculation_status: "SUCCESS" | "BLOCKED" | "WARNING"; result: Record<string, unknown>; warnings: string[]; calculated_at_utc: string }>;
};

export default function FxScenarioLab({ exposures, ptaxSale, onSessionSnapshot }: { exposures: Exposure[]; ptaxSale: number | undefined; onSessionSnapshot?: (snapshot: FxScenarioSessionSnapshot | null) => void }) {
  // Commodities cotadas em USD (café arábica, ouro, soja) são posições físicas, não caixa em dólar — não entram no estresse cambial.
  const usdExposures = useMemo(() => exposures.filter(exposure => exposure.currency === "USD" && exposure.exposureClass !== "PHYSICAL_COMMODITY"), [exposures]);
  const [selectedId, setSelectedId] = useState("");
  const [shockPct, setShockPct] = useState("10");
  const [volPct, setVolPct] = useState("1");
  const [horizon, setHorizon] = useState("1");
  const [confidence, setConfidence] = useState("95");
  const selected = usdExposures.find(exposure => exposure.exposure_id === selectedId);
  const shock = Number(shockPct.replace(",", ".")) / 100;
  const volatility = Number(volPct.replace(",", ".")) / 100;
  const horizonValue = Number(horizon);
  const confidenceValue = Number(confidence.replace(",", ".")) / 100;
  const enabled = Boolean(selected && ptaxSale && Number.isFinite(shock));
  const stress = trpc.risk.fxStress.useQuery(selected && ptaxSale ? { exposureUsd: selected.notional, economicDirection: selected.direction, ptaxSale, fxShockPct: shock } : { exposureUsd: 1, economicDirection: "PAYABLE", ptaxSale: 1, fxShockPct: 0 }, { enabled, retry: false });
  const varQuery = trpc.risk.parametricVar.useQuery(selected && ptaxSale && Number.isFinite(volatility) && Number.isInteger(horizonValue) && Number.isFinite(confidenceValue) ? { exposureBrl: selected.notional * ptaxSale, dailyVolatilityPct: volatility, holdingPeriodBusinessDays: horizonValue, confidenceLevel: confidenceValue } : { exposureBrl: 1, dailyVolatilityPct: 0.01, holdingPeriodBusinessDays: 1, confidenceLevel: 0.95 }, { enabled: Boolean(selected && ptaxSale && Number.isFinite(volatility) && Number.isInteger(horizonValue) && confidenceValue > 0 && confidenceValue < 1), retry: false });
  const scenarioId = selected ? `fx-stress-${selected.exposure_id}-${shockPct}-${volPct}-${horizon}-${confidence}` : null;

  useEffect(() => {
    if (!selected || !ptaxSale || !scenarioId || !stress.data || !varQuery.data || !Number.isFinite(shock) || !Number.isFinite(volatility) || !Number.isInteger(horizonValue) || !Number.isFinite(confidenceValue)) {
      onSessionSnapshot?.(null);
      return;
    }
    const now = new Date().toISOString();
    onSessionSnapshot?.({
      scenario: { scenario_id: scenarioId, scenario_name: `Stress cambial PTAX — ${selected.description}`, fx_shock_pct: shock * 100, rate_shock_bps: null, volatility_shock_pct: volatility * 100, created_at_utc: now },
      calculations: [
        { calculation_id: `${scenarioId}-stress`, scenario_id: scenarioId, method: "FX_STRESS_PTAX", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { pnl_brl: stress.data.pnlBrl, stressed_rate: stress.data.stressedRate, signed_delta_brl_per_one_percent: stress.data.signedDeltaBrlPerOnePercent, ptax_sale: ptaxSale }, warnings: ["Choque cambial informado explicitamente pela sessão; não constitui recomendação operacional."], calculated_at_utc: now },
        { calculation_id: `${scenarioId}-var`, scenario_id: scenarioId, method: "PARAMETRIC_VAR_NORMAL", formula_version: "1.0.0", calculation_status: "SUCCESS", result: { var_brl: varQuery.data.varBrl, daily_volatility_pct: volatility, holding_period_business_days: horizonValue, confidence_level: confidenceValue }, warnings: ["Volatilidade é entrada declarada; não foi inferida de séries de mercado."], calculated_at_utc: now },
      ],
    });
  }, [confidenceValue, horizonValue, onSessionSnapshot, ptaxSale, scenarioId, selected, shock, stress.data, varQuery.data, volatility]);

  return <Card className="mt-7 rounded-2xl border-[#d8e5ec] bg-[#f7fafc] shadow-none"><CardHeader className="flex flex-row items-start justify-between border-b border-[#e0ebf0] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#648895]">Stress e sensibilidade</p><CardTitle className="mt-1 text-base text-[#183c49]">Cenário cambial por PTAX e VaR paramétrico</CardTitle></div><Activity className="h-5 w-5 text-[#378399]" /></CardHeader><CardContent className="p-5"><div className="grid gap-4 lg:grid-cols-5"><div className="lg:col-span-2"><label className="text-xs font-medium text-[#456a78]">Exposição em USD</label><select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#d4e4e9] bg-white px-3 text-sm text-[#284b58]"><option value="">Selecione uma exposição</option>{usdExposures.map(exposure => <option value={exposure.exposure_id} key={exposure.exposure_id}>{exposure.description} — USD {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(exposure.notional)}</option>)}</select></div><div><label className="text-xs font-medium text-[#456a78]">Choque cambial (%)</label><input value={shockPct} onChange={event => setShockPct(event.target.value)} inputMode="decimal" className="mt-1.5 h-10 w-full rounded-md border border-[#d4e4e9] bg-white px-3 text-sm text-[#284b58]" /></div><div><label className="text-xs font-medium text-[#456a78]">Volatilidade diária (%)</label><input value={volPct} onChange={event => setVolPct(event.target.value)} inputMode="decimal" className="mt-1.5 h-10 w-full rounded-md border border-[#d4e4e9] bg-white px-3 text-sm text-[#284b58]" /></div><div><label className="text-xs font-medium text-[#456a78]">Horizonte / confiança</label><div className="mt-1.5 flex gap-2"><input value={horizon} onChange={event => setHorizon(event.target.value)} inputMode="numeric" className="h-10 w-1/2 rounded-md border border-[#d4e4e9] bg-white px-3 text-sm text-[#284b58]" title="Dias úteis" /><input value={confidence} onChange={event => setConfidence(event.target.value)} inputMode="decimal" className="h-10 w-1/2 rounded-md border border-[#d4e4e9] bg-white px-3 text-sm text-[#284b58]" title="Confiança em percentual" /></div></div></div>
      {!selected || !ptaxSale ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-[#d7e6ea] bg-white/70 px-4 py-4 text-sm text-[#67828b]"><Gauge className="h-5 w-5 text-[#82a7b1]" />Adicione uma exposição USD e carregue uma PTAX válida para analisar o cenário.</div> : stress.isError || varQuery.isError ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#f0d5bc] bg-[#fff8ef] px-4 py-4 text-sm text-[#9d5a22]"><CircleAlert className="h-5 w-5" />{stress.error?.message ?? varQuery.error?.message}</div> : stress.data && varQuery.data ? <div className="mt-5 grid gap-3 md:grid-cols-4"><div className="rounded-xl bg-[#1b4656] px-4 py-3 text-white"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#a8e0ed]">P&L do choque</p><p className="mt-2 font-mono text-base font-semibold">{brl(stress.data.pnlBrl)}</p></div><div className="rounded-xl border border-[#d4e4e9] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#6e8a94]">PTAX estressada</p><p className="mt-2 font-mono text-base font-semibold text-[#28515f]">{new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(stress.data.stressedRate)}</p></div><div className="rounded-xl border border-[#d4e4e9] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#6e8a94]">Delta por 1%</p><p className="mt-2 font-mono text-base font-semibold text-[#28515f]">{brl(stress.data.signedDeltaBrlPerOnePercent)}</p></div><div className="rounded-xl border border-[#d4e4e9] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#6e8a94]">VaR paramétrico</p><p className="mt-2 font-mono text-base font-semibold text-[#28515f]">{brl(varQuery.data.varBrl)}</p></div></div> : <div className="mt-5 text-sm text-[#67828b]">Calculando cenário…</div>}
      <div className="mt-4 flex gap-2 text-[11px] leading-5 text-[#6d838b]"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#b48042]" /><p>O choque e a volatilidade são entradas explícitas da sessão. O VaR usa distribuição normal e não pressupõe dados oficiais de volatilidade, preços B3, correlação ou backtesting.</p></div>
    </CardContent></Card>;
}
