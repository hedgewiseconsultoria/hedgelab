import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Calculator, CircleAlert, ExternalLink, Scale, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";

type Exposure = {
  exposure_id: string;
  description: string;
  currency: string;
  direction: "RECEIVABLE" | "PAYABLE";
  notional: number;
  exposureClass?: "FINANCIAL" | "PHYSICAL_COMMODITY";
};

export type FxFutureSizingSessionPublication = {
  exposureId: string;
  contract: "DOL" | "WDO";
  roundingPolicy: "FLOOR" | "NEAREST" | "CEILING";
  contracts: number;
  coverageRatio: number;
};

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);
}

export default function FxFutureSizer({ exposures, onSizing }: { exposures: Exposure[]; onSizing?: (publication: FxFutureSizingSessionPublication) => void }) {
  // Commodities cotadas em USD (café arábica, ouro, soja) são posições físicas, não caixa em dólar — não entram no dimensionamento de futuro DOL/WDO.
  const usdExposures = useMemo(() => exposures.filter(exposure => exposure.currency === "USD" && exposure.exposureClass !== "PHYSICAL_COMMODITY"), [exposures]);
  const [selectedId, setSelectedId] = useState("");
  const [contract, setContract] = useState<"DOL" | "WDO">("WDO");
  const [roundingPolicy, setRoundingPolicy] = useState<"FLOOR" | "NEAREST" | "CEILING">("NEAREST");
  const selected = usdExposures.find(exposure => exposure.exposure_id === selectedId);
  const result = trpc.hedge.sizeFxFuture.useQuery(
    selected
      ? { exposureUsd: selected.notional, economicDirection: selected.direction, contract, roundingPolicy }
      : { exposureUsd: 1, economicDirection: "PAYABLE", contract, roundingPolicy },
    { enabled: Boolean(selected), retry: false },
  );

  return <Card className="mt-7 rounded-2xl border-[#cbe5df] bg-[#f7fcfa] shadow-none">
    <CardHeader className="flex flex-row items-start justify-between border-b border-[#dcefe9] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#5f8883]">Hedge cambial incremental</p><CardTitle className="mt-1 text-base text-[#17443f]">Dimensionamento de futuro DOL / WDO</CardTitle></div><Calculator className="h-5 w-5 text-[#26846f]" /></CardHeader>
    <CardContent className="p-5"><div className="grid gap-4 lg:grid-cols-3"><div><label className="text-xs font-medium text-[#416a65]">Exposição em USD</label><select value={selectedId} onChange={event => setSelectedId(event.target.value)} className="mt-1.5 h-10 w-full rounded-md border border-[#cfe4df] bg-white px-3 text-sm text-[#274d48]"><option value="">Selecione uma exposição</option>{usdExposures.map(exposure => <option key={exposure.exposure_id} value={exposure.exposure_id}>{exposure.description} — {money(exposure.notional)}</option>)}</select></div><div><label className="text-xs font-medium text-[#416a65]">Contrato B3</label><select value={contract} onChange={event => setContract(event.target.value as "DOL" | "WDO")} className="mt-1.5 h-10 w-full rounded-md border border-[#cfe4df] bg-white px-3 text-sm text-[#274d48]"><option value="WDO">WDO — USD 10.000</option><option value="DOL">DOL — USD 50.000</option></select></div><div><label className="text-xs font-medium text-[#416a65]">Política de arredondamento</label><select value={roundingPolicy} onChange={event => setRoundingPolicy(event.target.value as "FLOOR" | "NEAREST" | "CEILING")} className="mt-1.5 h-10 w-full rounded-md border border-[#cfe4df] bg-white px-3 text-sm text-[#274d48]"><option value="FLOOR">Para baixo</option><option value="NEAREST">Mais próximo</option><option value="CEILING">Para cima</option></select></div></div>
      {!selected ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-[#cfe4df] bg-white/60 px-4 py-4 text-sm text-[#63817d]"><Scale className="h-5 w-5 text-[#7ca8a0]" />Adicione e selecione uma exposição em USD para calcular o nocional equivalente.</div> : result.isError ? <div className="mt-5 flex items-center gap-3 rounded-xl border border-[#f0d5bc] bg-[#fff8ef] px-4 py-4 text-sm text-[#9d5a22]"><CircleAlert className="h-5 w-5" />{result.error.message}</div> : result.data ? <div className="mt-5 grid gap-3 md:grid-cols-4"><div className="rounded-xl bg-[#174c45] px-4 py-3 text-white"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#a5ebdc]">Contratos</p><p className="mt-2 text-2xl font-semibold">{result.data.contracts}</p></div><div className="rounded-xl border border-[#cae5dd] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#6a8c87]">Nocional coberto</p><p className="mt-2 font-mono text-sm font-semibold text-[#26544d]">{money(result.data.hedgedUsd)}</p></div><div className="rounded-xl border border-[#cae5dd] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#6a8c87]">Residual</p><p className="mt-2 font-mono text-sm font-semibold text-[#26544d]">{money(result.data.residualUsd)}</p></div><div className="rounded-xl border border-[#cae5dd] bg-white px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#6a8c87]">Cobertura nocional</p><p className="mt-2 font-mono text-sm font-semibold text-[#26544d]">{new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(result.data.coverageRatio)}</p></div></div> : <div className="mt-5 text-sm text-[#63817d]">Calculando...</div>}
      {result.data && <div className="mt-4 flex flex-wrap items-start justify-between gap-3 text-xs leading-5 text-[#687e7b]"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#c28642]" /><p>O cálculo iguala nocionais em USD. Não inclui ajuste, margem, custo financeiro, base ou recomendação operacional. <a className="inline-flex items-center gap-1 font-medium text-[#157866] underline" href={result.data.sourceUrl} target="_blank" rel="noreferrer">Especificação oficial B3 <ExternalLink className="h-3 w-3" /></a></p></div>{onSizing && <button type="button" onClick={() => selected && onSizing({ exposureId: selected.exposure_id, contract, roundingPolicy, contracts: result.data.contracts, coverageRatio: result.data.coverageRatio })} className="rounded-md border border-[#9bcfc1] bg-white px-3 py-1.5 font-semibold text-[#176858] transition hover:bg-[#eaf7f2]">Registrar cobertura auditável</button>}</div>}
    </CardContent>
  </Card>;
}
