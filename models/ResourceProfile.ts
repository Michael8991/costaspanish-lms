import mongoose, { Schema, model, models, Types } from "mongoose";

/* =========================================================
 * ENUMS / CONSTANTS
 * ======================================================= */

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type CEFRLevel = (typeof CEFR_LEVELS)[number];

export const RESOURCE_STATUS = ["draft", "published", "archived"] as const;
export type ResourceStatus = (typeof RESOURCE_STATUS)[number];

export const RESOURCE_VISIBILITY = ["private", "shared"] as const;
export type ResourceVisibility = (typeof RESOURCE_VISIBILITY)[number];

export const PEDAGOGICAL_TYPES = [
  "worksheet",
  "audio_track",
  "video_clip",
  "flashcards",
  "reading_text",
  "grammar_reference",
  "speaking_prompt",
  "writing_prompt",
  "quiz",
  "game",
  "other",
] as const;
export type PedagogicalType = (typeof PEDAGOGICAL_TYPES)[number];

export const FORMAT_TYPES = [
  "pdf",
  "image",
  "audio",
  "video",
  "external_link",
] as const;
export type FormatType = (typeof FORMAT_TYPES)[number];

export const SKILL_FOCUS = [
  "speaking",
  "listening",
  "reading",
  "writing",
  "grammar",
  "vocabulary",
  "pronunciation",
] as const;
export type SkillFocus = (typeof SKILL_FOCUS)[number];

export const DELIVERY_MODES = ["classwork", "homework"] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const LESSON_STAGES = [
  "warmup",
  "review",
  "input",
  "guided_practice",
  "freer_practice",
  "correction",
  "wrap_up",
  "homework",
  "assessment",
] as const;
export type LessonStage = (typeof LESSON_STAGES)[number];

/* =========================================================
 * INTERFACE
 * ======================================================= */

export interface IResource {
  // 1) Identidad
  title: string;
  description: string;
  status: ResourceStatus;
  visibility: ResourceVisibility;

  // 2) Clasificación pedagógica
  pedagogicalType: PedagogicalType;
  levels: CEFRLevel[];
  skills: SkillFocus[];
  deliveryModes: DeliveryMode[];
  lessonStages: LessonStage[];

  grammarTopics: string[];
  vocabularyTopics: string[];
  tags: string[];

  estimatedDurationMinutes?: number;
  difficulty?: number; // 1-5

  hasAnswerKey: boolean;
  requiresTeacherReview: boolean;

  // 3) Formato / origen técnico
  format: FormatType;

  // Si es archivo propio (Firebase Storage)
  storagePath?: string;
  fileUrl?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  durationSeconds?: number;
  thumbnailUrl?: string;

  // Si es recurso externo
  externalUrl?: string;

  // 4) Gobernanza / trazabilidad
  ownerTeacherId?: Types.ObjectId;
  timesUsed: number;

  createdAt: Date;
  updatedAt: Date;
}

export type ResourceDoc = mongoose.HydratedDocument<IResource>;

/* =========================================================
 * HELPERS
 * ======================================================= */

function normalizeLooseStringArray(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return [...new Set(
    values
      .filter((v): v is string => typeof v === "string")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  )];
}

function dedupeEnumArray<T>(values: unknown): T[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values)] as T[];
}

/* =========================================================
 * SCHEMA
 * ======================================================= */

