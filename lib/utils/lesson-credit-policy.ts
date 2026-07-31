import type { CourseOperationalPolicies } from "@/lib/types/course-policies";
import type {
  LessonAttendanceStatus,
  LessonCreditPolicySource,
  LessonCreditSettlementReason,
  LessonCreditSettlementSource,
  LessonPolicySnapshot,
} from "@/lib/types/lesson";
import { normalizeCourseOperationalPolicies } from "@/lib/utils/course-policies";

export interface EffectiveLessonCreditPolicy {
  mode: "course" | "legacy";
  creditsPerLesson: number;
  consumeOn: "completion" | "scheduled";
  trialConsumesCredit: boolean;
  cancellationConsumesCredit: boolean;
  noShowConsumesCredit: boolean;
}

export interface EffectiveLessonCreditPolicyResult {
  policy: EffectiveLessonCreditPolicy;
  source: LessonCreditSettlementSource;
  policySource: LessonCreditPolicySource;
}

interface LessonPolicyInput {
  courseId?: unknown;
  policySnapshot?: Pick<LessonPolicySnapshot, "creditPolicy"> | null;
}

interface CoursePolicyInput {
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

export function resolveEffectiveLessonCreditPolicy({
  lesson,
  courseProfile,
}: {
  lesson: LessonPolicyInput;
  courseProfile?: CoursePolicyInput | null;
}): EffectiveLessonCreditPolicyResult {
  if (lesson.policySnapshot?.creditPolicy) {
    const creditPolicy = lesson.policySnapshot.creditPolicy;

    return {
      policy: {
        mode: "course",
        creditsPerLesson: nonNegativeCredits(
          creditPolicy.creditsPerLesson,
          0,
        ),
        consumeOn: creditPolicy.consumeOn,
        trialConsumesCredit: creditPolicy.trialConsumesCredit,
        cancellationConsumesCredit:
          creditPolicy.cancellationConsumesCredit,
        noShowConsumesCredit: creditPolicy.noShowConsumesCredit,
      },
      source: "course_policy",
      policySource: "lesson_snapshot",
    };
  }

  if (lesson.courseId && courseProfile) {
    const creditPolicy = normalizeCourseOperationalPolicies(
      courseProfile.policies,
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
      },
      source: "course_policy_fallback",
      policySource: "course_profile",
    };
  }

  return {
    policy: {
      mode: "legacy",
      creditsPerLesson: 0,
      consumeOn: "completion",
      trialConsumesCredit: false,
      cancellationConsumesCredit: false,
      noShowConsumesCredit: true,
    },
    source: "legacy_attendees",
    policySource: "legacy",
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

  if (attendee.attendanceStatus === "attended") {
    return {
      creditsPlanned,
      creditsConsumed: creditsPlanned,
      reason: creditsPlanned > 0 ? "attended" : "no_voucher_required",
    };
  }

  if (attendee.attendanceStatus === "no_show") {
    return {
      creditsPlanned,
      creditsConsumed: policy.noShowConsumesCredit ? creditsPlanned : 0,
      reason: policy.noShowConsumesCredit
        ? "no_show_charged"
        : "no_show_free",
    };
  }

  // TODO: Apply cancellationConsumesCredit in the cancellation endpoint.
  return {
    creditsPlanned,
    creditsConsumed: 0,
    reason: "absent_free",
  };
}
