import { z } from "zod";

export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Debe ser un ObjectId válido")
  .transform((value) => value.toLowerCase());

export const enrollStudentSchema = z
  .object({
    studentId: objectIdSchema,
  })
  .strict();

