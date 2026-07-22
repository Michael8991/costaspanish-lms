export type LessonDurationBlockInput = {
  estimatedMinutes?: number | string | null;
  actualMinutes?: number | string | null;
  completionStatus?: string | null;
};

function toMinuteNumber(
  value: number | string | null | undefined,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  ) {
    return undefined;
  }

  const numericValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return undefined;
  }

  return numericValue;
}

export function calculateTotalEstimatedMinutes(
  blocks: LessonDurationBlockInput[] = [],
): number {
  return blocks.reduce((total, block) => {
    return total + (toMinuteNumber(block.estimatedMinutes) ?? 0);
  }, 0);
}

export function calculateTotalActualMinutes(
  blocks: LessonDurationBlockInput[] = [],
): number {
  return blocks.reduce((total, block) => {
    const actualMinutes = toMinuteNumber(block.actualMinutes);

    if (actualMinutes !== undefined) {
      return total + actualMinutes;
    }

    if (block.completionStatus === "completed") {
      return total + (toMinuteNumber(block.estimatedMinutes) ?? 0);
    }

    return total;
  }, 0);
}

export function calculateScheduledDurationMinutes(
  scheduledStart?: string | Date | null,
  scheduledEnd?: string | Date | null,
): number {
  if (!scheduledStart || !scheduledEnd) return 0;

  const start = new Date(scheduledStart);
  const end = new Date(scheduledEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const durationMs = end.getTime() - start.getTime();

  if (durationMs <= 0) return 0;

  return Math.round(durationMs / 60_000);
}
