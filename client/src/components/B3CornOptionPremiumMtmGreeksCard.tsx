import { trpc } from "@/lib/trpc";
import B3OptionPremiumMtmGreeksCardBase, { type B3OptionPremiumMtmGreeksSnapshot } from "./B3OptionPremiumMtmGreeksCardBase";

export default function B3CornOptionPremiumMtmGreeksCard({ onSnapshot }: { onSnapshot?: (snapshot: B3OptionPremiumMtmGreeksSnapshot) => void }) {
  return <B3OptionPremiumMtmGreeksCardBase onSnapshot={onSnapshot} config={{
    idPrefix: "opcao-ccm",
    categoryLabel: "Commodity · Opções B3 · Milho",
    title: "Prêmio, MTM e Greeks de opção de Milho (CCM)",
    priceUnitLabel: "BRL/saca de 60 kg",
    mtmCurrency: "BRL",
    defaultUnderlyingSymbol: "CCM",
    underlyingPlaceholder: "CCMF27",
    seriesPlaceholder: "CCMF27C50",
    useCalculation: input => trpc.hedge.b3CornOptionPremiumMtmGreeks.useQuery(input, { enabled: false, retry: false }),
  }} />;
}
