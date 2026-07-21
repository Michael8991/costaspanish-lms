const DATETIME_LOCAL_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function getDateTimeParts(date: Date, timeZone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getDateTimeParts(date, timeZone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return representedAsUtc - date.getTime();
}

export function zonedDateTimeToISOString(value: string, timeZone: string) {
  const match = DATETIME_LOCAL_PATTERN.exec(value);

  if (!match) {
    throw new Error("Invalid local date and time");
  }

  const expected: DateTimeParts = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
  const wallTimeAsUtc = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
    expected.second,
  );
  let utcTime = wallTimeAsUtc;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = getTimeZoneOffset(new Date(utcTime), timeZone);
    const adjustedTime = wallTimeAsUtc - offset;

    if (adjustedTime === utcTime) break;
    utcTime = adjustedTime;
  }

  const date = new Date(utcTime);
  const actual = getDateTimeParts(date, timeZone);
  const isValid = Object.keys(expected).every(
    (key) =>
      actual[key as keyof DateTimeParts] ===
      expected[key as keyof DateTimeParts],
  );

  if (!isValid) {
    throw new Error("The selected time does not exist in this time zone");
  }

  return date.toISOString();
}

export function isoToDatetimeLocalValue(value: string, timeZone: string) {
  const parts = getDateTimeParts(new Date(value), timeZone);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}
