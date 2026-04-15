import { z } from "zod";
import {
  COURSE_STATUSES,
  COURSE_VISIBILITIES,
  COURSE_TYPES,
  STOREFRONT_PRICE_MODES,
  CURRENCY_CODES,
  CONSUMPTION_OUTCOMES,
  DAYS_OF_WEEK,
} from "../constants/course.constants";
import { PARTICIPANT_MODES } from "../constants/courseTemplate.constants";
import { HH_MM_REGEX, nonEmptyTrimmedString, nonNegativeNumber, normalizeStringArray, objectIdString, optionalHttpUrlString, optionalTrimmedString, positiveInt } from "../utils/course-helpers";


const dayOfWeekSchema = z
  .number()
  .int()
  .refine((value) => DAYS_OF_WEEK.includes(value as typeof DAYS_OF_WEEK[number]), {
    message: "dayOfWeek must be between 1 and 7",
  });

const dateLikeSchema = z.coerce.date();


function validateCancellationRules(
  rules: {
    minHoursBeforeStart?: number;
    maxHoursBeforeStart?: number;
    outcome: (typeof CONSUMPTION_OUTCOMES)[number];
    creditsToConsume: number;
  }[]
): boolean {
  if (!Array.isArray(rules)) return false;
  if (rules.length === 0) return true;

  const normalized = rules
    .map((rule) => {
      const min = rule.minHoursBeforeStart ?? 0;
      const max = rule.maxHoursBeforeStart ?? Number.POSITIVE_INFINITY;

      return {
        min,
        max,
        outcome: rule.outcome,
        creditsToConsume: rule.creditsToConsume,
      };
    })
    .sort((a, b) => a.min - b.min);

  for (const rule of normalized) {
    if (rule.min < 0) return false;
    if (rule.max <= rule.min) return false;

    if (rule.outcome !== "consume" && rule.creditsToConsume !== 0) {
      return false;
    }

    if (rule.outcome === "consume" && rule.creditsToConsume <= 0) {
      return false;
    }
  }

  for (let i = 1; i < normalized.length; i++) {
    const prev = normalized[i - 1];
    const current = normalized[i];

    if (current.min < prev.max) {
      return false;
    }
  }

  return true;
}

export const weeklySlotSchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  startTime: z.string().trim().regex(HH_MM_REGEX, "startTime must be in HH:mm format"),
  durationMinutes: positiveInt("durationMinutes").refine((value) => value >= 15, {
    message: "durationMinutes must be at least 15",
  }),
  creditsPerOccurrence: positiveInt("creditsPerOccurrence"),
  calendarId: optionalTrimmedString,
});

export const regularPolicySchema = z.object({
  billingModel: z.literal("monthly").default("monthly"),
  voucherGenerationMode: z
    .literal("monthly_from_schedule")
    .default("monthly_from_schedule"),
  issueDayOfMonth: z
    .number()
    .int("issueDayOfMonth must be an integer")
    .min(1, "issueDayOfMonth must be >= 1")
    .max(28, "issueDayOfMonth must be <= 28")
    .default(1),
  voucherStatusOnIssue: z.literal("pending_payment").default("pending_payment"),
  timezone: nonEmptyTrimmedString("timezone", 100).default("Europe/Madrid"),
  weeklySlots: z
    .array(weeklySlotSchema)
    .min(1, "regularPolicy.weeklySlots must contain at least one slot"),
});

export const privateFlexiblePolicySchema = z.object({
  billingModel: z.literal("package").default("package"),
  voucherGenerationMode: z.literal("manual_pack").default("manual_pack"),
  allowAdditionalStudentsLater: z.boolean().default(false),
  maxStudents: positiveInt("maxStudents").default(1),
  defaultPackCredits: positiveInt("defaultPackCredits").optional(),
});

