import { z } from "zod";
import {
  COURSETEMPLATE_STATUS,
  CURRENCY_CODES,
  PARTICIPANT_MODES,
  STORE_FRONT_PRICE_MODE,
  COURSE_TEMPLATE_FREQUENCIES,
  CREDIT_CONSUME_ON_VALUES,
  DEFAULT_OPERATIONAL_DEFAULTS,
} from "../constants/courseTemplate.constants";
import { CEFR_LEVELS } from "../constants/resource.constants";
import { LESSON_CLASS_TYPES } from "../constants/lesson.constants";
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

export const templateBlockSchema = z.object({
  title: nonEmptyTrimmedString("title", 140),
  type: nonEmptyTrimmedString("type", 80),
  categories: normalizeStringArray(80),
  plannedContent: optionalTrimmedString,
  plannedObjectives: normalizeStringArray(200),
  estimatedMinutes: z.number().int().min(0).optional(),
  cefrLevels: z.array(z.enum(CEFR_LEVELS)).default([]),
  skills: normalizeStringArray(80),
  tags: normalizeStringArray(80),
  resources: z.array(z.string().trim().min(1)).default([]),
  order: z.number().int().min(0).default(0),
});

export const templateLessonSchema = z.object({
  title: nonEmptyTrimmedString("title", 140),
  description: optionalTrimmedString,
  order: z.number().int().min(0).default(0),
  estimatedMinutes: z.number().int().min(0).optional(),
  objectives: normalizeStringArray(200),
  blocks: z.array(templateBlockSchema).default([]),
  teacherNotes: optionalTrimmedString,
});

export const moduleDataSchema = z.object({
  title: nonEmptyTrimmedString("title", 120),
  description: optionalTrimmedString,
  durationLabel: optionalTrimmedString,
  type: optionalTrimmedString,
  order: z.number().int().min(0).default(0),
  objectives: normalizeStringArray(200),
  lessons: z.array(templateLessonSchema).default([]),
  submodules: z.array(subModuleSchema).default([]),
});

export const curriculumSchema = z.object({
  modules: z.array(moduleDataSchema).default([]),
  units: normalizeStringArray(120),
});

export const courseLessonDefaultsSchema = z.object({
  durationMinutes: z.number().int().min(1).default(60),
  timezone: z.string().trim().min(1).default("Europe/Madrid"),
  defaultClassType: z.enum(LESSON_CLASS_TYPES).default("private"),
});

export const courseSchedulingDefaultsSchema = z.object({
  frequency: z.enum(COURSE_TEMPLATE_FREQUENCIES).default("weekly"),
  sessionsPerWeek: z.number().int().min(1).default(1),
  preferredWeekdays: z
    .array(z.number().int().min(0).max(6))
    .default([]),
  allowRecurringLessons: z.boolean().default(true),
});

export const courseCreditPolicySchema = z.object({
  creditsPerLesson: z.number().min(0).default(1),
  consumeOn: z.enum(CREDIT_CONSUME_ON_VALUES).default("completion"),
  trialConsumesCredit: z.boolean().default(false),
  cancellationConsumesCredit: z.boolean().default(false),
  noShowConsumesCredit: z.boolean().default(true),
});

export const courseParticipantPolicySchema = z
  .object({
    participantMode: z.enum(PARTICIPANT_MODES).default("solo"),
    minStudents: z.number().int().min(1).default(1),
    maxStudents: z.number().int().min(1).default(1),
  })
  .superRefine((data, ctx) => {
    if (data.maxStudents < data.minStudents) {
      ctx.addIssue({
        code: "custom",
        message: "El máximo de alumnos debe ser igual o mayor que el mínimo.",
        path: ["maxStudents"],
      });
    }

    const exactCounts = {
      solo: 1,
      pair: 2,
      trio: 3,
    } as const;
    const exactCount =
      data.participantMode === "group"
        ? undefined
        : exactCounts[data.participantMode];

    if (
      exactCount !== undefined &&
      (data.minStudents !== exactCount || data.maxStudents !== exactCount)
    ) {
      ctx.addIssue({
        code: "custom",
        message: `Este modo requiere exactamente ${exactCount} ${
          exactCount === 1 ? "alumno" : "alumnos"
        }.`,
        path: ["maxStudents"],
      });
    }

    if (data.participantMode === "group" && data.maxStudents < 2) {
      ctx.addIssue({
        code: "custom",
        message: "Un grupo debe permitir al menos 2 alumnos.",
        path: ["maxStudents"],
      });
    }
  });

