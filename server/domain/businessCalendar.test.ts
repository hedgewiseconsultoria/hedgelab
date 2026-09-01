import { describe, expect, it } from "vitest";
import { BUSINESS_CALENDARS, addBusinessDays, businessDaysBetween, isBusinessDay, settlementDateD1 } from "./businessCalendar";

describe("calendários oficiais de 2026", () => {
  it("distingue feriados bancários ANBIMA dos dias sem sessão B3", () => {
    expect(isBusinessDay("2026-12-24", "B3_TRADING_2026")).toBe(false);
    expect(isBusinessDay("2026-12-24", "ANBIMA_BANKING_2026")).toBe(true);
    expect(isBusinessDay("2026-02-18", "B3_TRADING_2026")).toBe(true);
  });

  it("calcula D+1 a partir do calendário selecionado e expõe a fonte", () => {
    expect(settlementDateD1("2026-12-23", "B3_TRADING_2026")).toBe("2026-12-28");
    expect(settlementDateD1("2026-12-23", "ANBIMA_BANKING_2026")).toBe("2026-12-24");
    expect(BUSINESS_CALENDARS.B3_TRADING_2026.sourceUrl).toContain("b3.com.br");
  });

  it("usa início exclusivo e fim inclusivo para a contagem de dias úteis", () => {
    expect(businessDaysBetween("2026-02-13", "2026-02-18", "B3_TRADING_2026")).toBe(1);
    expect(addBusinessDays("2026-02-13", 1, "ANBIMA_BANKING_2026")).toBe("2026-02-18");
  });

  it("recusa extrapolar o calendário oficial de 2026", () => {
    expect(() => isBusinessDay("2027-01-04", "B3_TRADING_2026")).toThrow("somente para 2026");
  });
});
