import { z } from "zod";

const teacherTaskPrioritySchema = z.enum(["low", "medium", "high"]);
const teacherTaskStatusSchema = z.enum(["open", "completed"]);

export const createTeacherTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(1000).optional(),
  priority: teacherTaskPrioritySchema.optional(),
});

export const updateTeacherTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    notes: z.string().trim().max(1000).optional(),
    priority: teacherTaskPrioritySchema.optional(),
    status: teacherTaskStatusSchema.optional(),
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required",
  });

export type CreateTeacherTaskInput = z.infer<
  typeof createTeacherTaskSchema
>;
export type UpdateTeacherTaskInput = z.infer<
  typeof updateTeacherTaskSchema
>;
