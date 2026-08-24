import { trpc } from "@/lib/trpc";
import B3OptionPremiumMtmGreeksCardBase, { type B3OptionPremiumMtmGreeksSnapshot } from "./B3OptionPremiumMtmGreeksCardBase";

export default function B3DollarOptionPremiumMtmGreeksCard({ onSnapshot }: { onSnapshot?: (snapshot: B3OptionPremiumMtmGreeksSnapshot) => void }) {
  return <B3OptionPremiumMtmGreeksCardBase onSnapshot={onSnapshot} config={{
    idPrefix: "opcao-dol",
    categoryLabel: "Câmbio · Opções B3",
    title: "Prêmio, MTM e Greeks de opção DOL",
    priceUnitLabel: "BRL/USD",
    mtmCurrency: "BRL",
    defaultUnderlyingSymbol: "DOL",
    underlyingPlaceholder: "DOLZ26",
    seriesPlaceholder: "DOLZ26C520",
    useCalculation: input => trpc.hedge.b3DollarOptionPremiumMtmGreeks.useQuery(input, { enabled: false, retry: false }),
  }} />;
}
