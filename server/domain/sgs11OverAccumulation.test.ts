import { describe, expect, it } from "vitest";
import { calculateSgs11OverAccumulation } from "./sgs11OverAccumulation";

const dataset = (rows: Array<{ asOf: string; valuePct: number }>) => ({ raw: [], dataframe: rows.map((row, index) => ({ observationId: `sgs11-${index}`, ...row, seriesCode: 11 as const, unit: "percent" as const })), lineage: { sourceId: "BCB_SGS_11_SELIC" as const, sourceUrl: "https://api.bcb.gov.br/sgs11", sourceFile: "bcdata.sgs.11", extractedAtUtc: "2026-08-19T00:00:00.000Z", sourceAsOf: "2026-08-04", sourceHashSha256: "a".repeat(64), parserVersion: "bcb-sgs-11-v1", validationStatus: "valid" as const } });

describe("calculateSgs11OverAccumulation", () => {
  it("capitaliza somente a sequência diária SGS 11 completa", () => {
    const result = calculateSgs11OverAccumulation({ startDate: "2026-08-03", endDate: "2026-08-04", dataset: dataset([{ asOf: "2026-08-03", valuePct: 0.05 }, { asOf: "2026-08-04", valuePct: 0.04 }]) });
    expect(result.accumulatedFactor).toBeCloseTo(1.0009002, 8);
    expect(result.accumulatedPct).toBeCloseTo(0.09002, 5);
    expect(result.calendarId).toBe("ANBIMA_BANKING_2026");
  });
  it("bloqueia lacuna de dia útil ou fim de semana", () => {
    expect(() => calculateSgs11OverAccumulation({ startDate: "2026-08-03", endDate: "2026-08-04", dataset: dataset([{ asOf: "2026-08-03", valuePct: 0.05 }]) })).toThrow(/contínua/i);
    expect(() => calculateSgs11OverAccumulation({ startDate: "2026-08-01", endDate: "2026-08-04", dataset: dataset([]) })).toThrow(/dias úteis bancários/i);
  });
});
