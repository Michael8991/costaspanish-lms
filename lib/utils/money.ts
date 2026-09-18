export function toCents(value: number): number {
  if (!Number.isFinite(value)) throw new Error("Money value must be finite");
  return Math.round(value * 100);
}

export function fromCents(value: number): number {
  if (!Number.isSafeInteger(value)) throw new Error("Money cents must be a safe integer");
  return value / 100;
}
