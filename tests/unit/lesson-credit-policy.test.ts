import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import type {
  CourseCreditPolicy,
  TemplateClassType,
} from "../../lib/types/course-policies";
import type {
  LessonAttendanceStatus,
  LessonPolicySnapshot,
} from "../../lib/types/lesson";
import {
  buildAppliedPolicySnapshot,
  calculateCreditsForAttendee,
  resolveEffectiveLessonCreditPolicy,
  type EffectiveLessonCreditPolicy,
} from "../../lib/utils/lesson-credit-policy";
import {
  cloneCourseOperationalPolicies,
  getDefaultConsumptionByAttendance,
  normalizeCourseOperationalPolicies,
  normalizeCourseProfilePoliciesForWrite,
} from "../../lib/utils/course-policies";
import { buildLessonPolicySnapshotFromCoursePolicies } from "../../lib/utils/lesson-policy-snapshot";
import {
  getLessonCompletionBlocker,
  isLessonSettlementFinal,
} from "../../lib/utils/lesson-completion-guard";
import { createLessonSchema, updateLessonSchema } from "../../lib/validators/lesson";
import { courseOperationalDefaultsSchema } from "../../lib/validators/courseTemplate.validator";
import { buildCourseConsumptionPolicyPlanItem } from "../../scripts/migrations/course-consumption-policy-plan";

const STUDENT_ID = "507f1f77bcf86cd799439011";
const VOUCHER_ID = "507f191e810c19729de860ea";

function coursePolicy(
  classType: TemplateClassType,
  overrides: Partial<EffectiveLessonCreditPolicy> = {},
): EffectiveLessonCreditPolicy {
  return {
    mode: "course",
    creditsPerLesson: 1,
    consumeOn: "completion",
    trialConsumesCredit: false,
    cancellationConsumesCredit: false,
    noShowConsumesCredit: true,
    consumptionByAttendance:
      getDefaultConsumptionByAttendance(classType),
    ...overrides,
  };
}

function consumed(
  attendanceStatus: LessonAttendanceStatus,
  policy: EffectiveLessonCreditPolicy,
  isTrial = false,
) {
  return calculateCreditsForAttendee({
    attendee: { attendanceStatus, isTrial },
    policy,
  });
}

const privateMatrix = {
  attended: 1,
  no_show: 1,
  canceled_late: 1,
  canceled_early: 0,
} as const;
const privateConsumptionMap = {
  attended: true,
  no_show: true,
  canceled_late: true,
  canceled_early: false,
} as const;

for (const [attendanceStatus, expected] of Object.entries(
  privateMatrix,
) as Array<[keyof typeof privateMatrix, number]>) {
  test(`private course ${attendanceStatus} consumes ${expected}`, () => {
    assert.equal(
      consumed(attendanceStatus, coursePolicy("private")).creditsConsumed,
      expected,
    );
  });
}

const groupMatrix = {
  attended: 1,
  no_show: 1,
  canceled_late: 1,
  canceled_early: 1,
} as const;
const groupConsumptionMap = {
  attended: true,
  no_show: true,
  canceled_late: true,
  canceled_early: true,
} as const;

for (const [attendanceStatus, expected] of Object.entries(
  groupMatrix,
) as Array<[keyof typeof groupMatrix, number]>) {
  test(`group_regular course ${attendanceStatus} consumes ${expected}`, () => {
    assert.equal(
      consumed(
        attendanceStatus,
        coursePolicy("group_regular"),
      ).creditsConsumed,
      expected,
    );
  });
}

test("trial attendees consume zero for every settled attendance status", () => {
  for (const attendanceStatus of Object.keys(
    privateMatrix,
  ) as Array<keyof typeof privateMatrix>) {
    const result = consumed(
      attendanceStatus,
      coursePolicy("private"),
      true,
    );

    assert.equal(result.creditsConsumed, 0);
    assert.equal(result.reason, "trial_free");
  }
});

