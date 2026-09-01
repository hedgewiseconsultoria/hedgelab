import { trpc } from "@/lib/trpc";
import B3OptionPremiumMtmGreeksCardBase, { type B3OptionPremiumMtmGreeksSnapshot } from "./B3OptionPremiumMtmGreeksCardBase";

export default function B3CattleOptionPremiumMtmGreeksCard({ onSnapshot }: { onSnapshot?: (snapshot: B3OptionPremiumMtmGreeksSnapshot) => void }) {
  return <B3OptionPremiumMtmGreeksCardBase onSnapshot={onSnapshot} config={{
    idPrefix: "opcao-bgi",
    categoryLabel: "Commodity · Opções B3 · Boi Gordo",
    title: "Prêmio, MTM e Greeks de opção de Boi Gordo (BGI)",
    priceUnitLabel: "BRL/arroba",
    mtmCurrency: "BRL",
    defaultUnderlyingSymbol: "BGI",
    underlyingPlaceholder: "BGIF27",
    seriesPlaceholder: "BGIF27C300",
    useCalculation: input => trpc.hedge.b3CattleOptionPremiumMtmGreeks.useQuery(input, { enabled: false, retry: false }),
  }} />;
}
