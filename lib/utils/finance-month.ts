import { zonedDateTimeToISOString } from "@/lib/utils/time-zone";

export const BUSINESS_TIMEZONE = "Europe/Madrid";
export const BUSINESS_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export type BusinessMonthRange = {
  start: Date;
  end: Date;
};

function getNextMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextYear = monthNumber === 12 ? year + 1 : year;
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;

  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

export function getBusinessMonthRange(
  month: string,
  timeZone = BUSINESS_TIMEZONE,
): BusinessMonthRange {
  if (!BUSINESS_MONTH_PATTERN.test(month)) {
    throw new Error("month must use YYYY-MM format");
  }

  const nextMonth = getNextMonth(month);

  return {
    start: new Date(
      zonedDateTimeToISOString(`${month}-01T00:00:00`, timeZone),
    ),
    end: new Date(
      zonedDateTimeToISOString(`${nextMonth}-01T00:00:00`, timeZone),
    ),
  };
}

export function getCurrentBusinessMonth(
  now = new Date(),
  timeZone = BUSINESS_TIMEZONE,
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    throw new Error("Could not determine the current business month");
  }

  return `${year}-${month}`;
}
