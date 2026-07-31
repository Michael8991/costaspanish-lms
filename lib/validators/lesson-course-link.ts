import { Types } from "mongoose";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid ObjectId",
  });

export const assignLessonToCourseSchema = z
  .object({
    courseId: objectIdSchema,
    relationType: z
      .enum([
        "course_free_lesson",
        "template_based",
        "review",
        "makeup",
        "extra",
        "imported_historical",
      ])
      .default("course_free_lesson"),
    notes: z.string().trim().max(1000).default(""),
    sourceTemplateLesson: z
      .object({
        moduleOrder: z.coerce.number().int().min(0),
        lessonOrder: z.coerce.number().int().min(0),
        moduleTitle: z.string().trim().max(140).optional(),
        lessonTitle: z.string().trim().max(140).optional(),
      })
      .optional(),
    policySnapshotMode: z
      .enum([
        "keep_existing",
        "copy_from_course_if_missing",
        "replace_from_course",
      ])
      .default("copy_from_course_if_missing"),
  })
  .strict();

export type AssignLessonToCourseInput = z.infer<
  typeof assignLessonToCourseSchema
>;
