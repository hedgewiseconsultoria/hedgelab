import { describe, expect, it } from "vitest";
import { appendSimulationHistory, loadSimulationHistory, simulationHistoryKey, type LocalSimulationVersion } from "./simulationHistory";

function version(index: number): LocalSimulationVersion {
  return { bundle_id: `bundle-${index}`, bundle_sha256: String(index).padStart(64, "a"), exported_at_utc: "2026-08-17T00:00:00.000Z", scenario_id: `scenario-${index}`, exposure_count: index, bundle: { index } };
}

describe("simulationHistory", () => {
  it("mantém versões imutáveis por hash, limita o histórico a vinte e preserva a versão mais recente", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    const history = Array.from({ length: 21 }, (_, index) => version(index)).reduce((current, item) => appendSimulationHistory(current, item, storage, "tesouraria"), [] as LocalSimulationVersion[]);
    const repeated = appendSimulationHistory(history, version(10), storage, "tesouraria");

    expect(repeated).toHaveLength(20);
    expect(repeated[0]?.bundle_sha256).toBe(version(10).bundle_sha256);
    expect(loadSimulationHistory(storage, "tesouraria")[0]?.scenario_id).toBe("scenario-10");
    expect(values.get(simulationHistoryKey("tesouraria"))).toContain("scenario-10");
  });
});
