import { Schema, Types, model, models, HydratedDocument } from "mongoose";
import { CEFRLevel } from "./ResourceProfile";

export type CourseTemplateStatus = "draft" | "ready" | "archived";
export type StorefrontPriceMode = "monthly" | "package" | "free" | "custom_label";
export type CurrencyCode = "EUR";
export type ParticipantMode = "solo" | "pair" | "trio" | "group";

export interface IPedagogicalMeta {
  level: CEFRLevel;
  category: string;
  objectives: string[];
  methodology?: string;
  estimatedDurationLabel?: string;
  targetAudience?: string;
}

export interface IPriceCondition {
  participantMode?: ParticipantMode;
  participantCount?: number;
  packageClasses?: number;
  monthlyClasses?: number;
}

export interface IPriceOption {
  label: string;
  amount?: number;
  condition?: IPriceCondition;
  isFeatured?: boolean;
  isActive: boolean;
  sortOrder?: number;
}

export interface IStorefront {
  isPublished: boolean;
  publicTitle: string;
  shortDescription: string;
  longDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  promoVideoUrl?: string;
  benefits: string[];
  priceMode: StorefrontPriceMode;
  priceOptions: IPriceOption[];
  currency: CurrencyCode;
  heroImageUrl?: string;
  thumbnailUrl?: string;
  ctaText?: string;
}

export interface ISubModule {
  title: string;
  type?: string;
  durationLabel?: string;
}

export interface IModuleData {
  title: string;
  durationLabel?: string;
  type?: string;
  submodules?: ISubModule[];
}

export interface ICurriculum {
  modules?: IModuleData[];
  units?: string[];
}

export interface ICourseTemplate {
  ownerTeacherId: Types.ObjectId;
  code: string;
  internalName: string;
  status: CourseTemplateStatus;
  version: number;

  pedagogicalMeta: IPedagogicalMeta;
  storefront: IStorefront;
  curriculum?: ICurriculum;

  createdAt: Date;
  updatedAt: Date;
}

export type CourseTemplateDocument = HydratedDocument<ICourseTemplate>;

const PriceConditionSchema = new Schema<IPriceCondition>(
  {
    participantMode: {
      type: String,
      enum: ["solo", "pair", "trio", "group"],
    },
    participantCount: {
      type: Number,
      min: 1,
    },
    packageClasses: {
      type: Number,
      min: 1,
    },
    monthlyClasses: {
      type: Number,
      min: 1,
    },
  },
  { _id: false }
);

const PriceOptionSchema = new Schema<IPriceOption>(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    amount: {
      type: Number,
      min: 0,
    },
    condition: {
      type: PriceConditionSchema,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const StorefrontSchema = new Schema<IStorefront>(
  {
    isPublished: {
      type: Boolean,
      required: true,
      default: false,
    },
    publicTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    longDescription: {
      type: String,
      trim: true,
    },
    seoTitle: {
      type: String,
      trim: true,
      maxlength: 70,
    },
    seoDescription: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    promoVideoUrl: {
      type: String,
      trim: true,
    },
    benefits: {
      type: [String],
      default: [],
    },
    priceMode: {
      type: String,
      enum: ["monthly", "package", "free", "custom_label"],
      required: true,
      default: "custom_label",
    },
    priceOptions: {
      type: [PriceOptionSchema],
      default: [],
    },
    currency: {
      type: String,
      enum: ["EUR"],
      required: true,
      default: "EUR",
    },
    heroImageUrl: {
      type: String,
      trim: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    ctaText: {
      type: String,
      trim: true,
      maxlength: 60,
    },
  },
  { _id: false }
);

const PedagogicalMetaSchema = new Schema<IPedagogicalMeta>(
  {
    level: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    objectives: {
      type: [String],
      default: [],
    },
    methodology: {
      type: String,
      trim: true,
    },
    estimatedDurationLabel: {
      type: String,
      trim: true,
    },
    targetAudience: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const SubModuleSchema = new Schema<ISubModule>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    durationLabel: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const ModuleDataSchema = new Schema<IModuleData>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    durationLabel: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      trim: true,
    },
    submodules: {
      type: [SubModuleSchema],
      default: [],
    },
  },
  { _id: false }
);

const CurriculumSchema = new Schema<ICurriculum>(
  {
    modules: {
      type: [ModuleDataSchema],
      default: [],
    },
    units: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const CourseTemplateSchema = new Schema<ICourseTemplate>(
  {
    ownerTeacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    internalName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "ready", "archived"],
      required: true,
      default: "draft",
    },
    version: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    pedagogicalMeta: {
      type: PedagogicalMetaSchema,
      required: true,
    },
    storefront: {
      type: StorefrontSchema,
      required: true,
    },
    curriculum: {
      type: CurriculumSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

CourseTemplateSchema.index({ ownerTeacherId: 1, code: 1 }, { unique: true });

export const CourseTemplate =
  models.CourseTemplate ||
  model<ICourseTemplate>("CourseTemplate", CourseTemplateSchema);