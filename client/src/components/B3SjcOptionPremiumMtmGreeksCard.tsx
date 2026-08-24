import { trpc } from "@/lib/trpc";
import B3OptionPremiumMtmGreeksCardBase, { type B3OptionPremiumMtmGreeksSnapshot } from "./B3OptionPremiumMtmGreeksCardBase";

export default function B3SjcOptionPremiumMtmGreeksCard({ onSnapshot }: { onSnapshot?: (snapshot: B3OptionPremiumMtmGreeksSnapshot) => void }) {
  return <B3OptionPremiumMtmGreeksCardBase onSnapshot={onSnapshot} config={{
    idPrefix: "opcao-sjc",
    categoryLabel: "Commodity · Opções B3 · Mini Soja (ref. CME)",
    title: "Prêmio, MTM e Greeks de opção de Mini Soja (SJC)",
    priceUnitLabel: "USD/saca de 60 kg",
    mtmCurrency: "USD",
    defaultUnderlyingSymbol: "SJC",
    underlyingPlaceholder: "SJCF27",
    seriesPlaceholder: "SJCF27C13",
    useCalculation: input => trpc.hedge.b3SjcOptionPremiumMtmGreeks.useQuery(input, { enabled: false, retry: false }),
  }} />;
}
