import { trpc } from "@/lib/trpc";
import B3OptionPremiumMtmGreeksCardBase, { type B3OptionPremiumMtmGreeksSnapshot } from "./B3OptionPremiumMtmGreeksCardBase";

export default function B3SoyOptionPremiumMtmGreeksCard({ onSnapshot }: { onSnapshot?: (snapshot: B3OptionPremiumMtmGreeksSnapshot) => void }) {
  return <B3OptionPremiumMtmGreeksCardBase onSnapshot={onSnapshot} config={{
    idPrefix: "opcao-soy",
    categoryLabel: "Commodity · Opções B3 · Soja FOB Santos",
    title: "Prêmio, MTM e Greeks de opção de Soja FOB Santos (SOY)",
    priceUnitLabel: "USD/tonelada",
    mtmCurrency: "USD",
    defaultUnderlyingSymbol: "SOY",
    underlyingPlaceholder: "SOYF27",
    seriesPlaceholder: "SOYF27C500",
    useCalculation: input => trpc.hedge.b3SoyOptionPremiumMtmGreeks.useQuery(input, { enabled: false, retry: false }),
  }} />;
}
