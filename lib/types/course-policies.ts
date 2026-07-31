export type CourseTemplateFrequency =
  | "once"
  | "weekly"
  | "twice_weekly"
  | "custom";

export type CreditConsumeOn = "completion" | "scheduled";

export type TemplateClassType =
  | "private"
  | "pair"
  | "group_regular"
  | "semi_intensive"
  | "intensive";

export type ParticipantMode = "solo" | "pair" | "trio" | "group";

export interface CourseLessonDefaults {
  durationMinutes: number;
  timezone: string;
  defaultClassType: TemplateClassType;
}

export interface CourseSchedulingDefaults {
  frequency: CourseTemplateFrequency;
  sessionsPerWeek: number;
  preferredWeekdays: number[];
  allowRecurringLessons: boolean;
}

export interface CourseCreditPolicy {
  creditsPerLesson: number;
  consumeOn: CreditConsumeOn;
  trialConsumesCredit: boolean;
  cancellationConsumesCredit: boolean;
  noShowConsumesCredit: boolean;
}

export interface CourseParticipantPolicy {
  participantMode: ParticipantMode;
  minStudents: number;
  maxStudents: number;
}

export interface CoursePreparationPolicy {
  copyTemplateBlocksToLesson: boolean;
  copyTemplateResourcesToLesson: boolean;
  defaultPreparationStatus: "needs_preparation" | "prepared";
}

export interface CourseOperationalPolicies {
  lessonDefaults: CourseLessonDefaults;
  schedulingDefaults: CourseSchedulingDefaults;
  creditPolicy: CourseCreditPolicy;
  participantPolicy: CourseParticipantPolicy;
  preparationPolicy: CoursePreparationPolicy;
}
