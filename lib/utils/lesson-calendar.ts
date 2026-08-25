import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import {
  dateValueToLocalDate,
  formatLocalDateValue,
} from "@/lib/utils/lesson-datetime";

export type LessonCalendarView = "day" | "week" | "month" | "list";

export type LessonCalendarRange = {
  start: Date;
  end: Date;
};

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 22;

export function isLessonCalendarView(
  value: string | undefined,
): value is LessonCalendarView {
  return (
    value === "day" ||
    value === "week" ||
    value === "month" ||
    value === "list"
  );
}

export function isValidLessonDateValue(value: string | undefined): boolean {
  if (!value) return false;

  const date = dateValueToLocalDate(value);

  return Boolean(date && formatLocalDateValue(date) === value);
}

export function getTodayLessonDateValue(
  now = new Date(),
  timeZone = "Europe/Madrid",
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const valueByPart = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${valueByPart.year}-${valueByPart.month}-${valueByPart.day}`;
}

export function addCalendarDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

export function addCalendarMonths(date: Date, amount: number): Date {
  const day = date.getDate();
  const next = new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
  const lastDayOfTargetMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();

  next.setDate(Math.min(day, lastDayOfTargetMonth));
  return next;
}

export function startOfLessonWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  return start;
}

export function getLessonVisibleRange(
  view: LessonCalendarView,
  selectedDate: Date,
): LessonCalendarRange {
  if (view === "day") {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);

    return { start, end: addCalendarDays(start, 1) };
  }

  if (view === "month") {
    const firstOfMonth = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      1,
    );
    const start = startOfLessonWeek(firstOfMonth);

    return { start, end: addCalendarDays(start, 42) };
  }

  const start = startOfLessonWeek(selectedDate);
  return { start, end: addCalendarDays(start, 7) };
}

function capitalize(value: string): string {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1);
}

export function getLessonPeriodLabel(
  view: LessonCalendarView,
  selectedDate: Date,
  locale: string,
): string {
  const resolvedLocale = locale === "es" ? "es-ES" : "en-GB";

  if (view === "day") {
    return capitalize(
      new Intl.DateTimeFormat(resolvedLocale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(selectedDate),
    );
  }

  if (view === "month") {
    return capitalize(
      new Intl.DateTimeFormat(resolvedLocale, {
        month: "long",
        year: "numeric",
      }).format(selectedDate),
    );
  }

  const start = startOfLessonWeek(selectedDate);
  const end = addCalendarDays(start, 6);
  return capitalize(
    new Intl.DateTimeFormat(resolvedLocale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).formatRange(start, end),
  );
}

function toHourDuration(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

export function getLessonCalendarHours(
  lessons: LessonListDTO[],
): { slotMinTime: string; slotMaxTime: string } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  lessons.forEach((lesson) => {
    const start = new Date(lesson.scheduledStart);
    const end = new Date(lesson.scheduledEnd);

    if (!Number.isNaN(start.getTime())) {
      startHour = Math.min(startHour, start.getHours());
    }

    if (!Number.isNaN(end.getTime())) {
      const roundedEndHour = end.getHours() + (end.getMinutes() > 0 ? 1 : 0);
      endHour = Math.max(endHour, roundedEndHour);
    }
  });

  return {
    slotMinTime: toHourDuration(Math.max(0, startHour)),
    slotMaxTime: toHourDuration(Math.min(24, endHour)),
  };
}

export function getLessonViewNavigationDate(
  view: LessonCalendarView,
  selectedDate: Date,
  direction: -1 | 1,
): Date {
  if (view === "day") return addCalendarDays(selectedDate, direction);
  if (view === "month") return addCalendarMonths(selectedDate, direction);

  return addCalendarDays(selectedDate, direction * 7);
}
