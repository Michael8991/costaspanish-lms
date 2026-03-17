export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const RESOURCE_STATUS = ["draft", "published", "archived"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUS)[number];

export const RESOURCE_VISIBILITY = ["private", "shared"] as const;
export type ResourceVisibility = (typeof RESOURCE_VISIBILITY)[number];

export const PEDAGOGICAL_TYPES = [
  "worksheet",
  "audio_track",
  "video_clip",
  "flashcards",
  "reading_text",
  "grammar_reference",
  "speaking_prompt",
  "writing_prompt",
  "quiz",
  "game",
  "other",
] as const;
export type PedagogicalType = (typeof PEDAGOGICAL_TYPES)[number];

export const FORMAT_TYPES = [
  "pdf",
  "image",
  "audio",
  "video",
  "external_link",
] as const;
export type FormatType = (typeof FORMAT_TYPES)[number];

export const SKILL_FOCUS = [
  "speaking",
  "listening",
  "reading",
  "writing",
  "grammar",
  "vocabulary",
  "pronunciation",
] as const;
export type SkillFocus = (typeof SKILL_FOCUS)[number];

export const DELIVERY_MODES = ["classwork", "homework"] as const;
export type DeliveryModes = (typeof DELIVERY_MODES)[number];

export const LESSON_STAGES = [
  "warmup",
  "review",
  "input",
  "guided_practice",
  "freer_practice",
  "correction",
  "wrap_up",
  "homework",
  "assessment",
] as const;
export type LessonStage = (typeof LESSON_STAGES)[number];