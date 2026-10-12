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

const courseVoucherRequestBaseShape = {
  memberStudentIds: z
    .array(objectIdSchema)
    .min(1)
    .transform((values) => Array.from(new Set(values))),
  selectedStartDate: optionalDateOnlySchema,
  selectedEndDate: optionalDateOnlySchema,
  manualCreditsByStudent: z
    .record(z.string(), z.coerce.number().min(0))
    .default({}),
  /**
   * Precio comercial asignado a cada bono.
   *
   * Key: Student ObjectId
   * Value: precio en euros.
   *
   * No representa dinero recibido ni estado de pago.
  */
  priceByStudent: z
    .record(z.string(), z.coerce.number().min(0))
    .default({}),
  notesByStudent: z
    .record(z.string(), z.string().trim().max(1000))
    .default({}),
  internalNotesByStudent: z
    .record(z.string(), z.string().trim().max(2000))
    .default({}),
};

function validateSelectedDateRange(
  value: { selectedStartDate?: string; selectedEndDate?: string },
  context: z.RefinementCtx,
) {
  if (
    value.selectedStartDate &&
    value.selectedEndDate &&
    value.selectedEndDate < value.selectedStartDate
  ) {
    context.addIssue({
      code: "custom",
      path: ["selectedEndDate"],
      message: "selectedEndDate must be on or after selectedStartDate",
    });
  }
}

export const previewCourseVouchersSchema = z
  .object(courseVoucherRequestBaseShape)
  .strict()
  .superRefine(validateSelectedDateRange);

export const generateCourseVouchersSchema = z
  .object({
    ...courseVoucherRequestBaseShape,
    allowDuplicatePeriod: z.boolean().default(false),
  })
  .strict()
  .superRefine(validateSelectedDateRange);

export type CourseVoucherRequestInput = z.infer<
  typeof previewCourseVouchersSchema
>;
export type GenerateCourseVouchersInput = z.infer<
  typeof generateCourseVouchersSchema
>;
