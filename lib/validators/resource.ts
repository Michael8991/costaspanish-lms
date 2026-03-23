import { z } from "zod";
import {
  CEFR_LEVELS,
  DELIVERY_MODES,
  FORMAT_TYPES,
  LESSON_STAGES,
  PEDAGOGICAL_TYPES,
  RESOURCE_STATUS,
  RESOURCE_VISIBILITY,
  SKILL_FOCUS,
} from "@/lib/constants/resource.constants";

const objectIdRegex = /^[a-f\d]{24}$/i;

const dedupe = <T>(items: T[]) => [...new Set(items)];

const optionalTrimmedString = (max = 3000) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().max(max).optional()
  );

const optionalUrlString = () =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? undefined : trimmed;
    },
    z.string().url().optional()
  );

const normalizedLooseStringArray = z
  .array(z.string().trim().toLowerCase().min(1).max(80))
  .default([])
  .transform((items) => dedupe(items));

const levelsArraySchema = z
  .array(z.enum(CEFR_LEVELS))
  .default([])
  .transform((items) => dedupe(items));

const skillsArraySchema = z
  .array(z.enum(SKILL_FOCUS))
  .default([])
  .transform((items) => dedupe(items));

const deliveryModesArraySchema = z
  .array(z.enum(DELIVERY_MODES))
  .default(["classwork", "homework"])
  .transform((items) => dedupe(items));

const lessonStagesArraySchema = z
  .array(z.enum(LESSON_STAGES))
  .default([])
  .transform((items) => dedupe(items));

export const resourceIdParamSchema = z.object({
  id: z.string().regex(objectIdRegex, "Invalid resource id"),
});

export const resourceListQuerySchema = z.object({
  search: optionalTrimmedString(120),
  level: z.enum(CEFR_LEVELS).optional(),
  pedagogicalType: z.enum(PEDAGOGICAL_TYPES).optional(),
  format: z.enum(FORMAT_TYPES).optional(),
  status: z.enum(RESOURCE_STATUS).optional(),
  visibility: z.enum(RESOURCE_VISIBILITY).optional(),
  ownership: z.enum(["mine", "shared", "all"]).default("all"),
  ownerTeacherId: z
    .string()
    .regex(objectIdRegex, "ownerTeacherId must be a valid ObjectId")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const createResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().trim().max(3000).optional().default(""),

    status: z.enum(RESOURCE_STATUS).optional(),
    visibility: z.enum(RESOURCE_VISIBILITY).optional(),

    pedagogicalType: z.enum(PEDAGOGICAL_TYPES),

    levels: levelsArraySchema,
    skills: skillsArraySchema,
    deliveryModes: deliveryModesArraySchema,
    lessonStages: lessonStagesArraySchema,

    grammarTopics: normalizedLooseStringArray,
    vocabularyTopics: normalizedLooseStringArray,
    tags: normalizedLooseStringArray,

    estimatedDurationMinutes: z.coerce.number().int().min(1).max(180).optional(),
    difficulty: z.coerce.number().int().min(1).max(5).optional(),

    hasAnswerKey: z.boolean().optional().default(false),
    requiresTeacherReview: z.boolean().optional().default(false),

    format: z.enum(FORMAT_TYPES),

    storagePath: optionalTrimmedString(500),
    fileUrl: optionalUrlString(),
    originalFilename: optionalTrimmedString(255),
    mimeType: optionalTrimmedString(120),
    fileSizeBytes: z.coerce.number().int().min(0).optional(),
    pageCount: z.coerce.number().int().min(1).optional(),
    durationSeconds: z.coerce.number().int().min(1).optional(),
    thumbnailUrl: optionalUrlString(),
    thumbnailStoragePath: z.string().trim().max(500).optional().or(z.literal("")),

    externalUrl: optionalUrlString(),
  })
  .superRefine((data, ctx) => {
    const isExternal = data.format === "external_link";

    if (isExternal) {
      if (!data.externalUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message: "externalUrl is required when format is 'external_link'.",
        });
      }

      if (data.storagePath || data.fileUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["format"],
          message:
            "External resources must not include storagePath or fileUrl.",
        });
      }
    } else {
      if (!data.storagePath && !data.fileUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["storagePath"],
          message:
            "A non-external resource must include storagePath or fileUrl.",
        });
      }

      if (data.externalUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message:
            "externalUrl is only allowed when format is 'external_link'.",
        });
      }
    }

    if (data.format !== "pdf" && typeof data.pageCount === "number") {
      ctx.addIssue({
        code: "custom",
        path: ["pageCount"],
        message: "pageCount only applies to pdf resources.",
      });
    }

    if (
      data.format !== "audio" &&
      data.format !== "video" &&
      typeof data.durationSeconds === "number"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: "durationSeconds only applies to audio/video resources.",
      });
    }
  });

