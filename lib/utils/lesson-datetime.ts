export type LessonCalendarDay = {
  dateValue: string;
  dayNumber: number;
  isCurrentMonth: boolean;
};

const datetimeLocalPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const dateValuePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const timeValuePattern = /^(\d{2}):(\d{2})$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDatetimeLocal(value: string) {
  const match = datetimeLocalPattern.exec(value);
  if (!match) return undefined;

  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function formatDatetimeLocal(date: Date) {
  return `${formatLocalDateValue(date)}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

export function formatLocalDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}`;
}

export function dateValueToLocalDate(dateValue: string) {
  const match = dateValuePattern.exec(dateValue);
  if (!match) return undefined;

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day, 12);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function getMonthDays(viewDate: Date): LessonCalendarDay[] {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1, 12);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - mondayOffset, 12);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      dateValue: formatLocalDateValue(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month,
    };
  });
}

export function combineDateAndTimeToDatetimeLocal(
  dateValue: string,
  timeValue: string,
) {
  if (!dateValuePattern.test(dateValue) || !timeValuePattern.test(timeValue)) {
    return "";
  }

  return `${dateValue}T${timeValue}`;
}

export function addMinutesToDatetimeLocal(
  datetimeLocal: string,
  minutes: number,
) {
  const date = parseDatetimeLocal(datetimeLocal);
  if (!date || !Number.isFinite(minutes)) return "";

  date.setMinutes(date.getMinutes() + minutes);
  return formatDatetimeLocal(date);
}

export function getDurationMinutesFromStartEnd(
  scheduledStart: string,
  scheduledEnd: string,
) {
  const start = parseDatetimeLocal(scheduledStart);
  const end = parseDatetimeLocal(scheduledEnd);
  if (!start || !end) return undefined;

  const durationMinutes = Math.round(
    (end.getTime() - start.getTime()) / 60_000,
  );

  return durationMinutes > 0 ? durationMinutes : undefined;
}

export function getDatetimeLocalDateValue(datetimeLocal: string) {
  return datetimeLocalPattern.exec(datetimeLocal)?.[0].slice(0, 10) ?? "";
}

export function getDatetimeLocalTimeValue(datetimeLocal: string) {
  return datetimeLocalPattern.exec(datetimeLocal)?.[0].slice(11, 16) ?? "";
}
