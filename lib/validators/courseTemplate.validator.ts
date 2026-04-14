import { z } from "zod";
import { CURRENCY_CODES, PARTICIPANT_MODES, STORE_FRONT_PRICE_MODE } from "../constants/courseTemplate.constants";
import { CEFR_LEVELS } from "../constants/resource.constants";
import { STOREFRONT_PRICE_MODES } from "../constants/course.constants";

// Helpers

const optionalTrimmedString =
  z
  .string()
  .trim()
  .optional()
  .transform((value) => {
    if (value === "") return undefined;
    return value;
  });

const normalizeStringArray = (maxItemLength = 120) =>
  z.array(z.string().trim().min(1).max(maxItemLength))
    .default([])
    .transform((items) => {
      const cleaned = items
        .map((item) => item.trim())
        .filter(Boolean);
      return Array.from(new Set(cleaned))
})

  const optionalHttpUrlString = () =>
    z
      .url({
        protocol: /^https?$/,
        hostname: z.regexes.domain,
        error: "Url no válida",
      })
      .or(z.literal(""))
      .nullable()  
      .optional()
      .default("")
    .transform(val => val === "" ? undefined : val);
      
const nonEmptyTrimmedString = (fieldName: string, max = 200) =>
  z.string({
    error: (issue) =>
      issue.input === undefined
        ? `${fieldName} is required`
        : `${fieldName} must be a string`, 
    })
    .trim()
    .min(1, `${fieldName} is required`)
    .max(max, `${fieldName} must be at most  ${max} characters`)

const nonNegativeNumber = (fieldName: string) => 
  z
    .number({
      error: (issue) => 
        issue.input === undefined
          ? `${fieldName} is required`
          : `${fieldName} must be a number`
    })
    .min(0, `${fieldName} must be greater than or equal to 0` )

//Subschemas
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
  
  })

  export const priceOptionSchema = z.object({
    label: nonEmptyTrimmedString("label", 120),
    amount: nonNegativeNumber("amount").optional(),
    condition: priceConditionSchema.optional(),
    isFeatured: z.boolean().optional().default(false),
    isActive: z.boolean().optional().default(true),
    sortOrder: z.number().int().min(0).optional().default(0),
  });

  export const defaultStorefrontSchema = z
  .object({
    publicTitle: nonEmptyTrimmedString("publicTitle", 140),
    shortDescription: nonEmptyTrimmedString("shortDescription", 300),
    longDescription: optionalTrimmedString,
    seoTitle: optionalTrimmedString.pipe(
      z.string().max(70, "seoTitle must be at most 70 characters").optional()
    ),
    seoDescription: optionalTrimmedString.pipe(
      z.string().max(160, "seoDescription must be at most 160 characters").optional()
    ),
    promoVideoUrl: optionalHttpUrlString,
    benefits: normalizeStringArray(160),
    priceMode: z.enum(STORE_FRONT_PRICE_MODE),
    priceOptions: z.array(priceOptionSchema).default([]),
    currency: z.enum(CURRENCY_CODES).default("EUR"),
    heroImageUrl: optionalHttpUrlString,
    thumbnailUrl: optionalTrimmedString,
    ctaText: optionalTrimmedString.pipe(
      z.string().max(60, "ctaText must be at most 60 characters").optional()
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

//Base courseTemplate Schema


//Create Schema
// export const createCourseTemplateSchema = z
    

//Update Schema


//Internal / DB schema

//Types inferidos