import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import React from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Props = {
  instrumentLabel: string;
  horizonDate: string;
  economicDirection: "BUY" | "SELL";
  hedgePosition: "LONG" | "SHORT";
  exposureQuantity: number;
  hedgeContracts: number;
  contractUnitQuantity: number;
  initialPrice: number;
  scenarioPrice: number;
  quotationUnit: string;
};

function makePoints(props: Props) {
  const low = Math.min(props.initialPrice, props.scenarioPrice);
  const high = Math.max(props.initialPrice, props.scenarioPrice);
  const span = Math.max(high - low, Math.abs(props.initialPrice) * 0.04, 0.01);
  const start = Math.max(0, low - span * 0.5);
  const end = high + span * 0.5;
  return Array.from({ length:  nine }, (_, index) => {
    const price = start + (end - start) * index / 8;
    const change = price - props.initialPrice;
    const unhedged = (props.economicDirection === "SELL" ? 1 : -1) * props.exposureQuantity * change;
    const future = (props.hedgePosition === "LONG" ? 1 : -1) * props.hedgeContracts * props.contractUnitQuantity * change;
    return { price, unhedged, future, combined: unhedged + future };
  });
}

const nine = 9;
const brl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
const price = (value: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(value);

export default function FutureProtectionChart(props: Props) {
  const points = makePoints(props);
  return <Card className="mt-6 rounded-2xl border-[#cfe3df] bg-[#fbfefd] shadow-none"><CardHeader className="border-b border-[#e1eeeb] pb-4"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#367a6c]">Visualização da proteção</p><CardTitle className="mt-1 text-base text-[#17363e]">Resultado na data futura: {props.horizonDate}</CardTitle><p className="mt-2 text-xs leading-5 text-[#607a76]">O gráfico mostra o resultado bruto da exposição, do futuro e da combinação para diferentes preços no vencimento. É uma simulação linear; não representa ajuste diário, margem, custo de carregamento ou risco de base.</p></CardHeader><CardContent className="p-4"><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={240}><LineChart data={points} margin={{ top: 12, right: 18, left: 8, bottom: 12 }}><CartesianGrid strokeDasharray="3 3" stroke="#dcebe7" /><XAxis dataKey="price" tickFormatter={price} stroke="#6b8580" fontSize={11} label={{ value: props.quotationUnit, position: "insideBottom", offset: -4, fontSize: 10 }} /><YAxis tickFormatter={brl} stroke="#6b8580" fontSize={11} width={82} /><Tooltip formatter={(value: number, name: string) => [brl(value), name]} labelFormatter={(value: number) => `Preço: ${price(value)}`} /><Legend /><ReferenceLine x={props.initialPrice} stroke="#8ca9a2" strokeDasharray="4 4" label={{ value: "Inicial", position: "top", fontSize: 10 }} /><ReferenceLine x={props.scenarioPrice} stroke="#2f806d" strokeDasharray="4 4" label={{ value: "Cenário", position: "top", fontSize: 10 }} /><Line type="monotone" dataKey="unhedged" name="Exposição sem hedge" stroke="#bd7441" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="future" name={`${props.instrumentLabel} futuro`} stroke="#4c82a0" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="combined" name="Resultado líquido" stroke="#20715f" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div><div className="mt-3 grid gap-2 text-[11px] text-[#5c7771] sm:grid-cols-3"><span><strong>Inicial:</strong> {price(props.initialPrice)}</span><span><strong>Cenário:</strong> {price(props.scenarioPrice)}</span><span><strong>Vencimento:</strong> {props.horizonDate}</span></div></CardContent></Card>;
}
