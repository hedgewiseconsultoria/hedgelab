import { describe, expect, it } from "vitest";
import { isStrictlyPositiveFinite, parseLocalizedNumber } from "./ndfInputValidation";

describe("validação de fixing NDF", () => {
  it("mantém fixing vazio e zero bloqueados antes da consulta", () => {
    expect(isStrictlyPositiveFinite(parseLocalizedNumber(""))).toBe(false);
    expect(isStrictlyPositiveFinite(parseLocalizedNumber("0"))).toBe(false);
    expect(isStrictlyPositiveFinite(parseLocalizedNumber("abc"))).toBe(false);
  });

  it("aceita taxa positiva no formato brasileiro", () => {
    expect(parseLocalizedNumber("5,3214")).toBeCloseTo(5.3214, 8);
    expect(isStrictlyPositiveFinite(parseLocalizedNumber("5,3214"))).toBe(true);
  });
});
