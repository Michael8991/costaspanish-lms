type DateOnlyInput = Date | string;

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