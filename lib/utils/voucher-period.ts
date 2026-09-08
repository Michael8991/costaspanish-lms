const UTC_DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Voucher validity fields are calendar dates stored as UTC-midnight Dates.
 * Comparing their UTC calendar-day keys avoids treating validUntil midnight as
 * the first (and only) instant of the final valid day.
 */
export function getUtcCalendarDay(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
}

export function isDateWithinVoucherValidity(
  date: Date | string,
  validFrom: Date | string,
  validUntil: Date | string,
) {
  const lessonDay = getUtcCalendarDay(date);
  const firstDay = getUtcCalendarDay(validFrom);
  const lastDay = getUtcCalendarDay(validUntil);

  return lessonDay !== null && firstDay !== null && lastDay !== null &&
    firstDay <= lessonDay && lessonDay <= lastDay;
}

export function voucherPeriodsOverlap(args: {
  firstStart: Date | string;
  firstEnd: Date | string;
  secondStart: Date | string;
  secondEnd: Date | string;
}) {
  const firstStart = getUtcCalendarDay(args.firstStart);
  const firstEnd = getUtcCalendarDay(args.firstEnd);
  const secondStart = getUtcCalendarDay(args.secondStart);
  const secondEnd = getUtcCalendarDay(args.secondEnd);

  return firstStart !== null && firstEnd !== null &&
    secondStart !== null && secondEnd !== null &&
    firstStart <= secondEnd && firstEnd >= secondStart;
}

export function previousUtcCalendarDay(value: Date | string) {
  const day = getUtcCalendarDay(value);
  if (day === null) throw new Error("Invalid voucher date");
  return new Date(day - UTC_DAY_IN_MS);
}
