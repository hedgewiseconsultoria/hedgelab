import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useMemo } from "react";

type ExposureRow = {
  exposure_id: string;
  currency: string;
  direction: "PAYABLE" | "RECEIVABLE";
  notional: number;
  cashflow_date: string;
  exposureClass?: "FINANCIAL" | "PHYSICAL_COMMODITY";
  physicalQuantity?: number | null;
  physicalUnit?: string | null;
  commodityReference?: string | null;
};

const money = (value: number, currency: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
const quantity = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(value);

/** Linhas sem exposureClass definida (ex.: importadas de sessões antigas) são tratadas como financeiras, mantendo compatibilidade retroativa. */
const isPhysical = (exposure: ExposureRow) => exposure.exposureClass === "PHYSICAL_COMMODITY";

export default function ExposureMaturityBucketsCard({ exposures }: { exposures: ExposureRow[] }) {
  const financialExposures = useMemo(() => exposures.filter(exposure => !isPhysical(exposure)), [exposures]);
  const physicalExposures = useMemo(() => exposures.filter(isPhysical), [exposures]);

  const buckets = useMemo(() => {
    const grouped = new Map<string, { currency: string; maturity: string; receivable: number; payable: number; records: number }>();
    for (const exposure of financialExposures) {
      const key = `${exposure.currency}|${exposure.cashflow_date}`;
      const bucket = grouped.get(key) ?? { currency: exposure.currency, maturity: exposure.cashflow_date, receivable: 0, payable: 0, records: 0 };
      if (exposure.direction === "RECEIVABLE") bucket.receivable += exposure.notional; else bucket.payable += exposure.notional;
      bucket.records += 1;
      grouped.set(key, bucket);
    }
    return Array.from(grouped.values()).map(bucket => ({ ...bucket, net: bucket.receivable - bucket.payable })).sort((a, b) => a.maturity.localeCompare(b.maturity) || a.currency.localeCompare(b.currency));
  }, [financialExposures]);

  const physicalBuckets = useMemo(() => {
    const grouped = new Map<string, { commodityReference: string; unit: string; maturity: string; bought: number; sold: number; records: number }>();
    for (const exposure of physicalExposures) {
      const key = `${exposure.commodityReference ?? "—"}|${exposure.physicalUnit ?? "—"}|${exposure.cashflow_date}`;
      const bucket = grouped.get(key) ?? { commodityReference: exposure.commodityReference ?? "—", unit: exposure.physicalUnit ?? "—", maturity: exposure.cashflow_date, bought: 0, sold: 0, records: 0 };
      const amount = exposure.physicalQuantity ?? 0;
      if (exposure.direction === "PAYABLE") bucket.bought += amount; else bucket.sold += amount;
      bucket.records += 1;
      grouped.set(key, bucket);
    }
    return Array.from(grouped.values()).sort((a, b) => a.maturity.localeCompare(b.maturity) || a.commodityReference.localeCompare(b.commodityReference));
  }, [physicalExposures]);

  return <>
    <Card className="mt-7 rounded-2xl border-[#c6ddd7] bg-white text-[#17363e] shadow-none">
      <CardHeader className="border-b border-[#dce8e5] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#456970]">Fluxos declarados</p>
        <CardTitle className="mt-1 text-base text-[#17363e]">Exposição líquida por vencimento</CardTitle>
        <p className="mt-2 text-xs font-medium leading-5 text-[#4d6d72]">Consolidação de nocionais monetários declarados por moeda e data de fluxo (USD, dívida CDI). Quantidades físicas de commodities não entram nesta soma — veja a tabela de posições físicas abaixo. Não calcula valor presente, MTM, risco de juros ou Greeks.</p>
      </CardHeader>
      <CardContent className="p-0">
        {buckets.length === 0 ? <p className="px-5 py-6 text-sm font-medium text-[#4d6d72]">Nenhum fluxo monetário disponível para agrupar por vencimento.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-[#f3f8f6] text-[10px] font-semibold uppercase tracking-[.1em] text-[#456970]"><tr><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Moeda</th><th className="px-5 py-3 text-right">Recebível</th><th className="px-5 py-3 text-right">Pagável</th><th className="px-5 py-3 text-right">Líquido</th><th className="px-5 py-3 text-right">Fluxos</th></tr></thead><tbody className="divide-y divide-[#dce8e5] text-[#294a50]">{buckets.map(bucket => <tr key={`${bucket.currency}-${bucket.maturity}`}><td className="px-5 py-3 font-mono font-medium text-[#294a50]">{bucket.maturity}</td><td className="px-5 py-3 font-mono font-semibold text-[#17363e]">{bucket.currency}</td><td className="px-5 py-3 text-right font-mono font-medium">{money(bucket.receivable, bucket.currency)}</td><td className="px-5 py-3 text-right font-mono font-medium">{money(bucket.payable, bucket.currency)}</td><td className={`px-5 py-3 text-right font-mono font-semibold ${bucket.net >= 0 ? "text-[#0e6f5f]" : "text-[#97491f]"}`}>{money(bucket.net, bucket.currency)}</td><td className="px-5 py-3 text-right font-mono font-semibold">{bucket.records}</td></tr>)}</tbody></table></div>}
      </CardContent>
    </Card>
    <Card className="mt-5 rounded-2xl border-[#c6ddd7] bg-white text-[#17363e] shadow-none">
      <CardHeader className="border-b border-[#dce8e5] pb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#456970]">Fluxos declarados</p>
        <CardTitle className="mt-1 text-base text-[#17363e]">Posições físicas de commodity por vencimento</CardTitle>
        <p className="mt-2 text-xs font-medium leading-5 text-[#4d6d72]">Quantidades físicas declaradas (sacas, arrobas, toneladas, etc.), sem conversão para valor monetário. O valor financeiro só existe quando multiplicado por um preço oficial validado no módulo de cenários.</p>
      </CardHeader>
      <CardContent className="p-0">
        {physicalBuckets.length === 0 ? <p className="px-5 py-6 text-sm font-medium text-[#4d6d72]">Nenhuma posição física de commodity disponível para agrupar por vencimento.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-[#f3f8f6] text-[10px] font-semibold uppercase tracking-[.1em] text-[#456970]"><tr><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Commodity</th><th className="px-5 py-3">Unidade</th><th className="px-5 py-3 text-right">Comprado</th><th className="px-5 py-3 text-right">Vendido</th><th className="px-5 py-3 text-right">Registros</th></tr></thead><tbody className="divide-y divide-[#dce8e5] text-[#294a50]">{physicalBuckets.map(bucket => <tr key={`${bucket.commodityReference}-${bucket.unit}-${bucket.maturity}`}><td className="px-5 py-3 font-mono font-medium text-[#294a50]">{bucket.maturity}</td><td className="px-5 py-3 font-mono font-semibold text-[#17363e]">{bucket.commodityReference}</td><td className="px-5 py-3 font-mono font-medium text-[#294a50]">{bucket.unit}</td><td className="px-5 py-3 text-right font-mono font-medium">{quantity(bucket.bought)}</td><td className="px-5 py-3 text-right font-mono font-medium">{quantity(bucket.sold)}</td><td className="px-5 py-3 text-right font-mono font-semibold">{bucket.records}</td></tr>)}</tbody></table></div>}
      </CardContent>
    </Card>
  </>;
}
