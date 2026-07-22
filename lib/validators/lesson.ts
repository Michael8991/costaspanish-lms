import { z } from "zod";
import {
  CEFR_LEVELS,
  LESSON_ATTENDANCE_STATUSES,
  LESSON_BLOCK_COMPLETION_STATUSES,
  LESSON_BLOCK_TYPES,
  LESSON_CLASS_TYPES,
  LESSON_CREATION_SOURCES,
  LESSON_ERROR_CATEGORIES,
  LESSON_PREPARATION_STATUSES,
  LESSON_SKILLS,
  LESSON_STATUSES,
} from "@/lib/constants/lesson.constants";
import { Types } from "mongoose";
import { WEEKDAY_VALUES } from "@/lib/utils/lesson-recurrence";


const objectIdSchema = z
  .string()
  .min(1)
  .refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid ObjectId",
  });

const optionalObjectIdSchema = z.preprocess(
  (value) => (value === "" ? undefined : value),
  objectIdSchema.optional(),
);

const lessonBlockOriginSchema = z.object({
  sourceLessonId: objectIdSchema,
  sourceBlockId: objectIdSchema.optional(),
  sourceCourseId: objectIdSchema.optional(),
  sourceStudentIds: z.array(objectIdSchema).default([]),
  sourceLessonTitle: z.string().trim().optional(),
  sourceLessonDate: z.string().datetime().optional(),
  sourceBlockTitle: z.string().trim().optional(),
});

const lessonAttendeeSchema = z
  .object({
    studentId: objectIdSchema,
    voucherId: optionalObjectIdSchema,
    attendanceStatus: z.enum(LESSON_ATTENDANCE_STATUSES).default("pending"),
    creditsToConsume: z.coerce.number().min(0).default(1),
    isTrial: z.boolean().default(false),
  })
  .superRefine((attendee, ctx) => {
    if (attendee.isTrial) {
      return;
    }

    if (!attendee.voucherId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["voucherId"],
        message: "voucherId is required when attendee is not trial",
      });
    }

    if (attendee.creditsToConsume <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["creditsToConsume"],
        message: "creditsToConsume must be greater than 0 when attendee is not trial",
      });
    }
  })
  .transform((attendee) => {
    if (!attendee.isTrial) {
      return attendee;
    }

    return {
      ...attendee,
      voucherId: undefined,
      creditsToConsume: 0,
    };
  });
