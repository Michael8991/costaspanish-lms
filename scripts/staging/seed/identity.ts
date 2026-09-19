import { Types } from "mongoose";

export const SEED_NAME = "costaspanish-demo-v2";
export const SEED_PREFIX = "c05a2026";
const entities = { teacher: 1, student: 2, template: 3, course: 4, enrollment: 5,
  voucher: 6, payment: 7, lesson: 8, resource: 9, credit: 10, block: 11 } as const;

export function seedId(entity: keyof typeof entities, index: number) {
  if (!Number.isSafeInteger(index) || index < 0) throw new Error("Invalid seed index");
  return new Types.ObjectId(`${SEED_PREFIX}${entities[entity].toString(16).padStart(4, "0")}${index.toString(16).padStart(12, "0")}`);
}

export function utcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function shiftDays(date: Date, days: number) {
  const result = utcDay(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function monthPeriod(date: Date, offset = 0) {
  return {
    start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1)),
    end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset + 1, 0)),
  };
}

export function atUtcHour(date: Date, hour: number) {
  const result = utcDay(date);
  result.setUTCHours(hour);
  return result;
}
