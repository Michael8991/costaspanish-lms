import {
  COURSE_TEMPLATE_FREQUENCIES,
  CREDIT_CONSUME_ON_VALUES,
  DEFAULT_OPERATIONAL_DEFAULTS,
  PARTICIPANT_MODES,
} from "@/lib/constants/courseTemplate.constants";
import { LESSON_CLASS_TYPES } from "@/lib/constants/lesson.constants";
import type {
  CourseOperationalPolicies,
  CourseTemplateFrequency,
  CreditConsumeOn,
  ParticipantMode,
  TemplateClassType,
} from "@/lib/types/course-policies";

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

function nonNegativeNumber(
  value: number | undefined,
  fallback: number,
): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function isTemplateClassType(value: unknown): value is TemplateClassType {
  return LESSON_CLASS_TYPES.some((candidate) => candidate === value);
}

function isFrequency(value: unknown): value is CourseTemplateFrequency {
  return COURSE_TEMPLATE_FREQUENCIES.some(
    (candidate) => candidate === value,
  );
}

function isCreditConsumeOn(value: unknown): value is CreditConsumeOn {
  return CREDIT_CONSUME_ON_VALUES.some(
    (candidate) => candidate === value,
  );
}

function isParticipantMode(value: unknown): value is ParticipantMode {
  return PARTICIPANT_MODES.some((candidate) => candidate === value);
}

export function getDefaultCourseOperationalPolicies(): CourseOperationalPolicies {
  return {
    lessonDefaults: { ...DEFAULT_OPERATIONAL_DEFAULTS.lessonDefaults },
    schedulingDefaults: {
      ...DEFAULT_OPERATIONAL_DEFAULTS.schedulingDefaults,
      preferredWeekdays: [],
    },
    creditPolicy: { ...DEFAULT_OPERATIONAL_DEFAULTS.creditPolicy },
    participantPolicy: { ...DEFAULT_OPERATIONAL_DEFAULTS.participantPolicy },
    preparationPolicy: { ...DEFAULT_OPERATIONAL_DEFAULTS.preparationPolicy },
  };
}

export function normalizeCourseOperationalPolicies(
  source?: Partial<CourseOperationalPolicies> | null,
): CourseOperationalPolicies {
  const defaults = getDefaultCourseOperationalPolicies();
  const minStudents = positiveInteger(
    source?.participantPolicy?.minStudents,
    defaults.participantPolicy.minStudents,
  );
  const maxStudents = Math.max(
    minStudents,
    positiveInteger(
      source?.participantPolicy?.maxStudents,
      defaults.participantPolicy.maxStudents,
    ),
  );
  const preferredWeekdays = Array.from(
    new Set(
      (source?.schedulingDefaults?.preferredWeekdays ?? []).filter(
        (weekday) =>
          Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
      ),
    ),
  ).sort((first, second) => first - second);

  return {
    lessonDefaults: {
      durationMinutes: positiveInteger(
        source?.lessonDefaults?.durationMinutes,
        defaults.lessonDefaults.durationMinutes,
      ),
      timezone:
        source?.lessonDefaults?.timezone?.trim() ||
        defaults.lessonDefaults.timezone,
      defaultClassType: isTemplateClassType(
        source?.lessonDefaults?.defaultClassType,
      )
        ? source.lessonDefaults.defaultClassType
        : defaults.lessonDefaults.defaultClassType,
    },
    schedulingDefaults: {
      frequency: isFrequency(source?.schedulingDefaults?.frequency)
        ? source.schedulingDefaults.frequency
        : defaults.schedulingDefaults.frequency,
      sessionsPerWeek: positiveInteger(
        source?.schedulingDefaults?.sessionsPerWeek,
        defaults.schedulingDefaults.sessionsPerWeek,
      ),
      preferredWeekdays,
      allowRecurringLessons:
        source?.schedulingDefaults?.allowRecurringLessons ??
        defaults.schedulingDefaults.allowRecurringLessons,
    },
    creditPolicy: {
      creditsPerLesson: nonNegativeNumber(
        source?.creditPolicy?.creditsPerLesson,
        defaults.creditPolicy.creditsPerLesson,
      ),
      consumeOn: isCreditConsumeOn(source?.creditPolicy?.consumeOn)
        ? source.creditPolicy.consumeOn
        : defaults.creditPolicy.consumeOn,
      trialConsumesCredit:
        source?.creditPolicy?.trialConsumesCredit ??
        defaults.creditPolicy.trialConsumesCredit,
      cancellationConsumesCredit:
        source?.creditPolicy?.cancellationConsumesCredit ??
        defaults.creditPolicy.cancellationConsumesCredit,
      noShowConsumesCredit:
        source?.creditPolicy?.noShowConsumesCredit ??
        defaults.creditPolicy.noShowConsumesCredit,
    },
    participantPolicy: {
      participantMode: isParticipantMode(
        source?.participantPolicy?.participantMode,
      )
        ? source.participantPolicy.participantMode
        : defaults.participantPolicy.participantMode,
      minStudents,
      maxStudents,
    },
    preparationPolicy: {
      copyTemplateBlocksToLesson:
        source?.preparationPolicy?.copyTemplateBlocksToLesson ??
        defaults.preparationPolicy.copyTemplateBlocksToLesson,
      copyTemplateResourcesToLesson:
        source?.preparationPolicy?.copyTemplateResourcesToLesson ??
        defaults.preparationPolicy.copyTemplateResourcesToLesson,
      defaultPreparationStatus:
        source?.preparationPolicy?.defaultPreparationStatus === "prepared"
          ? "prepared"
          : "needs_preparation",
    },
  };
}

export function cloneCourseOperationalPolicies(
  source?: Partial<CourseOperationalPolicies> | null,
): CourseOperationalPolicies {
  const normalized = normalizeCourseOperationalPolicies(source);

  return {
    lessonDefaults: { ...normalized.lessonDefaults },
    schedulingDefaults: {
      ...normalized.schedulingDefaults,
      preferredWeekdays: [...normalized.schedulingDefaults.preferredWeekdays],
    },
    creditPolicy: { ...normalized.creditPolicy },
    participantPolicy: { ...normalized.participantPolicy },
    preparationPolicy: { ...normalized.preparationPolicy },
  };
}
