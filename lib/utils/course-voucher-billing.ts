import type { CourseOperationalPolicies } from "@/lib/types/course-policies";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(value: Date) {
  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid billing date");
  }

  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

function addMonthsClamped(value: Date, months: number, anchorDay: number) {
  const targetMonth = new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, 1),
  );
  const lastDay = new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetMonth.getUTCFullYear(),
      targetMonth.getUTCMonth(),
      Math.min(Math.max(anchorDay, 1), lastDay),
    ),
  );
}

export function calculateIndividualBillingPeriod({
  memberJoinedAt,
  billingStartedAt,
  existingBillingAnchorDay,
  nextBillingDate,
  selectedStartDate,
}: {
  memberJoinedAt: Date;
  billingStartedAt?: Date | null;
  existingBillingAnchorDay?: number | null;
  nextBillingDate?: Date | null;
  selectedStartDate?: Date | null;
}) {
  const periodStart = startOfUtcDay(
    nextBillingDate ?? selectedStartDate ?? memberJoinedAt,
  );
  const billingAnchorDay =
    billingStartedAt &&
    typeof existingBillingAnchorDay === "number" &&
    existingBillingAnchorDay >= 1 &&
    existingBillingAnchorDay <= 31
      ? existingBillingAnchorDay
      : billingStartedAt
        ? startOfUtcDay(billingStartedAt).getUTCDate()
        : periodStart.getUTCDate();
  const followingBillingDate = addMonthsClamped(
    periodStart,
    1,
    billingAnchorDay,
  );
  const periodEnd = new Date(followingBillingDate.getTime() - DAY_IN_MS);

  return {
    periodStart,
    periodEnd,
    billingAnchorDay,
    nextBillingDate: followingBillingDate,
  };
}

export function calculateCourseVoucherCredits({
  periodStart,
  periodEnd,
  coursePolicies,
  manualCredits,
}: {
  periodStart: Date;
  periodEnd: Date;
  coursePolicies: CourseOperationalPolicies;
  manualCredits?: number | null;
}) {
  const preferredWeekdays = new Set(
    coursePolicies.schedulingDefaults.preferredWeekdays,
  );
  let classOccurrencesCount = 0;

  if (preferredWeekdays.size > 0) {
    for (
      let cursor = startOfUtcDay(periodStart);
      cursor.getTime() <= startOfUtcDay(periodEnd).getTime();
      cursor = new Date(cursor.getTime() + DAY_IN_MS)
    ) {
      if (preferredWeekdays.has(cursor.getUTCDay())) {
        classOccurrencesCount += 1;
      }
    }
  }

  const creditsPerLesson = coursePolicies.creditPolicy.creditsPerLesson;
  const creditsTotal =
    typeof manualCredits === "number" && Number.isFinite(manualCredits)
      ? Math.max(0, manualCredits)
      : classOccurrencesCount * creditsPerLesson;

  return {
    creditsTotal,
    classOccurrencesCount,
    creditsPerLesson,
  };
}