/**
 * IMPORTANTE:
 * Para PATCH NO usamos partial() sobre createResourceSchema
 * porque create tiene defaults y eso puede inyectar valores no enviados.
 */
export const updateResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    description: z.string().trim().max(3000).optional(),

    status: z.enum(RESOURCE_STATUS).optional(),
    visibility: z.enum(RESOURCE_VISIBILITY).optional(),

    pedagogicalType: z.enum(PEDAGOGICAL_TYPES).optional(),

    levels: z
      .array(z.enum(CEFR_LEVELS))
      .optional()
      .transform((items) => (items ? dedupe(items) : undefined)),

    skills: z
      .array(z.enum(SKILL_FOCUS))
      .optional()
      .transform((items) => (items ? dedupe(items) : undefined)),

    deliveryModes: z
      .array(z.enum(DELIVERY_MODES))
      .optional()
      .transform((items) => (items ? dedupe(items) : undefined)),

    lessonStages: z
      .array(z.enum(LESSON_STAGES))
      .optional()
      .transform((items) => (items ? dedupe(items) : undefined)),

    grammarTopics: z
      .array(z.string().trim().toLowerCase().min(1).max(80))
      .optional()
      .transform((items) => (items ? dedupe(items) : undefined)),

    vocabularyTopics: z
      .array(z.string().trim().toLowerCase().min(1).max(80))
      .optional()
      .transform((items) => (items ? dedupe(items) : undefined)),

    tags: z
      .array(z.string().trim().toLowerCase().min(1).max(80))
      .optional()
      .transform((items) => (items ? dedupe(items) : undefined)),

    estimatedDurationMinutes: z.coerce.number().int().min(1).max(180).optional(),
    difficulty: z.coerce.number().int().min(1).max(5).optional(),

    hasAnswerKey: z.boolean().optional(),
    requiresTeacherReview: z.boolean().optional(),

    format: z.enum(FORMAT_TYPES).optional(),

    storagePath: optionalTrimmedString(500),
    fileUrl: optionalUrlString(),
    originalFilename: optionalTrimmedString(255),
    mimeType: optionalTrimmedString(120),
    fileSizeBytes: z.coerce.number().int().min(0).optional(),
    pageCount: z.coerce.number().int().min(1).optional(),
    durationSeconds: z.coerce.number().int().min(1).optional(),
    thumbnailUrl: optionalUrlString(),

    externalUrl: optionalUrlString(),
  })
  .superRefine((data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: "custom",
        path: [],
        message: "At least one field must be provided for update.",
      });
    }

    const format = data.format;

    // Solo validamos coherencia format/fields si el request toca alguno de esos campos
    const touchesAssetFields =
      "format" in data ||
      "storagePath" in data ||
      "fileUrl" in data ||
      "externalUrl" in data ||
      "pageCount" in data ||
      "durationSeconds" in data;

    if (!touchesAssetFields || !format) return;

    const isExternal = format === "external_link";

    if (isExternal) {
      if ("externalUrl" in data && !data.externalUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message: "externalUrl is required when format is 'external_link'.",
        });
      }

      if (data.storagePath || data.fileUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["format"],
          message:
            "External resources must not include storagePath or fileUrl.",
        });
      }
    } else {
      if (data.externalUrl) {
        ctx.addIssue({
          code: "custom",
          path: ["externalUrl"],
          message:
            "externalUrl is only allowed when format is 'external_link'.",
        });
      }
    }

    if (format !== "pdf" && typeof data.pageCount === "number") {
      ctx.addIssue({
        code: "custom",
        path: ["pageCount"],
        message: "pageCount only applies to pdf resources.",
      });
    }

    if (
      format !== "audio" &&
      format !== "video" &&
      typeof data.durationSeconds === "number"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["durationSeconds"],
        message: "durationSeconds only applies to audio/video resources.",
      });
    }
  });

export type ResourceListQueryInput = z.infer<typeof resourceListQuerySchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ResourceIdParamInput = z.infer<typeof resourceIdParamSchema>;

export function formatZodIssues(
  issues: z.ZodIssue[]
): Array<{ path: string; message: string }> {
  return issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}