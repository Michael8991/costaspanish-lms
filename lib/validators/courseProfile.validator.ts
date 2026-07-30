import { z } from "zod";

import { COURSE_STATUSES } from "@/lib/constants/course.constants";

export const COURSE_PROFILE_CLASS_TYPES = [
  "private",
  "pair",
  "group_regular",
  "semi_intensive",
  "intensive",
] as const;

const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Debe ser un ObjectId válido");

const optionalDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .string()
    .trim()
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "La fecha no es válida",
    })
    .optional(),
);

const normalizedStudentIdsSchema = z
  .array(objectIdSchema)
  .transform((ids) => Array.from(new Set(ids)));

function validateStudentCapacity(
  classType: (typeof COURSE_PROFILE_CLASS_TYPES)[number],
  studentIds: string[],
  ctx: z.RefinementCtx,
) {
  if (studentIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["studentIds"],
      message: "Selecciona al menos un alumno",
    });
  }

  if (classType === "private" && studentIds.length > 1) {
    ctx.addIssue({
      code: "custom",
      path: ["studentIds"],
      message: "Un curso privado admite como máximo un alumno",
    });
  }

  if (classType === "pair" && studentIds.length > 2) {
    ctx.addIssue({
      code: "custom",
      path: ["studentIds"],
      message: "Un curso en pareja admite como máximo dos alumnos",
    });
  }
}

export const createCourseProfileSchema = z
  .object({
    templateId: objectIdSchema,
    name: z.string().trim().min(1, "El nombre es obligatorio").max(140),
    classType: z.enum(COURSE_PROFILE_CLASS_TYPES),
    studentIds: normalizedStudentIdsSchema.default([]),
    status: z.enum(COURSE_STATUSES).default("active"),
    startDate: optionalDateSchema,
    targetEndDate: optionalDateSchema,
    scheduleNotes: z.string().trim().max(1000).optional().default(""),
    internalNotes: z.string().trim().max(2000).optional().default(""),
  })
  .strict()
  .superRefine((data, ctx) => {
    validateStudentCapacity(data.classType, data.studentIds, ctx);

    if (
      data.startDate &&
      data.targetEndDate &&
      new Date(data.targetEndDate) < new Date(data.startDate)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["targetEndDate"],
        message: "La fecha objetivo no puede ser anterior a la fecha de inicio",
      });
    }
  });

export const updateCourseProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(140).optional(),
    status: z.enum(COURSE_STATUSES).optional(),
    classType: z.enum(COURSE_PROFILE_CLASS_TYPES).optional(),
    studentIds: normalizedStudentIdsSchema.optional(),
    startDate: optionalDateSchema,
    targetEndDate: optionalDateSchema,
    scheduleNotes: z.string().trim().max(1000).optional(),
    internalNotes: z.string().trim().max(2000).optional(),
    progress: z
      .object({
        currentModuleOrder: z.number().int().min(0).optional(),
        currentLessonOrder: z.number().int().min(0).optional(),
        completedLessonsCount: z.number().int().min(0).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type CreateCourseProfileInput = z.infer<
  typeof createCourseProfileSchema
>;
export type UpdateCourseProfileInput = z.infer<
  typeof updateCourseProfileSchema
>;
