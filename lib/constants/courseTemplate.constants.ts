import type { ParticipantMode } from "@/lib/types/course-policies";

export const COURSETEMPLATE_STATUS = ["draft" , "ready" , "archived"] as const;
export type CoourseTemplateStatus = (typeof COURSETEMPLATE_STATUS)[number];

export const STORE_FRONT_PRICE_MODE = ["monthly", "package", "free", "custom_label"] as const ;
export type StoreFrontPriceMode = (typeof STORE_FRONT_PRICE_MODE)[number];

export const CURRENCY_CODES = ["EUR"] as const;
export type CurrencyCodes = (typeof CURRENCY_CODES)[number]

export const PARTICIPANT_MODES = ["solo", "pair", "trio", "group"] as const;
export type { ParticipantMode };

export const COURSE_TEMPLATE_FREQUENCIES = [
  "once",
  "weekly",
  "twice_weekly",
  "custom",
] as const;

export const CREDIT_CONSUME_ON_VALUES = [
  "completion",
  "scheduled",
] as const;

export const DEFAULT_OPERATIONAL_DEFAULTS = {
  lessonDefaults: {
    durationMinutes: 60,
    timezone: "Europe/Madrid",
    defaultClassType: "private",
  },
  schedulingDefaults: {
    frequency: "weekly",
    sessionsPerWeek: 1,
    preferredWeekdays: [] as number[],
    allowRecurringLessons: true,
  },
  creditPolicy: {
    creditsPerLesson: 1,
    consumeOn: "completion",
    trialConsumesCredit: false,
    cancellationConsumesCredit: false,
    noShowConsumesCredit: true,
  },
  participantPolicy: {
    participantMode: "solo",
    minStudents: 1,
    maxStudents: 1,
  },
  preparationPolicy: {
    copyTemplateBlocksToLesson: true,
    copyTemplateResourcesToLesson: true,
    defaultPreparationStatus: "needs_preparation",
  },
} as const;
