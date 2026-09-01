import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Calculator, Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { CalculationRow, ScenarioRow } from "../../../server/domain/scenarioBundle";

const SHA256 = /^[a-f0-9]{64}$/;
export type B3FxFutureDailySettlementSnapshot = { scenario: ScenarioRow; calculations: CalculationRow[] };

function formatBrl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

/** Variação diária de ajuste de DOL/WDO; não é MTM e exige duas evidências B3. */
export default function B3FxFutureDailySettlementCard({ onSnapshot }: { onSnapshot?: (snapshot: B3FxFutureDailySettlementSnapshot) => void }) {
  const [contract, setContract] = useState<"DOL" | "WDO">("DOL");
  const [position, setPosition] = useState<"LONG_USD" | "SHORT_USD">("LONG_USD");
  const [contracts, setContracts] = useState("1");
  const [previousQuote, setPreviousQuote] = useState("");
  const [currentQuote, setCurrentQuote] = useState("");
  const [previousAsOf, setPreviousAsOf] = useState("");
  const [previousFile, setPreviousFile] = useState("");
  const [previousHash, setPreviousHash] = useState("");
  const [currentAsOf, setCurrentAsOf] = useState("");
  const [currentFile, setCurrentFile] = useState("");
  const [currentHash, setCurrentHash] = useState("");
  const input = useMemo(() => ({
    contract, position, contracts: Number(contracts), previousSettlementQuoteBrlPerUsd1000: Number(previousQuote), currentSettlementQuoteBrlPerUsd1000: Number(currentQuote),
    previousB3Lineage: { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: previousAsOf, sourceFile: previousFile, sourceHashSha256: previousHash },
    currentB3Lineage: { sourceId: "B3_PUBLIC_FILES" as const, sourceAsOf: currentAsOf, sourceFile: currentFile, sourceHashSha256: currentHash },
  }), [contract, contracts, currentAsOf, currentFile, currentHash, currentQuote, position, previousAsOf, previousFile, previousHash, previousQuote]);
  const calculation = trpc.hedge.b3FxFutureDailySettlement.useQuery(input, { enabled: false, retry: false });
  const evidenceValid = Boolean(previousAsOf && currentAsOf && previousFile.trim() && currentFile.trim()) && SHA256.test(previousHash) && SHA256.test(currentHash);
  const canCalculate = Number.isInteger(input.contracts) && input.contracts > 0 && Number.isFinite(input.previousSettlementQuoteBrlPerUsd1000) && Number.isFinite(input.currentSettlementQuoteBrlPerUsd1000) && evidenceValid;

  React.useEffect(() => {
    if (!calculation.data || !onSnapshot) return;
    const createdAtUtc = new Date().toISOString();
    const scenarioId = `ajuste-${contract.toLowerCase()}-${currentAsOf}`;
    onSnapshot({
      scenario: { scenario_id: scenarioId, scenario_name: `Ajuste diário ${contract}`, fx_shock_pct: null, rate_shock_bps: null, volatility_shock_pct: null, created_at_utc: createdAtUtc },
      calculations: [{ calculation_id: `b3-fx-future-daily-${contract.toLowerCase()}-${currentAsOf}`, scenario_id: scenarioId, method: calculation.data.method, formula_version: calculation.data.formulaVersion, calculation_status: "SUCCESS", result: { ...calculation.data, parameters: { contract, position, contracts: input.contracts, previous_quote_brl_per_usd_1000: input.previousSettlementQuoteBrlPerUsd1000, current_quote_brl_per_usd_1000: input.currentSettlementQuoteBrlPerUsd1000 } }, warnings: ["Variação diária de ajuste DOL/WDO; não representa MTM, margem de garantia, emolumentos, custos financeiros ou exposição econômica não vinculada."], calculated_at_utc: createdAtUtc }],
    });
  }, [calculation.data, contract, currentAsOf, input.contracts, input.currentSettlementQuoteBrlPerUsd1000, input.previousSettlementQuoteBrlPerUsd1000, onSnapshot, position]);

  return <Card className="mt-7 rounded-2xl border-[#d7e7e2] bg-white shadow-none"><CardHeader className="border-b border-[#edf2f0] pb-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Câmbio · B3</p><CardTitle className="mt-1 text-base text-[#17363e]">Ajuste diário de DOL/WDO</CardTitle></div><Calculator className="h-5 w-5 text-[#328a7a]" /></div><p className="mt-2 text-xs leading-5 text-[#607a76]">Calcula exclusivamente a variação entre dois preços de ajuste B3 informados em BRL por USD 1.000. Os dois arquivos, hashes e datas-base são obrigatórios. O resultado não é MTM.</p></CardHeader><CardContent className="p-5"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><div><Label htmlFor="fx-settlement-contract" className="text-xs">Contrato</Label><select id="fx-settlement-contract" value={contract} onChange={event => setContract(event.target.value as "DOL" | "WDO")} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e]"><option value="DOL">DOL</option><option value="WDO">WDO</option></select></div><div><Label htmlFor="fx-settlement-position" className="text-xs">Posição</Label><select id="fx-settlement-position" value={position} onChange={event => setPosition(event.target.value as "LONG_USD" | "SHORT_USD")} className="mt-1.5 flex h-9 w-full rounded-md border border-[#d8e5e2] bg-white px-3 text-sm text-[#17363e]"><option value="LONG_USD">Comprada em USD</option><option value="SHORT_USD">Vendida em USD</option></select></div><div><Label htmlFor="fx-settlement-contracts" className="text-xs">Contratos</Label><Input id="fx-settlement-contracts" inputMode="numeric" value={contracts} onChange={event => setContracts(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-settlement-previous-quote" className="text-xs">Ajuste anterior (BRL/USD 1.000)</Label><Input id="fx-settlement-previous-quote" inputMode="decimal" value={previousQuote} onChange={event => setPreviousQuote(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-settlement-current-quote" className="text-xs">Ajuste atual (BRL/USD 1.000)</Label><Input id="fx-settlement-current-quote" inputMode="decimal" value={currentQuote} onChange={event => setCurrentQuote(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-settlement-previous-asof" className="text-xs">Data-base anterior</Label><Input id="fx-settlement-previous-asof" type="date" value={previousAsOf} onChange={event => setPreviousAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div><Label htmlFor="fx-settlement-current-asof" className="text-xs">Data-base atual</Label><Input id="fx-settlement-current-asof" type="date" value={currentAsOf} onChange={event => setCurrentAsOf(event.target.value)} className="mt-1.5 border-[#d8e5e2]" /></div><div className="flex items-end"><Button onClick={() => calculation.refetch()} disabled={!canCalculate || calculation.isFetching} className="w-full bg-[#173c45] text-white hover:bg-[#24515a]">{calculation.isFetching ? <Loader2 className="animate-spin" /> : <Calculator />} Calcular ajuste</Button></div><div className="xl:col-span-2"><Label htmlFor="fx-settlement-previous-file" className="text-xs">Arquivo B3 anterior</Label><Input id="fx-settlement-previous-file" value={previousFile} onChange={event => setPreviousFile(event.target.value)} placeholder="PriceReport.xml" className="mt-1.5 border-[#d8e5e2]" /></div><div className="xl:col-span-2"><Label htmlFor="fx-settlement-current-file" className="text-xs">Arquivo B3 atual</Label><Input id="fx-settlement-current-file" value={currentFile} onChange={event => setCurrentFile(event.target.value)} placeholder="PriceReport.xml" className="mt-1.5 border-[#d8e5e2]" /></div><div className="xl:col-span-2"><Label htmlFor="fx-settlement-previous-hash" className="text-xs">SHA-256 anterior</Label><Input id="fx-settlement-previous-hash" value={previousHash} onChange={event => setPreviousHash(event.target.value)} className="mt-1.5 border-[#d8e5e2] font-mono text-xs" /></div><div className="xl:col-span-2"><Label htmlFor="fx-settlement-current-hash" className="text-xs">SHA-256 atual</Label><Input id="fx-settlement-current-hash" value={currentHash} onChange={event => setCurrentHash(event.target.value)} className="mt-1.5 border-[#d8e5e2] font-mono text-xs" /></div></div>{calculation.isError && <p className="mt-4 rounded-lg bg-[#fff8ed] p-3 text-xs leading-5 text-[#8d6740]">A evidência ou os parâmetros não foram aceitos. {calculation.error.message}</p>}{calculation.data && <div className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-[#e2ebe8] bg-[#fbfdfc] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Variação cotada</p><p className="mt-2 font-mono text-base font-semibold text-[#17363e]">{calculation.data.quoteVariationBrlPerUsd1000.toLocaleString("pt-BR", { maximumFractionDigits: 8 })}</p></div><div className="rounded-xl border border-[#c9e8df] bg-[#f0fbf7] p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#4c746c]">Ajuste diário</p><p className="mt-2 font-mono text-base font-semibold text-[#20715f]">{formatBrl(calculation.data.dailySettlementVariationBrl)}</p></div><div className="rounded-xl border border-[#d5e6e0] bg-white p-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#6b8580]">Status</p><p className="mt-2 text-sm font-semibold text-[#17363e]">Não é MTM</p></div></div>}</CardContent></Card>;
}
