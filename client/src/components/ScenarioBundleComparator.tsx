import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ArrowLeftRight, CheckCircle2, FileSearch, Loader2, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type ImportedBundle = {
  bundle_id: string;
  exported_at_utc: string;
  bundle_sha256: string;
  dataframes: {
    exposure_dataframe: Array<{ currency: string; notional: number }>;
    hedge_dataframe: unknown[];
    scenario_dataframe: unknown[];
    lineage_dataframe: unknown[];
  };
};

function totalsByCurrency(bundle: ImportedBundle | null) {
  const totals = new Map<string, number>();
  for (const row of bundle?.dataframes.exposure_dataframe ?? []) totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.notional);
  return totals;
}

export default function ScenarioBundleComparator() {
  const [base, setBase] = useState<ImportedBundle | null>(null);
  const [comparison, setComparison] = useState<ImportedBundle | null>(null);
  const [history, setHistory] = useState<Array<Pick<ImportedBundle, "bundle_id" | "bundle_sha256" | "exported_at_utc">>>(() => {
    try { return JSON.parse(localStorage.getItem("hedge-lab.bundle-history.v1") ?? "[]"); } catch { return []; }
  });
  const baseInput = useRef<HTMLInputElement>(null);
  const comparisonInput = useRef<HTMLInputElement>(null);
  const importer = trpc.workspace.importScenarioBundle.useMutation({
    onError: error => toast.error(error.message),
  });
  const comparisonRows = useMemo(() => {
    const baseTotals = totalsByCurrency(base);
    const comparisonTotals = totalsByCurrency(comparison);
    const currencies = Array.from(new Set(Array.from(baseTotals.keys()).concat(Array.from(comparisonTotals.keys())))).sort();
    return currencies.map(currency => ({ currency, base: baseTotals.get(currency) ?? 0, comparison: comparisonTotals.get(currency) ?? 0 }));
  }, [base, comparison]);

  function load(file: File, target: "base" | "comparison") {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return toast.error("Não foi possível ler o pacote selecionado.");
      importer.mutate({ serializedBundle: reader.result }, {
        onSuccess: bundle => {
          if (target === "base") setBase(bundle as ImportedBundle);
          else setComparison(bundle as ImportedBundle);
          setHistory(current => {
            const next = [{ bundle_id: bundle.bundle_id, bundle_sha256: bundle.bundle_sha256, exported_at_utc: bundle.exported_at_utc }, ...current.filter(item => item.bundle_sha256 !== bundle.bundle_sha256)].slice(0, 20);
            localStorage.setItem("hedge-lab.bundle-history.v1", JSON.stringify(next));
            return next;
          });
          toast.success(`Pacote ${bundle.bundle_id} validado por hash.`);
        },
      });
    };
    reader.readAsText(file);
  }

  const bundleStatus = (bundle: ImportedBundle | null, label: string) => bundle ? <div className="rounded-xl border border-[#cce7df] bg-white px-3.5 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-[#1e675a]"><CheckCircle2 className="h-4 w-4" />{label} validada</div><p className="mt-2 truncate font-mono text-[10px] text-[#52746f]">{bundle.bundle_id}</p><p className="mt-1 text-[11px] text-[#6b8580]">{bundle.dataframes.exposure_dataframe.length} exposição(ões) • {bundle.dataframes.lineage_dataframe.length} fonte(s)</p></div> : <div className="rounded-xl border border-dashed border-[#cfe2de] bg-white/65 px-3.5 py-4 text-xs text-[#6e8984]">Nenhum pacote selecionado.</div>;

  return <Card className="mt-7 rounded-2xl border-[#d8e7e2] bg-white shadow-[0_20px_45px_-38px_rgba(16,58,58,.35)]"><CardHeader className="flex flex-row items-start justify-between border-b border-[#edf2f0] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#6c8990]">Histórico sem banco de dados</p><CardTitle className="mt-1 text-base text-[#17363e]">Comparar pacotes de cenário</CardTitle></div><ArrowLeftRight className="h-5 w-5 text-[#3c8f7d]" /></CardHeader><CardContent className="p-5"><p className="max-w-3xl text-xs leading-5 text-[#6e858a]">Importe dois arquivos JSON exportados pelo HEDGE LAB. Cada pacote é validado por hash antes da comparação; o conteúdo não é armazenado no servidor.</p><div className="mt-3 text-[11px] text-[#6e858a]">Histórico local: {history.length} versão(ões) validada(s), sem dados de mercado recalculados.</div><div className="mt-4 grid gap-4 md:grid-cols-2"><div>{bundleStatus(base, "Base")}<Button variant="outline" size="sm" onClick={() => baseInput.current?.click()} disabled={importer.isPending} className="mt-3 border-[#d4e5e1] text-[#3e6c65]"><Upload /> Selecionar pacote base</Button><input ref={baseInput} className="hidden" type="file" accept="application/json" onChange={event => event.target.files?.[0] && load(event.target.files[0], "base")} /></div><div>{bundleStatus(comparison, "Comparação")}<Button variant="outline" size="sm" onClick={() => comparisonInput.current?.click()} disabled={importer.isPending} className="mt-3 border-[#d4e5e1] text-[#3e6c65]"><Upload /> Selecionar pacote de comparação</Button><input ref={comparisonInput} className="hidden" type="file" accept="application/json" onChange={event => event.target.files?.[0] && load(event.target.files[0], "comparison")} /></div></div>{importer.isPending && <div className="mt-4 flex items-center gap-2 text-xs text-[#5c7773]"><Loader2 className="h-4 w-4 animate-spin" /> Validando integridade do pacote…</div>}{base && comparison && <div className="mt-5 overflow-hidden rounded-xl border border-[#dce9e6]">{comparisonRows.length === 0 ? <div className="px-4 py-5 text-sm text-[#68817d]">Os dois DataFrames não contêm exposições.</div> : comparisonRows.map(row => <div key={row.currency} className="grid grid-cols-3 border-t border-[#edf3f1] px-4 py-3 text-sm"><span className="font-mono font-semibold text-[#31554f]">{row.currency}</span><span className="font-mono text-[#59736f]">{new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(row.base)}</span><span className={`font-mono ${row.comparison - row.base === 0 ? "text-[#4a7169]" : "text-[#a56324]"}`}>{new Intl.NumberFormat("pt-BR", { signDisplay: "always", maximumFractionDigits: 2 }).format(row.comparison - row.base)}</span></div>)}</div>}<div className="mt-4 flex items-center gap-2 text-[11px] text-[#78918e]"><FileSearch className="h-4 w-4" />Comparação limitada aos DataFrames exportados; não recalcula preços ou risco de mercado.</div></CardContent></Card>;
}
