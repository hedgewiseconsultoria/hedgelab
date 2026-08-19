import { describe, expect, it } from "vitest";
import { toCsv } from "./csvDownload";

describe("exportação CSV de DataFrames", () => {
  it("preserva cabeçalhos e faz escape de valores textuais", () => {
    expect(toCsv([{ descricao: "Hedge, USD", nota: 'A "B"' }])).toBe('descricao,nota\n"Hedge, USD","A ""B"""');
  });

  it("não cria dados para DataFrame vazio", () => {
    expect(toCsv([])).toBe("");
  });
});
