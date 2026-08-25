import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Calculator, Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { CalculationRow, ScenarioRow } from "../../../server/domain/scenarioBundle";
import type { CanonicalEconomicSituationRow, CanonicalHedgeAlternativeRow } from "../../../server/domain/dataframes";

const instruments = ["DOL", "WDO", "BGI", "CCM", "SOY", "SJC"] as const;
export type LinearFuturesScenarioSnapshot = { scenario: ScenarioRow; calculations: CalculationRow[] };

function format(value: number) { return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(value); }
function today() { return new Date().toISOString().slice(0, 10); }
function futureDate() { const date = new Date(); date.setDate(date.getDate() + 30); return date.toISOString().slice(0, 10); }

/** Cenário educacional de resultado bruto linear para câmbio e commodities; não é cotação, curva ou ajuste B3. */
type Props = {
  onSnapshot?: (snapshot: LinearFuturesScenarioSnapshot) => void;
  situation?: CanonicalEconomicSituationRow | null;
  alternative?: CanonicalHedgeAlternativeRow | null;
  observedPrice?: number | null;
  observedSourceAsOf?: string | null;
  observedSourceFile?: string | null;
  observedSourceHashSha256?: string | null;
  coveragePct?: number;
};

export default function LinearFuturesScenarioCard({ onSnapshot, situation, alternative, observedPrice = null, observedSourceAsOf = null, observedSourceFile = null, observedSourceHashSha256 = null, coveragePct = 100 }: Props) {
  const [instrumentLabel, setInstrumentLabel] = useState<(typeof instruments)[number]>((alternative?.alternative_kind === "B3_WDO_FUTURE" ? "WDO" : alternative?.alternative_kind === "B3_COMMODITY_FUTURE" ? (situation?.commodity_reference ?? "DOL") : "DOL") as (typeof instruments)[number]);
  const [economicDirection, setEconomicDirection] = useState<"BUY" | "SELL">(alternative?.hedge_direction === "SELL" ? "SELL" : "BUY");
  const [hedgePosition, setHedgePosition] = useState<"LONG" | "SHORT">(alternative?.hedge_direction === "SELL" ? "SHORT" : "LONG");
  const [exposureQuantity, setExposureQuantity] = useState(String(situation?.declared_quantity ?? 100000));
  const [hedgeContracts, setHedgeContracts] = useState("0");
  const [contractUnitQuantity, setContractUnitQuantity] = useState(alternative?.alternative_kind === "B3_WDO_FUTURE" ? "10000" : "50000");
  const [targetCoveragePct, setTargetCoveragePct] = useState(String(coveragePct));
  const [horizonDate, setHorizonDate] = useState(situation?.horizon_date ?? futureDate);
  const [initialPrice, setInitialPrice] = useState(observedPrice && observedPrice > 0 ? String(observedPrice) : "5.10");
  const [scenarioPrice, setScenarioPrice] = useState("5.30");
  const [quotationUnit, setQuotationUnit] = useState("BRL por USD");
  const [scenarioAsOf, setScenarioAsOf] = useState(today);
  const input = useMemo(() => ({
    scenarioId: "cenario-linear-local", instrumentLabel, economicDirection, hedgePosition,
    exposureQuantity: Number(exposureQuantity), hedgeContracts: Number(hedgeContracts), contractUnitQuantity: Number(contractUnitQuantity), initialPrice: Number(initialPrice), scenarioPrice: Number(scenarioPrice), quotationUnit,
    dataMode: observedPrice && observedPrice > 0 && observedSourceHashSha256 ? "B3_OBSERVED_PRICES" as const : "USER_PARAMETERIZED_SCENARIO" as const,
    lineage: { sourceId: observedPrice && observedPrice > 0 && observedSourceHashSha256 ? "B3_PUBLIC_FILES" as const : "USER_PARAMETERIZED_SCENARIO" as const, sourceFile: observedSourceFile ?? "cenario-parametrizado-na-interface", sourceHashSha256: observedSourceHashSha256, sourceAsOf: observedSourceAsOf ?? (scenarioAsOf || null), createdAtUtc: new Date().toISOString() },
  }), [contractUnitQuantity, economicDirection, exposureQuantity, hedgeContracts, hedgePosition, initialPrice, instrumentLabel, observedPrice, observedSourceAsOf, observedSourceFile, observedSourceHashSha256, quotationUnit, scenarioAsOf, scenarioPrice]);
  const targetCoverage = Number(targetCoveragePct);
  const scenario = trpc.hedge.linearFuturesScenario.useQuery(input, { enabled: false, retry: false });
  const canCalculate = [input.exposureQuantity, input.hedgeContracts, input.contractUnitQuantity, input.initialPrice, input.scenarioPrice, targetCoverage].every(Number.isFinite) && input.exposureQuantity > 0 && input.hedgeContracts >= 0 && input.contractUnitQuantity > 0 && targetCoverage >= 0 && targetCoverage <= 100 && quotationUnit.trim().length > 0 && Boolean(scenarioAsOf) && Boolean(horizonDate);
  const targetProtectedQuantity = Number.isFinite(input.exposureQuantity) && Number.isFinite(targetCoverage) ? input.exposureQuantity * targetCoverage / 100 : null;

  React.useEffect(() => {
    if (!scenario.data || !onSnapshot) return;
    const createdAtUtc = new Date().toISOString();
    const scenarioId = `linear-${instrumentLabel.toLowerCase()}-local`;
    onSnapshot({
      scenario: { scenario_id: scenarioId, scenario_name: `Cenário linear didático ${instrumentLabel}`, fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: createdAtUtc },
      calculations: [{ calculation_id: `linear-futures-${instrumentLabel.toLowerCase()}-local`, scenario_id: scenarioId, method: "LINEAR_FUTURES_SCENARIO", formula_version: "linear-futures-scenario-v1", calculation_status: "WARNING", result: { ...scenario.data, parameters: { instrumentLabel: input.instrumentLabel, economicDirection: input.economicDirection, hedgePosition: input.hedgePosition, exposureQuantity: input.exposureQuantity, hedgeContracts: input.hedgeContracts, contractUnitQuantity: input.contractUnitQuantity, targetCoveragePct: targetCoverage, targetProtectedQuantity, horizonDate, initialPrice: input.initialPrice, scenarioPrice: input.scenarioPrice, quotationUnit: input.quotationUnit, dataMode: input.dataMode } }, warnings: scenario.data.limitations, calculated_at_utc: createdAtUtc }],
    });
  }, [horizonDate, input, instrumentLabel, onSnapshot, scenario.data, targetCoverage, targetProtectedQuantity]);

  return <Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none">
    <CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Formação · cenário didático</p><CardTitle className="mt-1 text-base text-[#17363e]">Exposição física versus futuro — resultado bruto linear</CardTitle></div><Calculator className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">Os valores abaixo são parâmetros de aula. A data-base identifica o cenário didático, não uma observação de mercado. Este cartão não consulta, infere ou substitui preços e ajustes B3; DI1 e FRA exigem curva, PU e convenções validados.</p></CardHeader>
    <CardContent className="p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Instrumento de referência" id="linear-instrument"><select id="linear-instrument" value={instrumentLabel} onChange={event => setInstrumentLabel(event.target.value as (typeof instruments)[number])} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e] outline-none focus:ring-2 focus:ring-[#328a7a]">{instruments.map(item => <option key={item}>{item}</option>)}</select></Field>
      <Field label="Direção da exposição" id="linear-economic-direction"><select id="linear-economic-direction" value={economicDirection} onChange={event => setEconomicDirection(event.target.value as "BUY" | "SELL")} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e] outline-none focus:ring-2 focus:ring-[#328a7a]"><option value="BUY">Compra física / passivo</option><option value="SELL">Venda física / ativo</option></select></Field>
      <Field label="Posição no futuro" id="linear-hedge-position"><select id="linear-hedge-position" value={hedgePosition} onChange={event => setHedgePosition(event.target.value as "LONG" | "SHORT")} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e] outline-none focus:ring-2 focus:ring-[#328a7a]"><option value="LONG">Comprada</option><option value="SHORT">Vendida</option></select></Field>
      <Field label="Data-base didática" id="linear-asof"><Input id="linear-asof" type="date" value={scenarioAsOf} onChange={event => setScenarioAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Horizonte do fluxo" id="linear-horizon"><Input id="linear-horizon" type="date" value={horizonDate} onChange={event => setHorizonDate(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Unidade de cotação" id="linear-unit"><Input id="linear-unit" value={quotationUnit} onChange={event => setQuotationUnit(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Quantidade da exposição" id="linear-exposure"><Input id="linear-exposure" inputMode="decimal" value={exposureQuantity} onChange={event => setExposureQuantity(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Meta de cobertura (%)" id="linear-target-coverage"><Input id="linear-target-coverage" inputMode="decimal" value={targetCoveragePct} onChange={event => setTargetCoveragePct(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Contratos de hedge" id="linear-contracts"><Input id="linear-contracts" inputMode="numeric" value={hedgeContracts} onChange={event => setHedgeContracts(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Unidade por contrato" id="linear-contract-unit"><Input id="linear-contract-unit" inputMode="decimal" value={contractUnitQuantity} onChange={event => setContractUnitQuantity(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Preço inicial do cenário" id="linear-initial"><Input id="linear-initial" inputMode="decimal" value={initialPrice} onChange={event => setInitialPrice(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <Field label="Preço no cenário" id="linear-scenario"><Input id="linear-scenario" inputMode="decimal" value={scenarioPrice} onChange={event => setScenarioPrice(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></Field>
      <div className="flex items-end"><Button onClick={() => scenario.refetch()} disabled={!canCalculate || scenario.isFetching} className="w-full bg-[#173c45] text-white hover:bg-[#24515a]">{scenario.isFetching ? <Loader2 className="animate-spin" /> : <Calculator />} Calcular cenário</Button></div>
    </div>
    <div className="mt-4 rounded-xl border border-[#dceae6] bg-[#f8fcfa] p-3 text-xs text-[#58736e]"><strong>Formação da cobertura:</strong> meta de {format(targetCoverage || 0)}% = {targetProtectedQuantity === null ? "—" : format(targetProtectedQuantity)} unidades protegidas. A quantidade de contratos é uma entrada independente; a razão efetiva é reportada no resultado, sem ajuste automático.</div>
    {scenario.isError && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">Os parâmetros não foram aceitos. Nenhum valor de mercado foi usado como substituto. {scenario.error.message}</p>}
    {scenario.data && <div className="mt-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Exposição sem hedge" value={format(scenario.data.unhedgedEconomicResult)} tone="ink" /><Metric label="Futuro" value={format(scenario.data.futuresResult)} tone="mint" /><Metric label="Residual combinado" value={format(scenario.data.residualResult)} tone="ink" /><Metric label="Razão efetiva" value={`${format(scenario.data.hedgeCoverageRatio * 100)}%`} tone="ink" /></div><p className="mt-3 text-[10px] leading-4 text-[#6a827d]">{scenario.data.limitations.join(" ")}</p></div>}
    </CardContent>
  </Card>;
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) { return <div><Label htmlFor={id} className="text-xs">{label}</Label>{children}</div>; }
function Metric({ label, value, tone }: { label: string; value: string; tone: "ink" | "mint" }) { return <div className={`rounded-xl border p-3 ${tone === "mint" ? "border-[#c9e8df] bg-[#f0fbf7]" : "border-[#d5e6e0] bg-white"}`}><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">{label}</p><p className={`mt-2 font-mono text-base font-semibold ${tone === "mint" ? "text-[#20715f]" : "text-[#17363e]"}`}>{value}</p></div>; }
