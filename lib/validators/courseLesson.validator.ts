import { z } from "zod";

export const createLessonFromCourseSchema = z
  .object({
    moduleOrder: z.number().int().min(0),
    lessonOrder: z.number().int().min(0),
    scheduledStart: z.coerce.date(),
    scheduledEnd: z.coerce.date(),
    timezone: z.string().trim().min(1).max(100).default("Europe/Madrid"),
    titleOverride: z.string().trim().min(1).max(180).optional(),
  })
  .strict()
  .refine((data) => data.scheduledEnd > data.scheduledStart, {
    message: "scheduledEnd must be after scheduledStart",
    path: ["scheduledEnd"],
  });

export type CreateLessonFromCourseInput = z.infer<
  typeof createLessonFromCourseSchema
>;
