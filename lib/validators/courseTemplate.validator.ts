import { z } from "zod";
import {
  COURSETEMPLATE_STATUS,
  CURRENCY_CODES,
  PARTICIPANT_MODES,
  STORE_FRONT_PRICE_MODE,
} from "../constants/courseTemplate.constants";
import { CEFR_LEVELS } from "../constants/resource.constants";
import {
  nonEmptyTrimmedString,
  nonNegativeNumber,
  normalizeStringArray,
  optionalHttpUrlString,
  optionalTrimmedString,
} from "../utils/course-helpers";

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
        message:
          "A price condition cannot define both packageClasses and monthlyClasses",
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

export const storefrontSchema = z
  .object({
    isPublished: z.boolean().default(false),
    publicTitle: nonEmptyTrimmedString("publicTitle", 140),
    shortDescription: nonEmptyTrimmedString("shortDescription", 300),
    longDescription: optionalTrimmedString,
    seoTitle: optionalTrimmedString.pipe(
      z.string().max(70, "seoTitle must be at most 70 characters").optional(),
    ),
    seoDescription: optionalTrimmedString.pipe(
      z.string().max(160, "seoDescription must be at most 160 characters").optional(),
    ),
    promoVideoUrl: optionalHttpUrlString(),
    benefits: normalizeStringArray(160),
    priceMode: z.enum(STORE_FRONT_PRICE_MODE),
    priceOptions: z.array(priceOptionSchema).default([]),
    currency: z.enum(CURRENCY_CODES).default("EUR"),
    heroImageUrl: optionalHttpUrlString(),
    thumbnailUrl: optionalTrimmedString,
    ctaText: optionalTrimmedString.pipe(
      z.string().max(60, "ctaText must be at most 60 characters").optional(),
    ),
  })
  .superRefine((data, ctx) => {
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

export const pedagogicalMetaSchema = z.object({
  level: z.enum(CEFR_LEVELS),
  category: nonEmptyTrimmedString("category", 80),
  objectives: normalizeStringArray(200),
  methodology: optionalTrimmedString,
  estimatedDurationLabel: optionalTrimmedString,
  targetAudience: optionalTrimmedString,
});

export const subModuleSchema = z.object({
  title: nonEmptyTrimmedString("category", 80),
  type: optionalTrimmedString,
  durationLabel: optionalTrimmedString,
});

export const moduleDataSchema = z.object({
  title: nonEmptyTrimmedString("title", 120),
  durationLabel: optionalTrimmedString,
  type: optionalTrimmedString,
  submodules: z.array(subModuleSchema).default([]),
});

export const curriculumSchema = z.object({
  modules: z.array(moduleDataSchema).default([]),
  units: normalizeStringArray(120),
});

export const courseTemplateBaseSchema = z.object({
  code: nonEmptyTrimmedString("code", 60).transform((value) =>
    value.toUpperCase(),
  ),
  internalName: nonEmptyTrimmedString("internalName", 140),
  status: z.enum(COURSETEMPLATE_STATUS).default("draft"),
  version: z.number().int().min(1).default(1),
  pedagogicalMeta: pedagogicalMetaSchema,
  storefront: storefrontSchema,
  curriculum: curriculumSchema.default({
    modules: [],
    units: [],
  }),
});

export const createCourseTemplateSchema = courseTemplateBaseSchema.superRefine(
  (data, ctx) => {
    if (data.status === "ready") {
      if (data.storefront.publicTitle.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "publicTitle is required when template status is ready",
          path: ["storefront", "publicTitle"],
        });
      }

      if (data.storefront.shortDescription.trim().length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "shortDescription is required when template status is ready",
          path: ["storefront", "shortDescription"],
        });
      }
    }
  },
);

export const updateCourseTemplateSchema = courseTemplateBaseSchema
  .partial()
  .superRefine((data, ctx) => {
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
  });

export const courseTemplateDbSchema = courseTemplateBaseSchema.extend({
  ownerTeacherId: z.string().trim().min(1, "ownerTeacherId is required"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateCourseTemplateInput = z.infer<typeof createCourseTemplateSchema>;
export type UpdateCourseTemplateInput = z.infer<typeof updateCourseTemplateSchema>;
export type CourseTemplateDbShape = z.infer<typeof courseTemplateDbSchema>;