test("legacy attendance behavior remains unchanged", () => {
  const legacyPolicy: EffectiveLessonCreditPolicy = {
    mode: "legacy",
    creditsPerLesson: 0,
    consumeOn: "completion",
    trialConsumesCredit: false,
    cancellationConsumesCredit: false,
    noShowConsumesCredit: true,
    consumptionByAttendance:
      getDefaultConsumptionByAttendance("private"),
  };

  assert.equal(consumed("attended", legacyPolicy).creditsConsumed, 1);
  assert.equal(consumed("no_show", legacyPolicy).creditsConsumed, 1);
  assert.equal(consumed("canceled_late", legacyPolicy).creditsConsumed, 1);
  assert.equal(consumed("canceled_early", legacyPolicy).creditsConsumed, 0);
});

test("legacy cancellation flag cannot make canceled_late free in course mode", () => {
  const result = consumed(
    "canceled_late",
    coursePolicy("private", { cancellationConsumesCredit: false }),
  );

  assert.equal(result.creditsConsumed, 1);
  assert.equal(result.reason, "canceled_late_charged");
});

test("course cancellation reasons distinguish charged and free outcomes", () => {
  assert.equal(
    consumed("canceled_late", coursePolicy("private")).reason,
    "canceled_late_charged",
  );
  assert.equal(
    consumed("canceled_early", coursePolicy("private")).reason,
    "canceled_early_free",
  );
  assert.equal(
    consumed("canceled_early", coursePolicy("group_regular")).reason,
    "canceled_early_charged",
  );
});

test("scheduled consumption remains deferred at completion", () => {
  const result = consumed(
    "attended",
    coursePolicy("private", { consumeOn: "scheduled" }),
  );

  assert.equal(result.creditsConsumed, 0);
  assert.equal(
    result.reason,
    "scheduled_policy_not_processed_on_completion",
  );
});

function snapshotWithoutAttendanceMap(
  classType: TemplateClassType,
): LessonPolicySnapshot {
  return {
    lessonDefaults: {
      durationMinutes: 60,
      timezone: "Europe/Madrid",
      defaultClassType: classType,
    },
    creditPolicy: {
      creditsPerLesson: 1,
      consumeOn: "completion",
      trialConsumesCredit: false,
      cancellationConsumesCredit: false,
      noShowConsumesCredit: false,
    },
    preparationPolicy: {
      copyTemplateBlocksToLesson: true,
      copyTemplateResourcesToLesson: true,
      defaultPreparationStatus: "needs_preparation",
    },
  };
}

test("current CourseProfile policy beats Lesson policySnapshot", () => {
  const snapshot = snapshotWithoutAttendanceMap("group_regular");
  snapshot.creditPolicy.consumptionByAttendance = {
    attended: true,
    no_show: false,
    canceled_late: false,
    canceled_early: false,
  };
  const currentCoursePolicies = normalizeCourseOperationalPolicies(
    null,
    "group_regular",
  );
  currentCoursePolicies.creditPolicy.consumptionByAttendance = {
    ...groupConsumptionMap,
  };

  const result = resolveEffectiveLessonCreditPolicy({
    lesson: {
      courseId: "course-id",
      classType: "group_regular",
      policySnapshot: snapshot,
    },
    courseProfile: {
      classType: "group_regular",
      policies: currentCoursePolicies,
    },
  });

  assert.equal(result.source, "course_policy");
  assert.equal(result.policySource, "course_profile");
  assert.equal(consumed("no_show", result.policy).creditsConsumed, 1);
  assert.equal(consumed("canceled_late", result.policy).creditsConsumed, 1);
  assert.equal(consumed("canceled_early", result.policy).creditsConsumed, 1);
});