const ResourceSchema = new Schema<IResource>(
  {
    // 1) Identidad
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: RESOURCE_STATUS,
      default: "draft",
      index: true,
    },
    visibility: {
      type: String,
      enum: RESOURCE_VISIBILITY,
      default: "private",
      index: true,
    },

    // 2) Clasificación pedagógica
    pedagogicalType: {
      type: String,
      enum: PEDAGOGICAL_TYPES,
      required: true,
      index: true,
    },
    levels: {
      type: [{ type: String, enum: CEFR_LEVELS }],
      default: [],
      index: true,
    },
    skills: {
      type: [{ type: String, enum: SKILL_FOCUS }],
      default: [],
      index: true,
    },
    deliveryModes: {
      type: [{ type: String, enum: DELIVERY_MODES }],
      default: ["classwork", "homework"],
    },
    lessonStages: {
      type: [{ type: String, enum: LESSON_STAGES }],
      default: [],
    },

    grammarTopics: {
      type: [String],
      default: [],
    },
    vocabularyTopics: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },

    estimatedDurationMinutes: {
      type: Number,
      min: 1,
      max: 180,
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 5,
    },

    hasAnswerKey: {
      type: Boolean,
      default: false,
    },
    requiresTeacherReview: {
      type: Boolean,
      default: false,
    },

    // 3) Formato / origen técnico
    format: {
      type: String,
      enum: FORMAT_TYPES,
      required: true,
      index: true,
    },

    storagePath: {
      type: String,
      trim: true,
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    originalFilename: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
      min: 0,
    },
    pageCount: {
      type: Number,
      min: 1,
    },
    durationSeconds: {
      type: Number,
      min: 1,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },

    externalUrl: {
      type: String,
      trim: true,
    },

    // 4) Gobernanza / trazabilidad
    ownerTeacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    timesUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
 * NORMALIZACIÓN
 * ======================================================= */

ResourceSchema.pre(
  "validate",
  { document: true, query: false },
  async function () {
    this.levels = dedupeEnumArray<CEFRLevel>(this.levels);
    this.skills = dedupeEnumArray<SkillFocus>(this.skills);
    this.deliveryModes = dedupeEnumArray<DeliveryMode>(this.deliveryModes);
    this.lessonStages = dedupeEnumArray<LessonStage>(this.lessonStages);

    this.grammarTopics = normalizeLooseStringArray(this.grammarTopics);
    this.vocabularyTopics = normalizeLooseStringArray(this.vocabularyTopics);
    this.tags = normalizeLooseStringArray(this.tags);

    const isExternal = this.format === "external_link";

    if (isExternal) {
      if (!this.externalUrl) {
        this.invalidate(
          "externalUrl",
          "externalUrl is required when format is 'external_link'."
        );
      }

      if (this.storagePath || this.fileUrl) {
        this.invalidate(
          "format",
          "External resources must not contain storagePath or fileUrl."
        );
      }
    } else {
      if (!this.storagePath && !this.fileUrl) {
        this.invalidate(
          "storagePath",
          "A non-external resource must contain at least storagePath or fileUrl."
        );
      }

      if (this.externalUrl) {
        this.invalidate(
          "externalUrl",
          "externalUrl is only allowed when format is 'external_link'."
        );
      }
    }

    if (this.format === "pdf" && this.durationSeconds) {
      this.invalidate(
        "durationSeconds",
        "durationSeconds only applies to audio/video resources."
      );
    }

    if (
      this.format !== "pdf" &&
      typeof this.pageCount === "number" &&
      this.pageCount > 0
    ) {
      this.invalidate(
        "pageCount",
        "pageCount only applies to pdf resources."
      );
    }
  }
);
/* =========================================================
 * ÍNDICES
 * ======================================================= */

// Búsquedas comunes de biblioteca
ResourceSchema.index({
  ownerTeacherId: 1,
  status: 1,
  visibility: 1,
});

ResourceSchema.index({
  ownerTeacherId: 1,
  levels: 1,
  skills: 1,
  pedagogicalType: 1,
});

ResourceSchema.index({
  ownerTeacherId: 1,
  deliveryModes: 1,
  lessonStages: 1,
});

ResourceSchema.index({
  ownerTeacherId: 1,
  format: 1,
  status: 1,
});

// Búsqueda textual
ResourceSchema.index(
  {
    title: "text",
    description: "text",
    tags: "text",
    grammarTopics: "text",
    vocabularyTopics: "text",
  },
  {
    weights: {
      title: 10,
      tags: 6,
      grammarTopics: 5,
      vocabularyTopics: 5,
      description: 3,
    },
    name: "resource_text_search",
  }
);

/* =========================================================
 * MODEL
 * ======================================================= */

export const Resource =
  models.Resource || model<IResource>("Resource", ResourceSchema);