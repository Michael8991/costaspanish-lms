import { z } from "zod";

const academicLevelSchema = z.enum([
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "Evaluando",
]);

const studentProfileFields = {
  fullName: z.string().trim().min(1).max(120),
  contactEmail: z.string().trim().email().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().max(30).optional(),
  country: z.string().trim().max(100).optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
  level: academicLevelSchema.optional(),
  nativeLanguage: z.string().trim().max(100).optional(),
  goals: z.array(z.string().trim().min(1).max(300)).max(50).optional(),
  internalNotes: z.string().max(5000).optional(),
  isActive: z.boolean().optional(),
};

export const createStudentProfileSchema = z
  .object(studentProfileFields)
  .strict()
  .superRefine((value, context) => {
    if (!value.contactEmail && !value.email) {
      context.addIssue({
        code: "custom",
        path: ["contactEmail"],
        message: "Contact email is required",
      });
    }
  });

export const updateStudentProfileSchema = z
  .object(studentProfileFields)
  .partial()
  .strict();
