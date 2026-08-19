import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale } from "lucide-react";
import React from "react";
import type { CalculationRow, LineageRow, ScenarioRow } from "../../../server/domain/scenarioBundle";

type ResultShape = Record<string, unknown>;
type Evidence = { sourceId?: unknown; sourceFile?: unknown; sourceAsOf?: unknown; sourceHashSha256?: unknown };

function compactResult(result: ResultShape) {
  const numeric = Object.entries(result).filter(([key, value]) => key !== "parameters" && typeof value === "number" && Number.isFinite(value)).slice(0, 3);
  if (numeric.length === 0) return "Resultado estruturado disponível no pacote auditável.";
  return numeric.map(([key, value]) => `${key}: ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 8 }).format(value as number)}`).join(" · ");
}

function structuredParameters(result: ResultShape) {
  return result.parameters && typeof result.parameters === "object" ? result.parameters : {};
}

function evidenceFrom(value: unknown): Evidence[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if ("sourceFile" in record || "sourceId" in record) return [record];
  return Object.values(record).flatMap(evidenceFrom);
}

function shortHash(value: unknown) {
  return typeof value === "string" && value.length === 64 ? `${value.slice(0, 12)}…${value.slice(-8)}` : "—";
}

/** Compara apenas cálculos executados, preservando parâmetros e evidências sem ranquear métricas de bases distintas. */
export default function CurrentScenarioComparisonCard({ scenarios, calculations, lineage }: { scenarios: ScenarioRow[]; calculations: CalculationRow[]; lineage: LineageRow[] }) {
  const scenarioNames = new Map(scenarios.map(scenario => [scenario.scenario_id, scenario.scenario_name]));
  return <Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none">
    <CardHeader className="border-b border-[#edf2f0] pb-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Comparação de sessão</p><CardTitle className="mt-1 text-base text-[#17363e]">Resultados de cenários auditáveis</CardTitle></div><Scale className="h-5 w-5 text-[#328a7a]" /></div>
      <p className="mt-2 text-xs leading-5 text-[#607a76]">O quadro apresenta somente cálculos já executados no navegador. Ele não compara ou classifica como equivalentes resultados de margem DI1, cenário cambial, commodity, NDF ou VaR; consulte método, parâmetros, evidência e limitações de cada linha.</p>
    </CardHeader>
    <CardContent className="p-0">
      {calculations.length === 0 ? <div className="px-5 py-8 text-center text-sm text-[#71878e]">Nenhum cenário calculado na sessão. Execute um módulo com os insumos exigidos para registrar um resultado auditável.</div> : <>
        <div className="overflow-x-auto"><table className="min-w-[1040px] w-full text-left text-xs"><thead className="bg-[#f6fbf9] text-[10px] uppercase tracking-[.1em] text-[#69847f]"><tr><th className="px-5 py-3 font-semibold">Cenário</th><th className="px-5 py-3 font-semibold">Método</th><th className="px-5 py-3 font-semibold">Status</th><th className="px-5 py-3 font-semibold">Parâmetros</th><th className="px-5 py-3 font-semibold">Resultado</th><th className="px-5 py-3 font-semibold">Evidência do cálculo</th><th className="px-5 py-3 font-semibold">Limitações</th></tr></thead><tbody className="divide-y divide-[#edf2f0]">{calculations.map(calculation => {
          const result = calculation.result as ResultShape;
          const evidences = evidenceFrom(result.lineage);
          return <tr key={calculation.calculation_id} className="align-top"><td className="px-5 py-4 font-medium text-[#294a50]">{scenarioNames.get(calculation.scenario_id) ?? calculation.scenario_id}<p className="mt-1 font-mono text-[10px] font-normal text-[#71878e]">{calculation.scenario_id}</p></td><td className="px-5 py-4"><p className="font-mono text-[11px] text-[#315d59]">{calculation.method}</p><p className="mt-1 text-[10px] text-[#71878e]">{calculation.formula_version}</p></td><td className="px-5 py-4"><span className={`rounded px-2 py-1 text-[10px] font-semibold ${calculation.calculation_status === "SUCCESS" ? "bg-[#e7f7f1] text-[#1f745f]" : calculation.calculation_status === "WARNING" ? "bg-[#fff5e4] text-[#9b6b2c]" : "bg-[#faeceb] text-[#9a4a43]"}`}>{calculation.calculation_status}</span></td><td className="max-w-[230px] px-5 py-4"><details open><summary className="cursor-pointer text-[10px] font-semibold text-[#315d59]">Ver parâmetros</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-[#f6fbf9] p-2 font-mono text-[9px] leading-4 text-[#456761]">{JSON.stringify(structuredParameters(result), null, 2)}</pre></details></td><td className="max-w-[230px] px-5 py-4 font-mono text-[10px] leading-5 text-[#456761]">{compactResult(result)}</td><td className="max-w-[240px] px-5 py-4 text-[10px] leading-5 text-[#637e78]">{evidences.length ? evidences.map((evidence, index) => <p key={`${String(evidence.sourceFile)}-${index}`} className="mb-2"><strong>{String(evidence.sourceId ?? "fonte")}</strong><br />{String(evidence.sourceFile ?? "arquivo não informado")} · {String(evidence.sourceAsOf ?? "sem data-base")}<br /><span className="font-mono">{shortHash(evidence.sourceHashSha256)}</span></p>) : "Sem evidência específica no resultado; consulte as fontes da sessão abaixo."}</td><td className="max-w-[240px] px-5 py-4 text-[10px] leading-5 text-[#637e78]">{calculation.warnings.length ? calculation.warnings.join(" ") : "Sem alerta adicional registrado."}</td></tr>;
        })}</tbody></table></div>
        <div className="border-t border-[#edf2f0] bg-[#fbfdfc] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#6c8990]">Fontes carregadas na sessão</p>{lineage.length ? <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">{lineage.map(item => <div key={`${item.source_id}-${item.source_file}-${item.source_hash_sha256}`} className="rounded-lg border border-[#e0ebe8] bg-white p-2 text-[10px] leading-4 text-[#58736e]"><strong>{item.source_id}</strong><br />{item.source_file} · {item.source_asof ?? "sem data-base"}<br /><span className="font-mono">{shortHash(item.source_hash_sha256)}</span></div>)}</div> : <p className="mt-2 text-xs text-[#71878e]">Nenhuma fonte de mercado carregada nesta sessão; resultados parametrizados exibem sua própria referência didática.</p>}</div>
      </>}
    </CardContent>
  </Card>;
}
