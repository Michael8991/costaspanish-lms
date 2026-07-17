export const LESSON_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "canceled_by_teacher",
  "voided",
] as const;

export const LESSON_PREPARATION_STATUSES = [
  "needs_preparation",
  "prepared",
] as const;

export const LESSON_ATTENDANCE_STATUSES = [
  "pending",
  "attended",
  "no_show",
  "canceled_early",
  "canceled_late",
] as const;

export const LESSON_BLOCK_COMPLETION_STATUSES = [
  "completed",
  "partially_completed",
  "not_completed",
  "skipped",
] as const;

export const LESSON_CLASS_TYPES = [
  "private",
  "pair",
  "group_regular",
  "semi_intensive",
  "intensive",
] as const;

export const LESSON_BLOCK_TYPES = [
  "warm_up",
  "grammar",
  "vocabulary",
  "speaking",
  "listening",
  "reading",
  "writing",
  "review",
  "homework_review",
  "assessment",
  "correction",
  "pronunciation",
  "roleplay",
  "game",
  "cultural_note",
  "exam_practice",
  "feedback",
  "wrap_up",
  "custom",
] as const;

export const LESSON_SKILLS = [
  "speaking",
  "listening",
  "reading",
  "writing",
  "grammar",
  "vocabulary",
  "pronunciation",
  "interaction",
] as const;

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const LESSON_ERROR_CATEGORIES = [
  "grammar",
  "pronunciation",
  "fluency",
  "vocabulary",
  "listening",
  "comprehension",
  "writing",
  "none",
] as const;

export const LESSON_CREATION_SOURCES = [
  "manual",
  "google_calendar",
  "template",
  "ai_generated",
] as const;