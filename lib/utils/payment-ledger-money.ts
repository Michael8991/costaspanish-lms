import { toCents } from "@/lib/utils/money";

// Prefer the canonical field; only legacy rows need the euro conversion.
export const paymentLedgerAmountCentsExpression = {
  $ifNull: [
    "$amountCents",
    { $round: [{ $multiply: ["$amount", 100] }, 0] },
  ],
};

export function paymentLedgerAmountCents(source: {
  amount?: unknown;
  amountCents?: unknown;
}): number {
  if (source.amountCents !== null && source.amountCents !== undefined) {
    if (typeof source.amountCents !== "number" || !Number.isSafeInteger(source.amountCents) || source.amountCents <= 0) {
      throw new Error("Invalid canonical payment ledger amountCents");
    }
    return source.amountCents;
  }
  if (typeof source.amount !== "number" || !Number.isFinite(source.amount) || source.amount <= 0) {
    throw new Error("Missing or invalid legacy payment ledger amount");
  }
  const cents = toCents(source.amount);
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    throw new Error("Invalid legacy payment ledger amount in cents");
  }
  return cents;
}
