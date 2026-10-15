import type { ConsumptionByAttendance } from "../../lib/types/course-policies";
import { getDefaultConsumptionByAttendance } from "../../lib/utils/course-policies";

const SUPPORTED_CLASS_TYPES = [
  "group_regular",
  "private",
  "pair",
  "semi_intensive",
  "intensive",
] as const;

export type MigratableCourseClassType =
  (typeof SUPPORTED_CLASS_TYPES)[number];

export interface CourseConsumptionPolicyDocument {
  _id: unknown;
  code?: unknown;
  name?: unknown;
  internalName?: unknown;
  classType?: unknown;
  policies?: {
    creditPolicy?: {
      consumptionByAttendance?: Partial<ConsumptionByAttendance> | null;
    } | null;
  } | null;
}

export interface CourseConsumptionPolicyPlanItem {
  id: string;
  code: string;
  name: string;
  classType: string;
  current: Partial<ConsumptionByAttendance> | null;
  proposed: ConsumptionByAttendance | null;
  hasExplicitMap: boolean;
  action: "UPDATE" | "NO_CHANGE" | "SKIP_UNSUPPORTED_CLASS_TYPE";
}

function isSupportedClassType(
  value: unknown,
): value is MigratableCourseClassType {
  return SUPPORTED_CLASS_TYPES.some((candidate) => candidate === value);
}

function mapsEqual(
  current: Partial<ConsumptionByAttendance> | null,
  proposed: ConsumptionByAttendance,
): boolean {
  return (
    current?.attended === proposed.attended &&
    current.no_show === proposed.no_show &&
    current.canceled_late === proposed.canceled_late &&
    current.canceled_early === proposed.canceled_early
  );
}

export function buildCourseConsumptionPolicyPlanItem(
  course: CourseConsumptionPolicyDocument,
): CourseConsumptionPolicyPlanItem {
  const current =
    course.policies?.creditPolicy?.consumptionByAttendance ?? null;
  const classType =
    typeof course.classType === "string" ? course.classType : "(missing)";
  const base = {
    id: String(course._id),
    code: typeof course.code === "string" ? course.code : "(no code)",
    name:
      typeof course.name === "string"
        ? course.name
        : typeof course.internalName === "string"
          ? course.internalName
          : "(unnamed course)",
    classType,
    current,
    hasExplicitMap: current !== null,
  };

  if (!isSupportedClassType(course.classType)) {
    return {
      ...base,
      proposed: null,
      action: "SKIP_UNSUPPORTED_CLASS_TYPE",
    };
  }

  const proposed = getDefaultConsumptionByAttendance(course.classType);
  return {
    ...base,
    proposed,
    action: mapsEqual(current, proposed) ? "NO_CHANGE" : "UPDATE",
  };
}