export const consumptionActionSchema = z
  .object({
    outcome: z.enum(CONSUMPTION_OUTCOMES),
    creditsToConsume: nonNegativeNumber("creditsToConsume"),
  })
  .superRefine((data, ctx) => {
    if (data.outcome !== "consume" && data.creditsToConsume !== 0) {
      ctx.addIssue({
        code: "custom",
        message: 'creditsToConsume must be 0 when outcome is not "consume"',
        path: ["creditsToConsume"],
      });
    }

    if (data.outcome === "consume" && data.creditsToConsume <= 0) {
      ctx.addIssue({
        code: "custom",
        message: 'creditsToConsume must be greater than 0 when outcome is "consume"',
        path: ["creditsToConsume"],
      });
    }
  });

export const studentCancellationRuleSchema = z.object({
  minHoursBeforeStart: z.number().min(0).optional(),
  maxHoursBeforeStart: z.number().min(0).optional(),
  outcome: z.enum(CONSUMPTION_OUTCOMES),
  creditsToConsume: nonNegativeNumber("creditsToConsume"),
});

export const consumptionPoliciesSchema = z
  .object({
    attendance: consumptionActionSchema.default({
      outcome: "consume",
      creditsToConsume: 1,
    }),
    noShow: consumptionActionSchema.default({
      outcome: "consume",
      creditsToConsume: 1,
    }),
    teacherCancellation: consumptionActionSchema.default({
      outcome: "reschedule",
      creditsToConsume: 0,
    }),
    studentCancellationRules: z.array(studentCancellationRuleSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (!validateCancellationRules(data.studentCancellationRules)) {
      ctx.addIssue({
        code: "custom",
        message:
          "studentCancellationRules must be non-overlapping and consistent with outcome/creditsToConsume",
        path: ["studentCancellationRules"],
      });
    }
  });

export const priceConditionSchema = z
  .object({
    participantMode: z.enum(PARTICIPANT_MODES).optional(),
    participantCount: z.number().int().min(1).optional(),
    packageClasses: z.number().int().min(1).optional(),
    monthlyClasses: z.number().int().min(1).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.packageClasses && data.monthlyClasses) {
      ctx.addIssue({
        code: "custom",
        message: "A price condition cannot define both packageClasses and monthlyClasses",
        path: ["monthlyClasses"],
      });
    }

    if (data.participantMode === "solo" && data.participantCount && data.participantCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount must be 1 when participantMode is "solo"',
        path: ["participantCount"],
      });
    }

    if (data.participantMode === "pair" && data.participantCount && data.participantCount !== 2) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount must be 2 when participantMode is "pair"',
        path: ["participantCount"],
      });
    }

    if (data.participantMode === "trio" && data.participantCount && data.participantCount !== 3) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount must be 3 when participantMode is "trio"',
        path: ["participantCount"],
      });
    }

    if (data.participantMode === "group" && data.participantCount && data.participantCount < 2) {
      ctx.addIssue({
        code: "custom",
        message: 'participantCount should be >= 2 when participantMode is "group"',
        path: ["participantCount"],
      });
    }
  });

