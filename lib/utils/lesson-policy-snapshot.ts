import type {
  CourseOperationalPolicies,
  TemplateClassType,
} from "@/lib/types/course-policies";
import type { LessonPolicySnapshot } from "@/lib/types/lesson";
import { normalizeCourseOperationalPolicies } from "@/lib/utils/course-policies";

type BuildLessonPolicySnapshotArgs = {
  policies: CourseOperationalPolicies;
  durationMinutes?: number;
  timezone?: string;
  classType?: TemplateClassType;
};

export function buildLessonPolicySnapshotFromCoursePolicies({
  policies,
  durationMinutes,
  timezone,
  classType,
}: BuildLessonPolicySnapshotArgs): LessonPolicySnapshot {
  const normalized = normalizeCourseOperationalPolicies(policies);
  const resolvedDuration =
    durationMinutes !== undefined &&
    Number.isFinite(durationMinutes) &&
    durationMinutes > 0
      ? Math.round(durationMinutes)
      : normalized.lessonDefaults.durationMinutes;

  return {
    lessonDefaults: {
      durationMinutes: resolvedDuration,
      timezone:
        timezone?.trim() ||
        normalized.lessonDefaults.timezone ||
        "Europe/Madrid",
      defaultClassType:
        classType ?? normalized.lessonDefaults.defaultClassType,
    },
    creditPolicy: { ...normalized.creditPolicy },
    preparationPolicy: { ...normalized.preparationPolicy },
  };
}
