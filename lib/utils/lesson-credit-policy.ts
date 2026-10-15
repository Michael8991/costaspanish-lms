import type {
  ConsumptionByAttendance,
  CourseOperationalPolicies,
  TemplateClassType,
} from "@/lib/types/course-policies";
import type {
  AppliedLessonCreditPolicySnapshot,
  LessonAttendanceStatus,
  LessonCreditPolicySource,
  LessonCreditSettlementReason,
  LessonCreditSettlementSource,
  LessonPolicySnapshot,
} from "@/lib/types/lesson";
import {
  getDefaultConsumptionByAttendance,
  normalizeCourseOperationalPolicies,
} from "@/lib/utils/course-policies";

export interface EffectiveLessonCreditPolicy {
  mode: "course" | "legacy";
  creditsPerLesson: number;
  consumeOn: "completion" | "scheduled";
  trialConsumesCredit: boolean;
  cancellationConsumesCredit: boolean;
  noShowConsumesCredit: boolean;
  consumptionByAttendance: ConsumptionByAttendance;
}

export interface EffectiveLessonCreditPolicyResult {
  policy: EffectiveLessonCreditPolicy;
  source: LessonCreditSettlementSource;
  policySource: LessonCreditPolicySource;
}

interface LessonPolicyInput {
  courseId?: unknown;
  classType?: TemplateClassType;
  policySnapshot?: Pick<
    LessonPolicySnapshot,
    "creditPolicy" | "lessonDefaults"
  > | null;
}

interface CoursePolicyInput {
  classType?: TemplateClassType;
  policies?: Partial<CourseOperationalPolicies> | null;
}

interface CreditCalculationAttendee {
  attendanceStatus: LessonAttendanceStatus;
  creditsToConsume?: number;
  isTrial?: boolean;
}

function nonNegativeCredits(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, value)
    : fallback;
}

function getLessonClassType(lesson: LessonPolicyInput): TemplateClassType {
  return (
    lesson.classType ??
    lesson.policySnapshot?.lessonDefaults.defaultClassType ??
    "private"
  );
}

export function resolveEffectiveLessonCreditPolicy({
  lesson,
  courseProfile,
}: {
  lesson: LessonPolicyInput;
  courseProfile?: CoursePolicyInput | null;
}): EffectiveLessonCreditPolicyResult {
  if (lesson.courseId && courseProfile) {
    const creditPolicy = normalizeCourseOperationalPolicies(
      courseProfile.policies,
      courseProfile.classType ?? getLessonClassType(lesson),
    ).creditPolicy;

    return {
      policy: {
        mode: "course",
        creditsPerLesson: creditPolicy.creditsPerLesson,
        consumeOn: creditPolicy.consumeOn,
        trialConsumesCredit: creditPolicy.trialConsumesCredit,
        cancellationConsumesCredit:
          creditPolicy.cancellationConsumesCredit,
        noShowConsumesCredit: creditPolicy.noShowConsumesCredit,
        consumptionByAttendance: {
          ...creditPolicy.consumptionByAttendance,
        },
      },
      source: "course_policy",
      policySource: "course_profile",
    };
  }

  if (lesson.courseId) {
    throw new Error(
      "CourseProfile is required to resolve credit policy for a course lesson",
    );
  }

  return {
    policy: {
      mode: "legacy",
      creditsPerLesson: 0,
      consumeOn: "completion",
      trialConsumesCredit: false,
      cancellationConsumesCredit: false,
      noShowConsumesCredit: true,
      consumptionByAttendance: getDefaultConsumptionByAttendance(
        getLessonClassType(lesson),
      ),
    },
    source: "legacy_attendees",
    policySource: "legacy",
  };
}

export function buildAppliedPolicySnapshot(
  policy: EffectiveLessonCreditPolicy,
): AppliedLessonCreditPolicySnapshot | undefined {
  if (policy.mode !== "course") return undefined;

  return {
    creditsPerLesson: policy.creditsPerLesson,
    consumeOn: policy.consumeOn,
    trialConsumesCredit: policy.trialConsumesCredit,
    consumptionByAttendance: { ...policy.consumptionByAttendance },
  };
}

export function calculateCreditsForAttendee({
  attendee,
  policy,
  legacyCreditsToConsume,
}: {
  attendee: CreditCalculationAttendee;
  policy: EffectiveLessonCreditPolicy;
  legacyCreditsToConsume?: number;
}): {
  creditsPlanned: number;
  creditsConsumed: number;
  reason: LessonCreditSettlementReason;
} {
  if (policy.mode === "legacy") {
    const creditsPlanned = nonNegativeCredits(
      legacyCreditsToConsume ?? attendee.creditsToConsume,
      1,
    );

    if (attendee.isTrial) {
      return {
        creditsPlanned,
        creditsConsumed: 0,
        reason: "trial_free",
      };
    }

    const shouldConsume = [
      "attended",
      "no_show",
      "canceled_late",
    ].includes(attendee.attendanceStatus);

    return {
      creditsPlanned,
      creditsConsumed: shouldConsume ? creditsPlanned : 0,
      reason: shouldConsume ? "legacy" : "absent_free",
    };
  }

  const creditsPlanned = nonNegativeCredits(policy.creditsPerLesson, 0);

  if (policy.consumeOn === "scheduled") {
    return {
      creditsPlanned,
      creditsConsumed: 0,
      reason: "scheduled_policy_not_processed_on_completion",
    };
  }

  if (attendee.isTrial && !policy.trialConsumesCredit) {
    return {
      creditsPlanned,
      creditsConsumed: 0,
      reason: "trial_free",
    };
  }

  const attendanceStatus = attendee.attendanceStatus;
  if (attendanceStatus === "pending") {
    return {
      creditsPlanned,
      creditsConsumed: 0,
      reason: "absent_free",
    };
  }

  const shouldConsume =
    policy.consumptionByAttendance[attendanceStatus];
  const reasonByAttendance = {
    attended: shouldConsume ? "attended" : "no_voucher_required",
    no_show: shouldConsume ? "no_show_charged" : "no_show_free",
    canceled_late: shouldConsume
      ? "canceled_late_charged"
      : "canceled_late_free",
    canceled_early: shouldConsume
      ? "canceled_early_charged"
      : "canceled_early_free",
  } as const;

  return {
    creditsPlanned,
    creditsConsumed: shouldConsume ? creditsPlanned : 0,
    reason: reasonByAttendance[attendanceStatus],
  };
}