test("changing current CourseProfile policy changes an unsettled lesson result", () => {
  const lesson = {
    courseId: "course-id",
    classType: "private" as const,
    policySnapshot: snapshotWithoutAttendanceMap("private"),
  };
  const beforePolicies = normalizeCourseOperationalPolicies(null, "private");
  const before = resolveEffectiveLessonCreditPolicy({
    lesson,
    courseProfile: {
      classType: "private",
      policies: beforePolicies,
    },
  });
  const afterPolicies = cloneCourseOperationalPolicies(
    beforePolicies,
    "private",
  );
  afterPolicies.creditPolicy.consumptionByAttendance.canceled_early = true;
  const after = resolveEffectiveLessonCreditPolicy({
    lesson,
    courseProfile: {
      classType: "private",
      policies: afterPolicies,
    },
  });

  assert.equal(consumed("canceled_early", before.policy).creditsConsumed, 0);
  assert.equal(consumed("canceled_early", after.policy).creditsConsumed, 1);
});

test("course lesson without an available CourseProfile has no silent snapshot fallback", () => {
  assert.throws(
    () =>
      resolveEffectiveLessonCreditPolicy({
        lesson: {
          courseId: "missing-course",
          classType: "private",
          policySnapshot: snapshotWithoutAttendanceMap("private"),
        },
      }),
    /CourseProfile is required/,
  );
});

test("new group_regular operational defaults contain the group policy", () => {
  const policies = courseOperationalDefaultsSchema.parse({
    lessonDefaults: { defaultClassType: "group_regular" },
  });

  assert.deepEqual(
    policies.creditPolicy.consumptionByAttendance,
    groupConsumptionMap,
  );
});

test("new lesson snapshots persist consumptionByAttendance", () => {
  const policies = normalizeCourseOperationalPolicies(
    null,
    "group_regular",
  );
  const snapshot = buildLessonPolicySnapshotFromCoursePolicies({
    policies,
    classType: "group_regular",
  });

  assert.deepEqual(
    snapshot.creditPolicy.consumptionByAttendance,
    groupConsumptionMap,
  );
});

test("classType defaults cover the complete business matrix", () => {
  const expectedByClassType: Record<
    TemplateClassType,
    typeof privateConsumptionMap | typeof groupConsumptionMap
  > = {
    group_regular: groupConsumptionMap,
    private: privateConsumptionMap,
    pair: privateConsumptionMap,
    semi_intensive: privateConsumptionMap,
    intensive: privateConsumptionMap,
  };

  for (const [classType, expected] of Object.entries(
    expectedByClassType,
  ) as Array<[TemplateClassType, typeof privateConsumptionMap]>) {
    assert.deepEqual(getDefaultConsumptionByAttendance(classType), expected);
  }
});

test("normalize preserves an explicit attendance map across classType changes", () => {
  const source = normalizeCourseOperationalPolicies(null, "private");
  source.creditPolicy.consumptionByAttendance = {
    attended: false,
    no_show: false,
    canceled_late: true,
    canceled_early: true,
  };

  const normalized = normalizeCourseOperationalPolicies(
    source,
    "group_regular",
  );

  assert.deepEqual(
    normalized.creditPolicy.consumptionByAttendance,
    source.creditPolicy.consumptionByAttendance,
  );
});

test("missing map uses the selected CourseProfile classType default", () => {
  const normalizedTemplate = normalizeCourseOperationalPolicies(
    null,
    "private",
  );
  const legacyCreditPolicy: CourseCreditPolicy = {
    ...normalizedTemplate.creditPolicy,
  };
  delete legacyCreditPolicy.consumptionByAttendance;
  const oldTemplate = {
    ...normalizedTemplate,
    creditPolicy: legacyCreditPolicy,
  };

  const copied = cloneCourseOperationalPolicies(
    oldTemplate,
    "group_regular",
  );

  assert.deepEqual(
    copied.creditPolicy.consumptionByAttendance,
    groupConsumptionMap,
  );
});

test("CourseProfile write synthesizes a missing map from its current classType", () => {
  const schemaOutput = courseOperationalDefaultsSchema.parse({
    lessonDefaults: { defaultClassType: "private" },
  });
  const written = normalizeCourseProfilePoliciesForWrite(
    schemaOutput,
    "group_regular",
    false,
  );

  assert.deepEqual(
    written.creditPolicy.consumptionByAttendance,
    groupConsumptionMap,
  );
});

