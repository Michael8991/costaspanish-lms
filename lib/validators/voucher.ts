import { Types } from "mongoose";
import { z } from "zod";

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "Invalid ObjectId");

const optionalObjectIdSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  objectIdSchema.optional(),
);

const dateSchema = z.coerce.date();
const nullableDateSchema = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  dateSchema.nullable().optional(),
);

const voucherMetadataShape = {
  enrollmentId: optionalObjectIdSchema,
  courseId: optionalObjectIdSchema,
  courseNameSnapshot: z.string().trim().max(160).optional(),
  generatedFromCourse: z.boolean().optional().default(false),
  generatedFromCourseMember: z.boolean().optional().default(false),
  billingMode: z
    .enum(["individual_cycle"])
    .nullable()
    .optional(),
  billingPeriodStart: nullableDateSchema,
  billingPeriodEnd: nullableDateSchema,
  billingAnchorDay: z.coerce.number().int().min(1).max(31).nullable().optional(),
  paymentStatus: z
    .enum(["pending", "paid", "partial", "waived"])
    .optional()
    .default("pending"),
  amountPaid: z.coerce.number().min(0).optional().default(0),
  paidAt: nullableDateSchema,
  paymentMethod: z
    .enum(["cash", "bank_transfer", "bizum", "card", "other", ""])
    .optional()
    .default(""),
  paymentNotes: z.string().trim().max(1000).optional().default(""),
  internalNotes: z.string().trim().max(2000).optional().default(""),
  priceTotal: z.coerce.number().min(0).optional(),
  currency: z.enum(["EUR"]).optional().default("EUR"),
  createdFrom: z
    .enum(["manual", "course_profile", "migration", "legacy"])
    .optional()
    .default("manual"),
};

function validateVoucherRanges(
  value: {
    billingPeriodStart?: Date | null;
    billingPeriodEnd?: Date | null;
    creditsTotal?: number;
    creditsRemaining?: number;
  },
  context: z.RefinementCtx,
) {
  if (
    value.billingPeriodStart &&
    value.billingPeriodEnd &&
    value.billingPeriodEnd < value.billingPeriodStart
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["billingPeriodEnd"],
      message: "billingPeriodEnd must be on or after billingPeriodStart",
    });
  }
  if (
    value.creditsTotal !== undefined &&
    value.creditsRemaining !== undefined &&
    value.creditsRemaining > value.creditsTotal
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["creditsRemaining"],
      message: "creditsRemaining cannot exceed creditsTotal",
    });
  }
}

export const createStudentVoucherSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    billingType: z.enum(["single", "package", "subscription"]),
    classType: z.enum([
      "private",
      "pair",
      "group_regular",
      "semi_intensive",
      "intensive",
    ]),
    validFrom: dateSchema.optional(),
    validUntil: dateSchema,
    creditsTotal: z.coerce.number().min(0).optional(),
    creditsRemaining: z.coerce.number().min(0).optional(),
    status: z
      .enum(["active", "exhausted", "expired", "canceled"])
      .optional()
      .default("active"),
    price: z.coerce.number().min(0).optional(),
    ...voucherMetadataShape,
  })
  .strict()
  .superRefine((value, context) => {
    validateVoucherRanges(value, context);
    if (value.validUntil < (value.validFrom ?? new Date(0))) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validUntil"],
        message: "validUntil must be on or after validFrom",
      });
    }
    if (value.price === undefined && value.priceTotal === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["priceTotal"],
        message: "price or priceTotal is required",
      });
    }
  });

const updateStudentVoucherBaseSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    billingType: z.enum(["single", "package", "subscription"]).optional(),
    classType: z
      .enum([
        "private",
        "pair",
        "group_regular",
        "semi_intensive",
        "intensive",
      ])
      .optional(),
    validFrom: dateSchema.optional(),
    validUntil: dateSchema.optional(),
    creditsTotal: z.coerce.number().min(0).optional(),
    creditsRemaining: z.coerce.number().min(0).optional(),
    status: z
      .enum(["active", "exhausted", "expired", "canceled"])
      .optional(),
    price: z.coerce.number().min(0).optional(),
    enrollmentId: optionalObjectIdSchema,
    courseId: optionalObjectIdSchema,
    courseNameSnapshot: z.string().trim().max(160).optional(),
    generatedFromCourse: z.boolean().optional(),
    generatedFromCourseMember: z.boolean().optional(),
    billingMode: z.enum(["individual_cycle"]).nullable().optional(),
    billingPeriodStart: nullableDateSchema,
    billingPeriodEnd: nullableDateSchema,
    billingAnchorDay: z.coerce.number().int().min(1).max(31).nullable().optional(),
  })
  .partial()
  .strict();

export const updateStudentVoucherSchema =
  updateStudentVoucherBaseSchema.superRefine(validateVoucherRanges);

export const editCourseVoucherSchema = z
  .object({
    billingPeriodStart: nullableDateSchema,
    billingPeriodEnd: nullableDateSchema,
    internalNotes: z.string().trim().max(2000).optional(),
    priceTotal: z.coerce.number().min(0).optional(),
  })
  .partial()
  .strict()
  .superRefine(validateVoucherRanges);

export type EditCourseVoucherInput = z.infer<typeof editCourseVoucherSchema>;