export const coursePreparationPolicySchema = z.object({
  copyTemplateBlocksToLesson: z.boolean().default(true),
  copyTemplateResourcesToLesson: z.boolean().default(true),
  defaultPreparationStatus: z
    .enum(["needs_preparation", "prepared"])
    .default("needs_preparation"),
});

const courseOperationalDefaultsObjectSchema = z.object({
    lessonDefaults: courseLessonDefaultsSchema.default({
      ...DEFAULT_OPERATIONAL_DEFAULTS.lessonDefaults,
    }),
    schedulingDefaults: courseSchedulingDefaultsSchema.default({
      ...DEFAULT_OPERATIONAL_DEFAULTS.schedulingDefaults,
      preferredWeekdays: [],
    }),
    creditPolicy: courseCreditPolicySchema.default({
      ...DEFAULT_OPERATIONAL_DEFAULTS.creditPolicy,
    }),
    participantPolicy: courseParticipantPolicySchema.default({
      ...DEFAULT_OPERATIONAL_DEFAULTS.participantPolicy,
    }),
    preparationPolicy: coursePreparationPolicySchema.default({
      ...DEFAULT_OPERATIONAL_DEFAULTS.preparationPolicy,
    }),
  });

export const courseOperationalDefaultsSchema =
  courseOperationalDefaultsObjectSchema.default({
    lessonDefaults: { ...DEFAULT_OPERATIONAL_DEFAULTS.lessonDefaults },
    schedulingDefaults: {
      ...DEFAULT_OPERATIONAL_DEFAULTS.schedulingDefaults,
      preferredWeekdays: [],
    },
    creditPolicy: { ...DEFAULT_OPERATIONAL_DEFAULTS.creditPolicy },
    participantPolicy: { ...DEFAULT_OPERATIONAL_DEFAULTS.participantPolicy },
    preparationPolicy: { ...DEFAULT_OPERATIONAL_DEFAULTS.preparationPolicy },
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
  operationalDefaults: courseOperationalDefaultsSchema,
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

export const updateCourseTemplateSchema = z
  .object({
    code: courseTemplateBaseSchema.shape.code.optional(),
    internalName: courseTemplateBaseSchema.shape.internalName.optional(),
    status: z.enum(COURSETEMPLATE_STATUS).optional(),
    version: z.number().int().min(1).optional(),
    pedagogicalMeta: pedagogicalMetaSchema.optional(),
    storefront: storefrontSchema.optional(),
    curriculum: curriculumSchema.optional(),
    operationalDefaults: courseOperationalDefaultsObjectSchema.optional(),
  })
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

export const importLessonToTemplateSchema = z
  .object({
    lessonId: z.string().trim().min(1, "lessonId is required"),
    targetModuleOrder: z.number().int().min(0),
    insertAt: z.number().int().min(0).optional(),
    titleOverride: z.string().trim().max(140).optional(),
    descriptionOverride: z.string().trim().max(1000).optional(),
    teacherNotes: z.string().trim().max(1000).optional(),
    importOptions: z
      .object({
        useActualContent: z.boolean().default(true),
        includeResources: z.boolean().default(true),
        selectedBlockIds: z.array(z.string().trim().min(1)).optional().default([]),
      })
      .strict()
      .default({
        useActualContent: true,
        includeResources: true,
        selectedBlockIds: [],
      }),
  })
  .strict();

export type CreateCourseTemplateInput = z.infer<typeof createCourseTemplateSchema>;
export type UpdateCourseTemplateInput = z.infer<typeof updateCourseTemplateSchema>;
export type CourseTemplateDbShape = z.infer<typeof courseTemplateDbSchema>;
export type ImportLessonToTemplateInput = z.infer<
  typeof importLessonToTemplateSchema
>;
