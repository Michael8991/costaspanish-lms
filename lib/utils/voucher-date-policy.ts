import { startOfUtcDay } from "@/lib/utils/date-only";
import { getUtcCalendarDay } from "@/lib/utils/voucher-period";

export type VoucherDateValue = Date | string;

export interface VoucherDateState {
  validFrom: Date;
  validUntil: Date;
  billingPeriodStart?: Date | null;
  billingPeriodEnd?: Date | null;
}

export type VoucherDatePatch = Partial<{
  validFrom: Date;
  validUntil: Date;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
}>;

export interface VoucherDatePatchResolution {
  state: VoucherDateState;
  patch: VoucherDatePatch;
  changed: boolean;
  validityChanged: boolean;
  billingPeriodChanged: boolean;
}

export class VoucherDatePolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VoucherDatePolicyError";
  }
}

function normalizeRequiredDate(value: VoucherDateValue, field: string): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new VoucherDatePolicyError(`${field} must be a valid date`);
  }
  return startOfUtcDay(date);
}

function normalizeOptionalDate(
  value: VoucherDateValue | null,
  field: string,
): Date | null {
  return value === null ? null : normalizeRequiredDate(value, field);
}

export function validateVoucherDateState(
  state: VoucherDateState,
  options: { requireCompleteBillingPeriod?: boolean } = {},
): void {
  const validFrom = getUtcCalendarDay(state.validFrom);
  const validUntil = getUtcCalendarDay(state.validUntil);
  if (validFrom === null || validUntil === null) {
    throw new VoucherDatePolicyError("Voucher validity dates must be valid");
  }
  if (validUntil < validFrom) {
    throw new VoucherDatePolicyError(
      "validUntil cannot be before validFrom",
    );
  }

  const hasBillingStart = state.billingPeriodStart != null;
  const hasBillingEnd = state.billingPeriodEnd != null;
  if (
    options.requireCompleteBillingPeriod &&
    hasBillingStart !== hasBillingEnd
  ) {
    throw new VoucherDatePolicyError(
      "billingPeriodStart and billingPeriodEnd must be provided together",
    );
  }
  if (!hasBillingStart || !hasBillingEnd) return;

  const billingStart = getUtcCalendarDay(state.billingPeriodStart!);
  const billingEnd = getUtcCalendarDay(state.billingPeriodEnd!);
  if (billingStart === null || billingEnd === null) {
    throw new VoucherDatePolicyError("Billing period dates must be valid");
  }
  if (billingEnd < billingStart) {
    throw new VoucherDatePolicyError(
      "billingPeriodEnd cannot be before billingPeriodStart",
    );
  }
}

export function resolveManualVoucherDates(args: {
  validFrom?: VoucherDateValue;
  validUntil: VoucherDateValue;
  billingPeriodStart?: VoucherDateValue | null;
  billingPeriodEnd?: VoucherDateValue | null;
  now?: Date;
}): VoucherDateState {
  const state: VoucherDateState = {
    validFrom: normalizeRequiredDate(
      args.validFrom ?? args.now ?? new Date(),
      "validFrom",
    ),
    validUntil: normalizeRequiredDate(args.validUntil, "validUntil"),
    billingPeriodStart:
      args.billingPeriodStart === undefined
        ? undefined
        : normalizeOptionalDate(args.billingPeriodStart, "billingPeriodStart"),
    billingPeriodEnd:
      args.billingPeriodEnd === undefined
        ? undefined
        : normalizeOptionalDate(args.billingPeriodEnd, "billingPeriodEnd"),
  };
  validateVoucherDateState(state, { requireCompleteBillingPeriod: true });
  return state;
}

export function resolveVoucherDatePatch(args: {
  current: VoucherDateState;
  patch: Partial<{
    validFrom: VoucherDateValue;
    validUntil: VoucherDateValue;
    billingPeriodStart: VoucherDateValue | null;
    billingPeriodEnd: VoucherDateValue | null;
  }>;
}): VoucherDatePatchResolution {
  const normalizedPatch: VoucherDatePatch = {};

  if (args.patch.validFrom !== undefined) {
    normalizedPatch.validFrom = normalizeRequiredDate(
      args.patch.validFrom,
      "validFrom",
    );
  }
  if (args.patch.validUntil !== undefined) {
    normalizedPatch.validUntil = normalizeRequiredDate(
      args.patch.validUntil,
      "validUntil",
    );
  }
  if (args.patch.billingPeriodStart !== undefined) {
    normalizedPatch.billingPeriodStart = normalizeOptionalDate(
      args.patch.billingPeriodStart,
      "billingPeriodStart",
    );
  }
  if (args.patch.billingPeriodEnd !== undefined) {
    normalizedPatch.billingPeriodEnd = normalizeOptionalDate(
      args.patch.billingPeriodEnd,
      "billingPeriodEnd",
    );
  }

  const state: VoucherDateState = {
    validFrom: normalizedPatch.validFrom ?? args.current.validFrom,
    validUntil: normalizedPatch.validUntil ?? args.current.validUntil,
    billingPeriodStart:
      normalizedPatch.billingPeriodStart !== undefined
        ? normalizedPatch.billingPeriodStart
        : args.current.billingPeriodStart,
    billingPeriodEnd:
      normalizedPatch.billingPeriodEnd !== undefined
        ? normalizedPatch.billingPeriodEnd
        : args.current.billingPeriodEnd,
  };
  const validityChanged =
    normalizedPatch.validFrom !== undefined ||
    normalizedPatch.validUntil !== undefined;
  const billingPeriodChanged =
    normalizedPatch.billingPeriodStart !== undefined ||
    normalizedPatch.billingPeriodEnd !== undefined;
  const changed = validityChanged || billingPeriodChanged;
  if (changed) {
    validateVoucherDateState(state, { requireCompleteBillingPeriod: true });
  }

  return {
    state,
    patch: normalizedPatch,
    changed,
    validityChanged,
    billingPeriodChanged,
  };
}

export function resolveCourseVoucherDatePatch(args: {
  current: VoucherDateState;
  patch: Partial<{
    validFrom: VoucherDateValue;
    validUntil: VoucherDateValue;
    billingPeriodStart: VoucherDateValue | null;
    billingPeriodEnd: VoucherDateValue | null;
  }>;
}): VoucherDatePatchResolution {
  const hasStart = args.patch.billingPeriodStart !== undefined;
  const hasEnd = args.patch.billingPeriodEnd !== undefined;
  if (hasStart || hasEnd) {
    const startValue = hasStart
      ? args.patch.billingPeriodStart
      : args.current.billingPeriodStart;
    const endValue = hasEnd
      ? args.patch.billingPeriodEnd
      : args.current.billingPeriodEnd;
    if (startValue == null || endValue == null) {
      throw new VoucherDatePolicyError(
        "Course voucher period requires both start and end dates",
      );
    }
  }

  return resolveVoucherDatePatch(args);
}
