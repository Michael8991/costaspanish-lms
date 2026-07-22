export const WEEKDAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type WeekdayValue = (typeof WEEKDAY_VALUES)[number];

export type RecurringLessonDate = {
  scheduledStart: string;
  scheduledEnd: string;
  weekday: WeekdayValue;
};

type GenerateWeeklyRecurringLessonDatesInput = {
  scheduledStart: string;
  scheduledEnd: string;
  daysOfWeek: WeekdayValue[];
  endsOn: string;
};

const datetimeLocalPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const weekdayByIndex: WeekdayValue[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseDateOnly(value: string) {
  const match = dateOnlyPattern.exec(value);
  if (!match) return undefined;

  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    23,
    59,
    59,
    999,
  );
  const date = new Date(timestamp);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseRecurringDateTime(value: string) {
  const localMatch = datetimeLocalPattern.exec(value);

  if (localMatch) {
    const timestamp = Date.UTC(
      Number(localMatch[1]),
      Number(localMatch[2]) - 1,
      Number(localMatch[3]),
      Number(localMatch[4]),
      Number(localMatch[5]),
      Number(localMatch[6] ?? 0),
    );

    return {
      date: new Date(timestamp),
      outputFormat: "local" as const,
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return { date, outputFormat: "iso" as const };
}

function formatRecurringDateTime(date: Date, outputFormat: "local" | "iso") {
  if (outputFormat === "iso") return date.toISOString();

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate(),
  )}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function getWeekdayValueFromDateTime(value: string) {
  const parsed = parseRecurringDateTime(value);
  return parsed ? weekdayByIndex[parsed.date.getUTCDay()] : undefined;
}

export function generateWeeklyRecurringLessonDates({
  scheduledStart,
  scheduledEnd,
  daysOfWeek,
  endsOn,
}: GenerateWeeklyRecurringLessonDatesInput): RecurringLessonDate[] {
  const parsedStart = parseRecurringDateTime(scheduledStart);
  const parsedEnd = parseRecurringDateTime(scheduledEnd);
  const endDate = parseDateOnly(endsOn);

  if (
    !parsedStart ||
    !parsedEnd ||
    !endDate ||
    daysOfWeek.length === 0 ||
    parsedEnd.date <= parsedStart.date
  ) {
    return [];
  }

  const selectedDays = new Set(daysOfWeek);
  const durationMilliseconds =
    parsedEnd.date.getTime() - parsedStart.date.getTime();
  const cursor = new Date(
    Date.UTC(
      parsedStart.date.getUTCFullYear(),
      parsedStart.date.getUTCMonth(),
      parsedStart.date.getUTCDate(),
      parsedStart.date.getUTCHours(),
      parsedStart.date.getUTCMinutes(),
      parsedStart.date.getUTCSeconds(),
    ),
  );
  const occurrences: RecurringLessonDate[] = [];
  const seenStarts = new Set<string>();

  while (cursor <= endDate && occurrences.length < 60) {
    const weekday = weekdayByIndex[cursor.getUTCDay()];

    if (selectedDays.has(weekday)) {
      const occurrenceEnd = new Date(
        cursor.getTime() + durationMilliseconds,
      );
      const occurrenceStartValue = formatRecurringDateTime(
        cursor,
        parsedStart.outputFormat,
      );

      if (!seenStarts.has(occurrenceStartValue)) {
        occurrences.push({
          scheduledStart: occurrenceStartValue,
          scheduledEnd: formatRecurringDateTime(
            occurrenceEnd,
            parsedStart.outputFormat,
          ),
          weekday,
        });
        seenStarts.add(occurrenceStartValue);
      }
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return occurrences.sort((first, second) =>
    first.scheduledStart.localeCompare(second.scheduledStart),
  );
}

export function includeBaseLessonOccurrence(
  occurrences: RecurringLessonDate[],
  scheduledStart: string,
  scheduledEnd: string,
) {
  if (
    occurrences.some(
      (occurrence) => occurrence.scheduledStart === scheduledStart,
    )
  ) {
    return occurrences.slice(0, 60);
  }

  const weekday = getWeekdayValueFromDateTime(scheduledStart);
  if (!weekday) return occurrences.slice(0, 60);

  return [
    { scheduledStart, scheduledEnd, weekday },
    ...occurrences,
  ]
    .sort((first, second) =>
      first.scheduledStart.localeCompare(second.scheduledStart),
    )
    .slice(0, 60);
}