export const priceOptionSchema = z.object({
  label: nonEmptyTrimmedString("label", 120),
  amount: nonNegativeNumber("amount").optional(),
  condition: priceConditionSchema.optional(),
  isFeatured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const courseStorefrontSchema = z
  .object({
    isPublished: z.boolean().default(false),
    slug: optionalTrimmedString,
    publicTitle: nonEmptyTrimmedString("publicTitle", 140),
    shortDescription: nonEmptyTrimmedString("shortDescription", 300),
    longDescription: optionalTrimmedString,
    seoTitle: optionalTrimmedString.pipe(
      z.string().max(70, "seoTitle must be at most 70 characters").optional()
    ),
    seoDescription: optionalTrimmedString.pipe(
      z.string().max(160, "seoDescription must be at most 160 characters").optional()
    ),
    promoVideoUrl: optionalHttpUrlString(),
    benefits: normalizeStringArray(160),
    priceMode: z.enum(STOREFRONT_PRICE_MODES).default("custom_label"),
    priceOptions: z.array(priceOptionSchema).default([]),
    currency: z.enum(CURRENCY_CODES).default("EUR"),
    heroImageUrl: optionalHttpUrlString(),
    thumbnailUrl: optionalTrimmedString,
    ctaText: optionalTrimmedString.pipe(
      z.string().max(60, "ctaText must be at most 60 characters").optional()
    ),
  })
  .superRefine((data, ctx) => {
    if (data.isPublished && !data.slug) {
      ctx.addIssue({
        code: "custom",
        message: "slug is required when storefront.isPublished is true",
        path: ["slug"],
      });
    }

    if (data.priceMode === "free") {
      for (const [index, option] of data.priceOptions.entries()) {
        if (typeof option.amount === "number" && option.amount !== 0) {
          ctx.addIssue({
            code: "custom",
            message: 'When priceMode is "free", every price option amount must be 0',
            path: ["priceOptions", index, "amount"],
          });
        }
      }
    }

    if (data.priceMode === "monthly") {
      for (const [index, option] of data.priceOptions.entries()) {
        if (
          option.condition?.packageClasses !== undefined &&
          option.condition?.monthlyClasses === undefined
        ) {
          ctx.addIssue({
            code: "custom",
            message: 'Monthly pricing should use "monthlyClasses", not "packageClasses"',
            path: ["priceOptions", index, "condition", "packageClasses"],
          });
        }
      }
    }

    if (data.priceMode === "package") {
      for (const [index, option] of data.priceOptions.entries()) {
        if (
          option.condition?.monthlyClasses !== undefined &&
          option.condition?.packageClasses === undefined
        ) {
          ctx.addIssue({
            code: "custom",
            message: 'Package pricing should use "packageClasses", not "monthlyClasses"',
            path: ["priceOptions", index, "condition", "monthlyClasses"],
          });
        }
      }
    }

    if (data.priceMode !== "free" && data.priceMode !== "custom_label") {
      for (const [index, option] of data.priceOptions.entries()) {
        if (option.isActive && typeof option.amount !== "number") {
          ctx.addIssue({
            code: "custom",
            message: "Active price options require amount",
            path: ["priceOptions", index, "amount"],
          });
        }
      }
    }
  });

export const publicationMetaSchema = z
  .object({
    enrollmentOpen: z.boolean().default(false),
    publishedAt: dateLikeSchema.optional(),
    enrollmentOpensAt: dateLikeSchema.optional(),
    enrollmentClosesAt: dateLikeSchema.optional(),
    maxStudents: positiveInt("maxStudents").optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.enrollmentClosesAt &&
      data.enrollmentOpensAt &&
      data.enrollmentClosesAt < data.enrollmentOpensAt
    ) {
      ctx.addIssue({
        code: "custom",
        message: "enrollmentClosesAt cannot be earlier than enrollmentOpensAt",
        path: ["enrollmentClosesAt"],
      });
    }
  });

export const courseStatsSchema = z.object({
  activeEnrollmentCount: z.number().int().min(0).default(0),
  lessonCount: z.number().int().min(0).default(0),
});


export const courseProfileBaseSchema = z.object({
  templateId: objectIdString("templateId"),
  templateVersion: z.number().int().min(1).default(1),

  code: nonEmptyTrimmedString("code", 60).transform((value) => value.toUpperCase()),
  internalName: nonEmptyTrimmedString("internalName", 140),
  description: optionalTrimmedString,

  status: z.enum(COURSE_STATUSES).default("draft"),
  visibility: z.enum(COURSE_VISIBILITIES).default("private"),
  courseType: z.enum(COURSE_TYPES),

  regularPolicy: regularPolicySchema.optional(),
  privateFlexiblePolicy: privateFlexiblePolicySchema.optional(),
  consumptionPolicies: consumptionPoliciesSchema,

  storefront: courseStorefrontSchema,
  publicationMeta: publicationMetaSchema.default({
    enrollmentOpen: false,
  }),

  stats: courseStatsSchema.default({
    activeEnrollmentCount: 0,
    lessonCount: 0,
  }),
});


export const createCourseProfileSchema = courseProfileBaseSchema.superRefine(
  (data, ctx) => {
    const isRegular =
      data.courseType === "regular_group" || data.courseType === "intensive_group";

    if (isRegular && !data.regularPolicy) {
      ctx.addIssue({
        code: "custom",
        message: "regularPolicy is required for regular_group and intensive_group",
        path: ["regularPolicy"],
      });
    }

    if (data.courseType === "private_flexible" && !data.privateFlexiblePolicy) {
      ctx.addIssue({
        code: "custom",
        message: "privateFlexiblePolicy is required for private_flexible",
        path: ["privateFlexiblePolicy"],
      });
    }

    if (!isRegular && data.regularPolicy) {
      ctx.addIssue({
        code: "custom",
        message: "regularPolicy is only allowed for regular_group and intensive_group",
        path: ["regularPolicy"],
      });
    }

    if (data.courseType !== "private_flexible" && data.privateFlexiblePolicy) {
      ctx.addIssue({
        code: "custom",
        message: "privateFlexiblePolicy is only allowed for private_flexible",
        path: ["privateFlexiblePolicy"],
      });
    }

    if (data.storefront.priceMode === "free") {
      for (const [index, option] of data.storefront.priceOptions.entries()) {
        if (option.amount !== undefined && option.amount !== 0) {
          ctx.addIssue({
            code: "custom",
            message: 'When priceMode is "free", every price option amount must be 0',
            path: ["storefront", "priceOptions", index, "amount"],
          });
        }
      }
    }
  }
);

export const updateCourseProfileSchema = courseProfileBaseSchema
  .partial()
  .superRefine((data, ctx) => {
    if (data.storefront?.isPublished && !data.storefront?.slug) {
      ctx.addIssue({
        code: "custom",
        message: "slug is required when storefront.isPublished is true",
        path: ["storefront", "slug"],
      });
    }

    if (data.storefront?.priceMode === "free" && data.storefront?.priceOptions) {
      for (const [index, option] of data.storefront.priceOptions.entries()) {
        if (typeof option.amount === "number" && option.amount !== 0) {
          ctx.addIssue({
            code: "custom",
            message: 'When priceMode is "free", every price option amount must be 0',
            path: ["storefront", "priceOptions", index, "amount"],
          });
        }
      }
    }

    if (
      data.publicationMeta?.enrollmentClosesAt &&
      data.publicationMeta?.enrollmentOpensAt &&
      data.publicationMeta.enrollmentClosesAt < data.publicationMeta.enrollmentOpensAt
    ) {
      ctx.addIssue({
        code: "custom",
        message: "enrollmentClosesAt cannot be earlier than enrollmentOpensAt",
        path: ["publicationMeta", "enrollmentClosesAt"],
      });
    }

    if (
      data.courseType === "private_flexible" &&
      data.regularPolicy !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "regularPolicy is not allowed when courseType is private_flexible",
        path: ["regularPolicy"],
      });
    }

    if (
      (data.courseType === "regular_group" || data.courseType === "intensive_group") &&
      data.privateFlexiblePolicy !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        message: "privateFlexiblePolicy is not allowed for regular_group or intensive_group",
        path: ["privateFlexiblePolicy"],
      });
    }
  });

export const courseProfileDbSchema = courseProfileBaseSchema.extend({
  ownerTeacherId: objectIdString("ownerTeacherId"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateCourseProfileInput = z.infer<typeof createCourseProfileSchema>;
export type UpdateCourseProfileInput = z.infer<typeof updateCourseProfileSchema>;
export type CourseProfileDbShape = z.infer<typeof courseProfileDbSchema>;