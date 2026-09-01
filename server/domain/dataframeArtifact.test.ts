import { describe, expect, it } from "vitest";
import { dataframeToCsv, sha256Text } from "./dataframeArtifact";

describe("artefato de DataFrame", () => {
  it("serializa valores ausentes e caracteres CSV sem alterar os dados", () => {
    const csv = dataframeToCsv([
      { symbol: "DOLQ27P004950", price: null, note: "sem, negócio" },
      { symbol: "DI1Z28", price: 15.25, note: 'aspas "preservadas"' },
    ]);
    expect(csv).toBe('symbol,price,note\nDOLQ27P004950,,"sem, negócio"\nDI1Z28,15.25,"aspas ""preservadas"""');
    expect(sha256Text(csv)).toMatch(/^[a-f0-9]{64}$/);
  });
});
