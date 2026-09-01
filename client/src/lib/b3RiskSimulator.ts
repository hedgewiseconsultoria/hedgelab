export type BrowserB3RiskPosition = {
  symbol: string;
  direction: "LONG" | "SHORT";
  quantity: number;
  tradePrice: number;
  tradeDate: string;
};

export type BrowserB3RiskMarginResult = {
  marginRequiredBrl: number;
  scenarioId: number | null;
  calculatedAtUtc: string;
};

const B3_SIMULATOR_BASE_URL = "https://simulador.b3.com.br/api/cors-app/web";

export async function calculateB3RiskMarginInBrowser(positions: BrowserB3RiskPosition[], signal?: AbortSignal): Promise<BrowserB3RiskMarginResult> {
  const referenceResponse = await fetch(`${B3_SIMULATOR_BASE_URL}/ReferenceData`, { headers: { Accept: "application/json" }, signal });
  if (!referenceResponse.ok) throw new Error(`ReferenceData B3 HTTP ${referenceResponse.status}`);
  const referencePayload = await referenceResponse.json() as { ReferenceData?: { referenceDataToken?: string } };
  const referenceDataToken = referencePayload.ReferenceData?.referenceDataToken;
  if (!referenceDataToken) throw new Error("Token de referência B3 ausente.");
  const riskPositionList = positions.map(position => ({
    Security: { symbol: position.symbol },
    SecurityGroup: { positionTypeCode: 0 },
    Position: position.direction === "LONG"
      ? { longQuantity: position.quantity, tradeDate: position.tradeDate, longPrice: position.tradePrice }
      : { shortQuantity: position.quantity, tradeDate: position.tradeDate, shortPrice: position.tradePrice },
  }));
  const riskResponse = await fetch(`${B3_SIMULATOR_BASE_URL}/RiskCalculation`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ ReferenceData: { referenceDataToken }, LiquidityResource: { value: 0 }, RiskPositionList: riskPositionList }),
    signal,
  });
  if (!riskResponse.ok) throw new Error(`RiskCalculation B3 HTTP ${riskResponse.status}`);
  const payload = await riskResponse.json() as { Risk?: { riskWithoutCollateral?: number; scenarioId?: number } };
  const margin = payload.Risk?.riskWithoutCollateral;
  if (!Number.isFinite(margin)) throw new Error("O simulador B3 não retornou a margem da carteira.");
  return { marginRequiredBrl: Math.max(0, margin!), scenarioId: Number.isFinite(payload.Risk?.scenarioId) ? payload.Risk!.scenarioId! : null, calculatedAtUtc: new Date().toISOString() };
}
