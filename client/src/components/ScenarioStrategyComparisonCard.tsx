import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows } from "lucide-react";
import React from "react";
import type { CalculationRow, ScenarioRow } from "../../../server/domain/scenarioBundle";

type ResultRecord = Record<string, unknown>;

function asRecord(value: unknown): ResultRecord {
  return value && typeof value === "object" ? value as ResultRecord : {};
}

function asFiniteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function format(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(value);
}

function optionGrossExercise(result: ResultRecord) {
  return asFiniteNumber(result.grossExerciseBrl) ?? asFiniteNumber(result.grossExerciseUsd);
}

function optionCurrency(result: ResultRecord) {
  return asFiniteNumber(result.grossExerciseUsd) !== null ? "USD" : "BRL";
}

/**
 * Mostra apenas estratégias com resultado já executado e evidencia o que pode ou não ser comparado.
 * Não reprecifica posições, não usa prêmio de opção e não converte resultados entre unidades ou moedas.
 */
export default function ScenarioStrategyComparisonCard({ scenarios, calculations }: { scenarios: ScenarioRow[]; calculations: CalculationRow[] }) {
  const names = new Map(scenarios.map(scenario => [scenario.scenario_id, scenario.scenario_name]));
  const linearRows = calculations.filter(calculation => calculation.method === "LINEAR_FUTURES_SCENARIO");
  const optionRows = calculations.filter(calculation => /^B3_(DOL|CCM|BGI|SOY|SJC)_OPTION_INTRINSIC_SETTLEMENT_SCENARIO$/.test(calculation.method));

  return <Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none">
    <CardHeader className="border-b border-[#edf2f0] pb-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Cenário · comparabilidade</p><CardTitle className="mt-1 text-base text-[#17363e]">Sem hedge, futuro, parcial e opção</CardTitle></div><GitCompareArrows className="h-5 w-5 text-[#328a7a]" /></div>
      <p className="mt-2 text-xs leading-5 text-[#607a76]">O quadro somente expõe resultados já calculados na sessão. Valores de futuro são comparáveis apenas dentro do mesmo cenário linear, moeda e unidade declarada; exercício de opção é exibido separadamente, pois prêmio, MTM, volatilidade implícita e Greeks continuam bloqueados.</p>
    </CardHeader>
    <CardContent className="p-5">
      {linearRows.length === 0 && optionRows.length === 0 ? <p className="rounded-xl border border-dashed border-[#d8e5e2] bg-[#fbfdfc] px-4 py-5 text-center text-sm text-[#71878e]">Nenhum cenário linear ou exercício intrínseco de opção foi executado nesta sessão.</p> : <div className="space-y-5">
        {linearRows.length > 0 && <section aria-label="Comparações de cenário linear"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#6c8990]">Cenários lineares com unidade declarada</p><div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left text-xs"><thead className="bg-[#f6fbf9] text-[10px] uppercase tracking-[.1em] text-[#69847f]"><tr><th className="px-3 py-3">Cenário</th><th className="px-3 py-3">Instrumento / unidade</th><th className="px-3 py-3">Sem hedge</th><th className="px-3 py-3">Futuro</th><th className="px-3 py-3">Hedge parcial</th><th className="px-3 py-3">Cobertura</th><th className="px-3 py-3">Estado</th></tr></thead><tbody className="divide-y divide-[#edf2f0]">{linearRows.map(row => {
          const result = asRecord(row.result);
          const parameters = asRecord(result.parameters);
          const ratio = asFiniteNumber(result.hedgeCoverageRatio);
          const isPartial = ratio !== null && ratio > 0 && ratio < 1;
          return <tr key={row.calculation_id} className="align-top text-[#456761]"><td className="px-3 py-3 font-medium text-[#294a50]">{names.get(row.scenario_id) ?? row.scenario_id}<p className="mt-1 font-mono text-[10px] text-[#71878e]">{row.scenario_id}</p></td><td className="px-3 py-3"><strong>{String(parameters.instrumentLabel ?? result.instrumentLabel ?? "instrumento")}</strong><br />{String(result.quotationUnit ?? parameters.quotationUnit ?? "unidade não informada")}</td><td className="px-3 py-3 font-mono">{format(asFiniteNumber(result.unhedgedEconomicResult))}</td><td className="px-3 py-3 font-mono">{format(asFiniteNumber(result.futuresResult))}</td><td className="px-3 py-3 font-mono">{isPartial ? format(asFiniteNumber(result.residualResult)) : "Não aplicável"}</td><td className="px-3 py-3 font-mono">{ratio === null ? "—" : `${format(ratio * 100)}%`}</td><td className="px-3 py-3"><Badge variant="outline" className={isPartial ? "border-[#e8d1a6] bg-[#fff8ed] text-[#8d6740]" : "border-[#9cd6c8] bg-[#effbf7] text-[#20715f]"}>{isPartial ? "PARCIAL" : "LINEAR"}</Badge></td></tr>;
        })}</tbody></table></div></section>}
        {optionRows.length > 0 && <section aria-label="Exercícios intrínsecos de opção"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.14em] text-[#6c8990]">Opções: exercício intrínseco, sem equivalência automática</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{optionRows.map(row => {
          const result = asRecord(row.result);
          const gross = optionGrossExercise(result);
          return <div key={row.calculation_id} className="rounded-xl border border-[#e1ebe8] bg-[#fbfdfc] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-[#315d59]">{row.method}</p><p className="mt-1 text-xs font-medium text-[#294a50]">{names.get(row.scenario_id) ?? row.scenario_id}</p></div><Badge variant="outline" className="border-[#e8d1a6] bg-[#fff8ed] text-[#8d6740]">NÃO EQUIVALENTE</Badge></div><p className="mt-4 text-[10px] uppercase tracking-[.12em] text-[#6c8990]">Exercício bruto</p><p className="mt-1 font-mono text-lg font-semibold text-[#17363e]">{gross === null ? "—" : `${optionCurrency(result)} ${format(gross)}`}</p><p className="mt-3 text-[10px] leading-4 text-[#6a827d]">Não comparar com futuro ou sem hedge sem prêmio, data-base, unidade econômica e demais parâmetros contratuais validados.</p></div>;
        })}</div></section>}
      </div>}
    </CardContent>
  </Card>;
}
