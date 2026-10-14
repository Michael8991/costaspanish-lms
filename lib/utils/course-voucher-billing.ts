import type { CourseOperationalPolicies } from "@/lib/types/course-policies";
import { Types } from "mongoose";
import type { ICourseMember } from "@/models/CourseProfile";

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

function resolveBillingAnchorDay(
  periodStart: Date,
  existingBillingAnchorDay?: number | null,
) {
  const startDay = periodStart.getUTCDate();
  const lastDayOfStartMonth = new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const existingAnchorIsValid =
    typeof existingBillingAnchorDay === "number" &&
    existingBillingAnchorDay >= 1 &&
    existingBillingAnchorDay <= 31;

  // Preserve a larger anchor only when this period genuinely starts on a
  // clamped month-end (31 January -> 28/29 February -> 31 March). If the
  // current month can represent the stored anchor, the selected period start
  // is authoritative: a period beginning on the 9th renews on the 9th.
  return existingAnchorIsValid &&
      existingBillingAnchorDay > lastDayOfStartMonth &&
      startDay === lastDayOfStartMonth
    ? existingBillingAnchorDay
    : startDay;
}

export function isPrivateManualVoucherCourse({
  classType,
  courseType,
}: {
  classType?: string | null;
  courseType?: string | null;
}) {
  return classType === "private" || courseType === "private_flexible";
}

export type CourseVoucherPeriod = {
  periodStart: Date;
  periodEnd: Date;
  billingAnchorDay: number;
  nextBillingDate: Date | null;
  advancesNextBillingDate: boolean;
};

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
  const billingAnchorDay = resolveBillingAnchorDay(
    periodStart,
    billingStartedAt ? existingBillingAnchorDay : null,
  );
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

export function calculateCourseVoucherPeriod({
  classType,
  courseType,
  memberJoinedAt,
  billingStartedAt,
  existingBillingAnchorDay,
  nextBillingDate,
  selectedStartDate,
  selectedEndDate,
}: {
  classType?: string | null;
  courseType?: string | null;
  memberJoinedAt: Date;
  billingStartedAt?: Date | null;
  existingBillingAnchorDay?: number | null;
  nextBillingDate?: Date | null;
  selectedStartDate?: Date | null;
  selectedEndDate?: Date | null;
}): CourseVoucherPeriod {
  if (isPrivateManualVoucherCourse({ classType, courseType })) {
    if (!selectedStartDate || !selectedEndDate) {
      throw new Error(
        "Private manual vouchers require selectedStartDate and selectedEndDate",
      );
    }

    const periodStart = startOfUtcDay(selectedStartDate);
    const periodEnd = startOfUtcDay(selectedEndDate);

    if (periodEnd.getTime() < periodStart.getTime()) {
      throw new Error("selectedEndDate cannot be before selectedStartDate");
    }

    return {
      periodStart,
      periodEnd,
      billingAnchorDay: periodStart.getUTCDate(),
      nextBillingDate: null,
      advancesNextBillingDate: false,
    };
  }

  return {
    ...calculateIndividualBillingPeriod({
      memberJoinedAt,
      billingStartedAt,
      existingBillingAnchorDay,
      nextBillingDate,
      selectedStartDate,
    }),
    advancesNextBillingDate: true,
  };
}

export function resolveNextBillingDateAfterVoucherGeneration({
  currentNextBillingDate,
  generatedNextBillingDate,
  advancesNextBillingDate,
}: {
  currentNextBillingDate?: Date | null;
  generatedNextBillingDate?: Date | null;
  advancesNextBillingDate: boolean;
}) {
  if (!advancesNextBillingDate) return null;
  if (generatedNextBillingDate) {
    return startOfUtcDay(generatedNextBillingDate);
  }
  return currentNextBillingDate ? startOfUtcDay(currentNextBillingDate) : null;
}

export type GeneratedMemberBillingUpdate = {
  studentId: string;
  voucherId: string;
  periodStart: string;
  nextBillingDate?: string | null;
  advancesNextBillingDate: boolean;
  billingAnchorDay: number;
};

export function buildCourseMemberBillingBulkOperations(args: {
  courseId: Types.ObjectId;
  members: ICourseMember[];
  generatedItems: GeneratedMemberBillingUpdate[];
}) {
  const memberByStudentId = new Map(
    args.members.map((member) => [member.studentId.toString(), member]),
  );

  return args.generatedItems.map((generated) => {
    const member = memberByStudentId.get(generated.studentId);
    if (!member) {
      throw new Error(
        `Course member ${generated.studentId} is missing from the billing projection`,
      );
    }

    const currentNextBillingDate = member.billing.nextBillingDate
      ? new Date(member.billing.nextBillingDate)
      : null;
    const nextBillingDate = resolveNextBillingDateAfterVoucherGeneration({
      currentNextBillingDate,
      generatedNextBillingDate: generated.nextBillingDate
        ? new Date(generated.nextBillingDate)
        : null,
      advancesNextBillingDate: generated.advancesNextBillingDate,
    });
    const voucherId = new Types.ObjectId(generated.voucherId);

    return {
      updateOne: {
        filter: {
          _id: args.courseId,
          "members.studentId": new Types.ObjectId(generated.studentId),
        },
        update: {
          $set: {
            "members.$.billing.mode": "individual_cycle" as const,
            "members.$.billing.billingAnchorDay":
              member.billing.billingAnchorDay ?? generated.billingAnchorDay,
            "members.$.billing.billingStartedAt":
              member.billing.billingStartedAt ?? new Date(generated.periodStart),
            "members.$.billing.nextBillingDate": nextBillingDate,
            "members.$.billing.firstVoucherId":
              member.billing.firstVoucherId ?? voucherId,
            "members.$.billing.lastVoucherId": voucherId,
          },
        },
      },
    };
  });
}

export function getCourseVoucherPlanDates({
  periodStart,
  periodEnd,
}: {
  periodStart: string;
  periodEnd: string;
}) {
  const validFrom = startOfUtcDay(new Date(periodStart));
  const validUntil = startOfUtcDay(new Date(periodEnd));

  return {
    validFrom,
    validUntil,
    billingPeriodStart: validFrom,
    billingPeriodEnd: validUntil,
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
