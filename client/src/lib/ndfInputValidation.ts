export function parseLocalizedNumber(value: string): number {
  return Number(value.trim().replace(",", "."));
}

export function isStrictlyPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