test("template policies are deep-copied and remain independent from CourseProfile", () => {
  const template = normalizeCourseOperationalPolicies(null, "private");
  template.creditPolicy.consumptionByAttendance.no_show = false;
  const course = cloneCourseOperationalPolicies(template, "private");

  course.creditPolicy.consumptionByAttendance.canceled_early = true;
  assert.equal(
    template.creditPolicy.consumptionByAttendance.canceled_early,
    false,
  );

  template.creditPolicy.consumptionByAttendance.no_show = true;
  assert.equal(course.creditPolicy.consumptionByAttendance.no_show, false);

  const explicitlyCopiedAgain = cloneCourseOperationalPolicies(
    template,
    "private",
  );
  assert.equal(
    explicitlyCopiedAgain.creditPolicy.consumptionByAttendance.no_show,
    true,
  );
});

test("template validator round-trips all four editable attendance values", () => {
  const customMap = {
    attended: false,
    no_show: true,
    canceled_late: false,
    canceled_early: true,
  };
  const parsed = courseOperationalDefaultsSchema.parse({
    lessonDefaults: { defaultClassType: "intensive" },
    creditPolicy: { consumptionByAttendance: customMap },
  });

  assert.deepEqual(parsed.creditPolicy.consumptionByAttendance, customMap);
});

test("template and CourseProfile UI expose the four authoritative controls", () => {
  const templateFields = readFileSync(
    path.join(
      process.cwd(),
      "components/dashboard/courseTemplate/CourseTemplateOperationalDefaultsFields.tsx",
    ),
    "utf8",
  );
  const courseEditor = readFileSync(
    path.join(
      process.cwd(),
      "components/dashboard/courses/CourseProfileDetailView.tsx",
    ),
    "utf8",
  );
  const templateSummary = readFileSync(
    path.join(
      process.cwd(),
      "components/dashboard/courses/templates/CourseTemplateOperationalDefaultsSummary.tsx",
    ),
    "utf8",
  );
  const courseSummary = readFileSync(
    path.join(
      process.cwd(),
      "components/dashboard/courses/CourseProfilePoliciesSummary.tsx",
    ),
    "utf8",
  );

  for (const key of [
    "attended",
    "no_show",
    "canceled_late",
    "canceled_early",
  ]) {
    assert.match(templateFields, new RegExp(`consumptionByAttendance\\.${key}`));
    assert.match(courseEditor, new RegExp(`\"${key}\"`));
  }
  assert.doesNotMatch(templateFields, /creditPolicy\.cancellationConsumesCredit/);
  assert.doesNotMatch(templateFields, /creditPolicy\.noShowConsumesCredit/);
  assert.doesNotMatch(templateSummary, /creditPolicy\.cancellationConsumesCredit/);
  assert.doesNotMatch(templateSummary, /creditPolicy\.noShowConsumesCredit/);
  assert.doesNotMatch(courseSummary, /creditPolicy\.cancellationConsumesCredit/);
  assert.doesNotMatch(courseSummary, /creditPolicy\.noShowConsumesCredit/);
});

test("settlement appliedPolicySnapshot exactly matches the calculated course policy", () => {
  const policy = coursePolicy("intensive", {
    creditsPerLesson: 1.5,
    trialConsumesCredit: true,
    consumptionByAttendance: {
      attended: true,
      no_show: false,
      canceled_late: true,
      canceled_early: false,
    },
  });
  const calculation = consumed("no_show", policy);
  const snapshot = buildAppliedPolicySnapshot(policy);

  assert.equal(calculation.creditsConsumed, 0);
  assert.deepEqual(snapshot, {
    creditsPerLesson: 1.5,
    consumeOn: "completion",
    trialConsumesCredit: true,
    consumptionByAttendance: policy.consumptionByAttendance,
  });
  assert.notEqual(
    snapshot?.consumptionByAttendance,
    policy.consumptionByAttendance,
  );
});

