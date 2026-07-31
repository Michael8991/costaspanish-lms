type StudentSnapshotSource = {
  fullName?: unknown;
};

type VoucherSnapshotSource = {
  name?: unknown;
};

function toFiniteNonNegativeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function getStudentNameSnapshot(
  student: StudentSnapshotSource | null | undefined,
): string {
  return typeof student?.fullName === "string" && student.fullName.trim()
    ? student.fullName.trim()
    : "Alumno";
}

export function getVoucherNameSnapshot(
  voucher: VoucherSnapshotSource | null | undefined,
): string {
  return typeof voucher?.name === "string" ? voucher.name.trim() : "";
}

export function calculateUnitCreditPrice(args: {
  priceTotal?: number | null;
  creditsTotal?: number | null;
}): number {
  const priceTotal = toFiniteNonNegativeNumber(args.priceTotal);
  const creditsTotal = toFiniteNonNegativeNumber(args.creditsTotal);

  if (priceTotal === null || creditsTotal === null || creditsTotal <= 0) {
    return 0;
  }

  return priceTotal / creditsTotal;
}

export function calculateEstimatedRevenue(args: {
  creditsConsumed: number;
  unitCreditPrice: number;
}): number {
  const creditsConsumed = toFiniteNonNegativeNumber(args.creditsConsumed);
  const unitCreditPrice = toFiniteNonNegativeNumber(args.unitCreditPrice);

  if (creditsConsumed === null || unitCreditPrice === null) return 0;
  return creditsConsumed * unitCreditPrice;
}
