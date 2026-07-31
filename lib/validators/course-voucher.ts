import { Types } from "mongoose";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "Invalid ObjectId");

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Invalid date");

const optionalDateOnlySchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  dateOnlySchema.optional(),
);

const courseVoucherRequestBaseSchema = z.object({
  memberStudentIds: z
    .array(objectIdSchema)
    .min(1)
    .transform((values) => Array.from(new Set(values))),
  selectedStartDate: optionalDateOnlySchema,
  manualCreditsByStudent: z
    .record(z.string(), z.coerce.number().min(0))
    .default({}),
  priceByStudent: z
    .record(z.string(), z.coerce.number().min(0))
    .default({}),
  paymentStatusByStudent: z
    .record(z.string(), z.enum(["pending", "paid", "partial", "waived"]))
    .default({}),
  amountPaidByStudent: z
    .record(z.string(), z.coerce.number().min(0))
    .default({}),
  paidAtByStudent: z.record(z.string(), optionalDateOnlySchema).default({}),
  paymentMethodByStudent: z
    .record(
      z.string(),
      z.enum(["cash", "bank_transfer", "bizum", "card", "other", ""]),
    )
    .default({}),
  paymentNotesByStudent: z
    .record(z.string(), z.string().trim().max(1000))
    .default({}),
  notesByStudent: z
    .record(z.string(), z.string().trim().max(1000))
    .default({}),
  internalNotesByStudent: z
    .record(z.string(), z.string().trim().max(2000))
    .default({}),
});

export const previewCourseVouchersSchema = courseVoucherRequestBaseSchema;

export const generateCourseVouchersSchema =
  courseVoucherRequestBaseSchema.extend({
    allowDuplicatePeriod: z.boolean().default(false),
  });

export type CourseVoucherRequestInput = z.infer<
  typeof previewCourseVouchersSchema
>;
export type GenerateCourseVouchersInput = z.infer<
  typeof generateCourseVouchersSchema
>;