export const lessonBlockSchema = z.object({
  lineageId: z.string().trim().min(1).optional(),
  order: z.coerce.number().int().min(0).optional(),
  title: z.string().trim().min(1),
  type: z.enum(LESSON_BLOCK_TYPES),

  cefrLevels: z.array(z.enum(CEFR_LEVELS)).default([]),
  skills: z.array(z.enum(LESSON_SKILLS)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
  resources: z.array(objectIdSchema).default([]),

  plannedContent: z.string().trim().min(1),
  actualContent: z.string().trim().optional(),

  plannedObjectives: z.array(z.string().trim().min(1)).default([]),
  achievedObjectives: z.array(z.string().trim().min(1)).default([]),

  estimatedMinutes: z.coerce.number().min(0).optional(),
  actualMinutes: z.coerce.number().min(0).optional(),

  blockSuccessRating: z.coerce.number().min(1).max(5).optional(),
  studentDifficultyLevel: z.coerce.number().min(1).max(5).optional(),
  engagementLevel: z.coerce.number().min(1).max(5).optional(),
  completionStatus: z
  .enum(LESSON_BLOCK_COMPLETION_STATUSES)
  .default("not_completed"),

  carryOverToNextLesson: z.boolean().default(false),

  errorCategories: z.array(z.enum(LESSON_ERROR_CATEGORIES)).default([]),

  studentDifficultiesText: z.string().trim().optional(),
  teacherReflection: z.string().trim().optional(),
  nextStepSuggestion: z.string().trim().optional(),
  origin: lessonBlockOriginSchema.optional(),
});

const lessonBaseSchema = z.object({
  courseId: objectIdSchema.optional(),

  title: z.string().trim().min(1),
  status: z.enum(LESSON_STATUSES).default("scheduled"),
  preparationStatus: z
  .enum(LESSON_PREPARATION_STATUSES)
  .default("needs_preparation"),

  scheduledStart: z.coerce.date(),
  scheduledEnd: z.coerce.date(),
  timezone: z.string().trim().default("Europe/Madrid"),

  classType: z.enum(LESSON_CLASS_TYPES),
  isTrial: z.boolean().default(false),

  attendees: z.array(lessonAttendeeSchema).min(1),
  blocks: z.array(lessonBlockSchema).default([]),

  preparationNotes: z.string().trim().optional(),
  teacherNotes: z.string().trim().optional(),
  homeworkAssigned: z.string().trim().optional(),
  nextLessonFocus: z.string().trim().optional(),

  creationSource: z.enum(LESSON_CREATION_SOURCES).default("manual"),

  integration: z
    .object({
      provider: z.enum(["google_calendar", "preply", "italki", "manual"]),
      externalId: z.string().trim().optional(),
      meetUrl: z.string().trim().url().optional(),
    })
    .optional(),
});

const lessonRecurrenceSchema = z
  .object({
    enabled: z.boolean(),
    frequency: z.literal("weekly").default("weekly"),
    daysOfWeek: z.array(z.enum(WEEKDAY_VALUES)).max(7).default([]),
    endsOn: z.string().trim().optional(),
  })
  .superRefine((recurrence, ctx) => {
    if (!recurrence.enabled) return;

    if (recurrence.daysOfWeek.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daysOfWeek"],
        message: "Selecciona al menos un día de repetición.",
      });
    }

    if (new Set(recurrence.daysOfWeek).size !== recurrence.daysOfWeek.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daysOfWeek"],
        message: "Los días de repetición no pueden estar duplicados.",
      });
    }

    const endsOn = recurrence.endsOn;
    const parsedEndsOn = endsOn
      ? new Date(`${endsOn}T00:00:00.000Z`)
      : undefined;
    const hasValidEndsOn =
      Boolean(endsOn) &&
      parsedEndsOn !== undefined &&
      !Number.isNaN(parsedEndsOn.getTime()) &&
      parsedEndsOn.toISOString().slice(0, 10) === endsOn;

    if (!hasValidEndsOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsOn"],
        message: "Selecciona hasta cuándo se repite la clase.",
      });
    }
  });

export const createLessonSchema = lessonBaseSchema
  .extend({
    recurrence: lessonRecurrenceSchema.optional(),
  })
  .refine(
    (data) => data.scheduledEnd > data.scheduledStart,
    {
      message: "scheduledEnd must be after scheduledStart",
      path: ["scheduledEnd"],
    },
  );

const updateLessonBaseSchema = z.object({
  courseId: objectIdSchema.optional(),

  title: z.string().trim().min(1).optional(),
  status: z.enum(LESSON_STATUSES).optional(),
  preparationStatus: z.enum(LESSON_PREPARATION_STATUSES).optional(),

  scheduledStart: z.coerce.date().optional(),
  scheduledEnd: z.coerce.date().optional(),
  timezone: z.string().trim().optional(),

  classType: z.enum(LESSON_CLASS_TYPES).optional(),
  isTrial: z.boolean().optional(),

  attendees: z.array(lessonAttendeeSchema).optional(),
  blocks: z.array(lessonBlockSchema).optional(),

  preparationNotes: z.string().trim().optional(),
  teacherNotes: z.string().trim().optional(),
  homeworkAssigned: z.string().trim().optional(),
  nextLessonFocus: z.string().trim().optional(),

  creationSource: z.enum(LESSON_CREATION_SOURCES).optional(),

  integration: z
    .object({
      provider: z.enum(["google_calendar", "preply", "italki", "manual"]),
      externalId: z.string().trim().optional(),
      meetUrl: z.string().trim().url().optional(),
    })
    .optional(),
});

export const updateLessonSchema = updateLessonBaseSchema.refine(
  (data) => {
    if (data.scheduledStart && data.scheduledEnd) {
      return data.scheduledEnd > data.scheduledStart;
    }

    return true;
  },
  {
    message: "scheduledEnd must be after scheduledStart",
    path: ["scheduledEnd"],
  },
);
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
export type LessonBlockInput = z.infer<typeof lessonBlockSchema>;
export type LessonAttendeeInput = z.infer<typeof lessonAttendeeSchema>;
export type LessonRecurrenceInput = z.infer<typeof lessonRecurrenceSchema>;