test("completed or final-settlement lessons are returned without recalculation", () => {
  assert.equal(
    isLessonSettlementFinal({
      lessonStatus: "completed",
      settlementStatus: "settled",
    }),
    true,
  );
  assert.equal(
    isLessonSettlementFinal({
      lessonStatus: "scheduled",
      settlementStatus: "skipped",
    }),
    true,
  );
  assert.equal(
    isLessonSettlementFinal({
      lessonStatus: "scheduled",
      settlementStatus: "pending",
    }),
    false,
  );
});

test("migration plan aligns explicit and missing maps to classType defaults", () => {
  const existing = buildCourseConsumptionPolicyPlanItem({
    _id: "course-1",
    code: "A1",
    internalName: "Regular",
    classType: "group_regular",
    policies: {
      creditPolicy: {
        consumptionByAttendance: privateConsumptionMap,
      },
    },
  });
  const missing = buildCourseConsumptionPolicyPlanItem({
    _id: "course-2",
    classType: "intensive",
  });

  assert.equal(existing.hasExplicitMap, true);
  assert.equal(existing.action, "UPDATE");
  assert.deepEqual(existing.proposed, groupConsumptionMap);
  assert.equal(missing.hasExplicitMap, false);
  assert.equal(missing.action, "UPDATE");
  assert.deepEqual(missing.proposed, privateConsumptionMap);
});

function duplicateAttendees() {
  return [
    {
      studentId: STUDENT_ID,
      voucherId: VOUCHER_ID,
      attendanceStatus: "attended" as const,
      creditsToConsume: 1,
      isTrial: false,
    },
    {
      studentId: STUDENT_ID,
      voucherId: VOUCHER_ID,
      attendanceStatus: "no_show" as const,
      creditsToConsume: 1,
      isTrial: false,
    },
  ];
}

test("lesson create rejects duplicate attendee studentId", () => {
  const freeResult = createLessonSchema.safeParse({
    creationMode: "free",
    title: "Duplicate attendees",
    scheduledStart: "2026-10-15T10:00:00.000Z",
    scheduledEnd: "2026-10-15T11:00:00.000Z",
    classType: "private",
    attendees: duplicateAttendees(),
  });

  assert.equal(freeResult.success, false);
  if (!freeResult.success) {
    assert.match(freeResult.error.issues[0]?.message ?? "", /only once/);
  }

  const courseResult = createLessonSchema.safeParse({
    creationMode: "course",
    courseId: "507f1f77bcf86cd799439012",
    scheduledStart: "2026-10-15T10:00:00.000Z",
    attendees: duplicateAttendees(),
  });

  assert.equal(courseResult.success, false);
  if (!courseResult.success) {
    assert.match(
      courseResult.error.issues[0]?.message ?? "",
      /only once/,
    );
  }
});

test("lesson patch rejects duplicate attendee studentId", () => {
  const result = updateLessonSchema.safeParse({
    attendees: duplicateAttendees(),
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.match(result.error.issues[0]?.message ?? "", /only once/);
  }
});

test("completion rejects duplicate attendees already persisted", () => {
  const blocker = getLessonCompletionBlocker({
    status: "scheduled",
    attendees: duplicateAttendees(),
  });

  assert.deepEqual(blocker, {
    status: 400,
    code: "duplicate_lesson_attendee",
    error: "A student can appear only once in lesson attendees",
  });
});

test("completion rejects pending attendance", () => {
  const blocker = getLessonCompletionBlocker({
    status: "scheduled",
    attendees: [
      { studentId: STUDENT_ID, attendanceStatus: "pending" },
    ],
  });

  assert.equal(blocker?.status, 400);
  assert.match(blocker?.error ?? "", /attendance marked/);
});

test("voided and teacher-canceled lessons cannot settle", () => {
  for (const status of ["voided", "canceled_by_teacher"]) {
    const blocker = getLessonCompletionBlocker({
      status,
      attendees: [
        { studentId: STUDENT_ID, attendanceStatus: "attended" },
      ],
    });

    assert.deepEqual(blocker, {
      status: 409,
      error: "This lesson cannot be completed",
    });
  }
});
