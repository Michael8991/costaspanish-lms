type DateOnlyInput = Date | string;

export type VoucherTemporalStatus = "upcoming" | "active" | "expired";
export type VoucherEffectiveStatus =
  | VoucherTemporalStatus
  | "exhausted"
  | "canceled";

function toDate(value: DateOnlyInput): Date {
  return value instanceof Date
    ? value
    : new Date(value);
}

export function startOfUtcDay(
  value: DateOnlyInput,
): Date {
  const date = toDate(value);

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

export function isDateOnlyExpired(
  validUntil: DateOnlyInput,
  now: Date = new Date(),
): boolean {
  const validUntilDate =
    toDate(validUntil);

  if (
    Number.isNaN(validUntilDate.getTime()) ||
    Number.isNaN(now.getTime())
  ) {
    return false;
  }

  return (
    startOfUtcDay(validUntilDate).getTime() <
    startOfUtcDay(now).getTime()
  );
}

export function getVoucherTemporalStatus(
  validity: {
    validFrom?: DateOnlyInput | null;
    validUntil?: DateOnlyInput | null;
  },
  now: Date = new Date(),
): VoucherTemporalStatus {
  if (Number.isNaN(now.getTime())) return "active";

  const today = startOfUtcDay(now).getTime();
  const validFrom = validity.validFrom
    ? toDate(validity.validFrom)
    : null;
  const validUntil = validity.validUntil
    ? toDate(validity.validUntil)
    : null;

  if (validFrom && !Number.isNaN(validFrom.getTime())) {
    if (today < startOfUtcDay(validFrom).getTime()) return "upcoming";
  }
  if (validUntil && !Number.isNaN(validUntil.getTime())) {
    if (today > startOfUtcDay(validUntil).getTime()) return "expired";
  }

  return "active";
}

export function getVoucherEffectiveStatus(
  voucher: {
    status?: string | null;
    creditsRemaining?: number | null;
    validFrom?: DateOnlyInput | null;
    validUntil?: DateOnlyInput | null;
  },
  now: Date = new Date(),
): VoucherEffectiveStatus {
  if (voucher.status === "canceled" || voucher.status === "cancelled") {
    return "canceled";
  }
  if (
    voucher.status === "exhausted" ||
    (typeof voucher.creditsRemaining === "number" &&
      voucher.creditsRemaining <= 0)
  ) {
    return "exhausted";
  }

  return getVoucherTemporalStatus(voucher, now);
}

export function formatDateOnlyUtc(
  value: DateOnlyInput,
  locale = "es-ES",
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(date);
}
