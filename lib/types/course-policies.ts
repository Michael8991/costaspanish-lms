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

export interface ConsumptionByAttendance {
  attended: boolean;
  no_show: boolean;
  canceled_late: boolean;
  canceled_early: boolean;
}

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
  // TODO(MIC-7): remove these legacy compatibility flags after stored data and
  // historical readers no longer depend on them. They are not authoritative.
  cancellationConsumesCredit: boolean;
  noShowConsumesCredit: boolean;
  consumptionByAttendance?: ConsumptionByAttendance;
}

export interface NormalizedCourseCreditPolicy extends CourseCreditPolicy {
  consumptionByAttendance: ConsumptionByAttendance;
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

export interface NormalizedCourseOperationalPolicies
  extends Omit<CourseOperationalPolicies, "creditPolicy"> {
  creditPolicy: NormalizedCourseCreditPolicy;
}
