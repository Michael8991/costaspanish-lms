import { Schema, model, models } from "mongoose";
import { Types, HydratedDocument } from "mongoose";
import { CurrencyCode, ParticipantMode } from "./CourseTemplate";
import { COURSE_STATUSES } from "@/lib/constants/course.constants";

export type CourseProfileStatus = "draft" | "active" | "paused" | "archived";
export type CourseVisibility = "private" | "unlisted" | "public";
export type CourseType = "regular_group" | "intensive_group" | "private_flexible";
export type StorefrontPriceMode = "monthly" | "package" | "free" | "custom_label";
export type ConsumptionOutcome = "consume" | "do_not_consume" | "reschedule";
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface IWeeklySlot {
  dayOfWeek: DayOfWeek;
  startTime: string; // HH:mm
  durationMinutes: number;
  creditsPerOccurrence: number;
  calendarId?: string;
}

export interface IRegularPolicy {
  billingModel: "monthly";
  voucherGenerationMode: "monthly_from_schedule";
  issueDayOfMonth: number;
  voucherStatusOnIssue: "pending_payment";
  timezone: string;
  weeklySlots: IWeeklySlot[];
}

export interface IPrivateFlexiblePolicy {
  billingModel: "package";
  voucherGenerationMode: "manual_pack";
  allowAdditionalStudentsLater: boolean;
  maxStudents: number;
  defaultPackCredits?: number;
}

export interface IConsumptionAction {
  outcome: ConsumptionOutcome;
  creditsToConsume: number;
}

export interface IStudentCancellationRule {
  minHoursBeforeStart?: number;
  maxHoursBeforeStart?: number;
  outcome: ConsumptionOutcome;
  creditsToConsume: number;
}

export interface IConsumptionPolicies {
  attendance: IConsumptionAction;
  noShow: IConsumptionAction;
  teacherCancellation: IConsumptionAction;
  studentCancellationRules: IStudentCancellationRule[];
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

export interface ICourseStorefront {
  isPublished: boolean;
  slug?: string;
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

export interface IPublicationMeta {
  enrollmentOpen: boolean;
  publishedAt?: Date;
  enrollmentOpensAt?: Date;
  enrollmentClosesAt?: Date;
  maxStudents?: number;
}

export interface ICourseStats {
  activeEnrollmentCount: number;
  lessonCount: number;
}

export interface ICourseProfile {
  ownerTeacherId: Types.ObjectId;

  templateId: Types.ObjectId;
  templateVersion: number;

  code: string;
  internalName: string;
  description?: string;

  status: CourseProfileStatus;
  visibility: CourseVisibility;
  courseType: CourseType;

  regularPolicy?: IRegularPolicy;
  privateFlexiblePolicy?: IPrivateFlexiblePolicy;
  consumptionPolicies: IConsumptionPolicies;

  storefront: ICourseStorefront;
  publicationMeta: IPublicationMeta;

  stats: ICourseStats;

  createdAt: Date;
  updatedAt: Date;
}

export type CourseProfileDocument = HydratedDocument<ICourseProfile>;

const WeeklySlotSchema = new Schema<IWeeklySlot>(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5, 6, 7],
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: 15,
    },
    creditsPerOccurrence: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    calendarId: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const RegularPolicySchema = new Schema<IRegularPolicy>(
  {
    billingModel: {
      type: String,
      enum: ["monthly"],
      required: true,
      default: "monthly",
    },
    voucherGenerationMode: {
      type: String,
      enum: ["monthly_from_schedule"],
      required: true,
      default: "monthly_from_schedule",
    },
    issueDayOfMonth: {
      type: Number,
      required: true,
      min: 1,
      max: 28,
      default: 1,
    },
    voucherStatusOnIssue: {
      type: String,
      enum: ["pending_payment"],
      required: true,
      default: "pending_payment",
    },
    timezone: {
      type: String,
      required: true,
      trim: true,
      default: "Europe/Madrid",
    },
    weeklySlots: {
      type: [WeeklySlotSchema],
      required: true,
      validate: {
        validator: (slots: IWeeklySlot[]) => Array.isArray(slots) && slots.length > 0,
        message: "regularPolicy.weeklySlots must contain at least one slot",
      },
    },
  },
  { _id: false }
);

const PrivateFlexiblePolicySchema = new Schema<IPrivateFlexiblePolicy>(
  {
    billingModel: {
      type: String,
      enum: ["package"],
      required: true,
      default: "package",
    },
    voucherGenerationMode: {
      type: String,
      enum: ["manual_pack"],
      required: true,
      default: "manual_pack",
    },
    allowAdditionalStudentsLater: {
      type: Boolean,
      required: true,
      default: false,
    },
    maxStudents: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    defaultPackCredits: {
      type: Number,
      min: 1,
    },
  },
  { _id: false }
);

const ConsumptionActionSchema = new Schema<IConsumptionAction>(
  {
    outcome: {
      type: String,
      enum: ["consume", "do_not_consume", "reschedule"],
      required: true,
    },
    creditsToConsume: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const StudentCancellationRuleSchema = new Schema<IStudentCancellationRule>(
  {
    minHoursBeforeStart: {
      type: Number,
      min: 0,
    },
    maxHoursBeforeStart: {
      type: Number,
      min: 0,
    },
    outcome: {
      type: String,
      enum: ["consume", "do_not_consume", "reschedule"],
      required: true,
    },
    creditsToConsume: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const ConsumptionPoliciesSchema = new Schema<IConsumptionPolicies>(
  {
    attendance: {
      type: ConsumptionActionSchema,
      required: true,
      default: () => ({
        outcome: "consume",
        creditsToConsume: 1,
      }),
    },
    noShow: {
      type: ConsumptionActionSchema,
      required: true,
      default: () => ({
        outcome: "consume",
        creditsToConsume: 1,
      }),
    },
    teacherCancellation: {
      type: ConsumptionActionSchema,
      required: true,
      default: () => ({
        outcome: "reschedule",
        creditsToConsume: 0,
      }),
    },
    studentCancellationRules: {
      type: [StudentCancellationRuleSchema],
      default: [],
    },
  },
  { _id: false }
);

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

const CourseStorefrontSchema = new Schema<ICourseStorefront>(
  {
    isPublished: {
      type: Boolean,
      required: true,
      default: false,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
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

const PublicationMetaSchema = new Schema<IPublicationMeta>(
  {
    enrollmentOpen: {
      type: Boolean,
      required: true,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    enrollmentOpensAt: {
      type: Date,
    },
    enrollmentClosesAt: {
      type: Date,
    },
    maxStudents: {
      type: Number,
      min: 1,
    },
  },
  { _id: false }
);

const CourseStatsSchema = new Schema<ICourseStats>(
  {
    activeEnrollmentCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lessonCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);



const CourseProfileSchema = new Schema<ICourseProfile>(
  {
    ownerTeacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    templateId: {
      type: Schema.Types.ObjectId,
      ref: "CourseTemplate",
      required: true,
      index: true,
    },

    templateVersion: {
      type: Number,
      required: true,
      min: 1,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 60,
    },

    internalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },

    description: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: COURSE_STATUSES,
      required: true,
      default: "draft",
      index: true,
    },

    visibility: {
      type: String,
      enum: ["private", "unlisted", "public"],
      required: true,
      default: "private",
    },

    courseType: {
      type: String,
      enum: ["regular_group", "intensive_group", "private_flexible"],
      required: true,
      index: true,
    },

    regularPolicy: {
      type: RegularPolicySchema,
    },

    privateFlexiblePolicy: {
      type: PrivateFlexiblePolicySchema,
    },

    consumptionPolicies: {
      type: ConsumptionPoliciesSchema,
      required: true,
    },

    storefront: {
      type: CourseStorefrontSchema,
      required: true,
    },

    publicationMeta: {
      type: PublicationMetaSchema,
      required: true,
      default: () => ({
        enrollmentOpen: false,
      }),
    },

    stats: {
      type: CourseStatsSchema,
      required: true,
      default: () => ({
        activeEnrollmentCount: 0,
        lessonCount: 0,
      }),
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

CourseProfileSchema.pre("validate", function () {
  const isRegular =
    this.courseType === "regular_group" || this.courseType === "intensive_group";

  if (isRegular && !this.regularPolicy) {
    throw new Error("regularPolicy is required for regular_group and intensive_group");
  }

  if (!isRegular) {
    this.regularPolicy = undefined;
  }

  if (this.courseType === "private_flexible" && !this.privateFlexiblePolicy) {
    throw new Error("privateFlexiblePolicy is required for private_flexible");
  }

  if (this.courseType !== "private_flexible") {
    this.privateFlexiblePolicy = undefined;
  }

  if (this.storefront?.isPublished && !this.storefront?.slug) {
    throw new Error("storefront.slug is required when storefront.isPublished is true");
  }

  if (this.storefront?.priceMode === "free") {
    for (const option of this.storefront.priceOptions ?? []) {
      option.amount = 0;
    }
  }

  if (
    this.publicationMeta?.enrollmentClosesAt &&
    this.publicationMeta?.enrollmentOpensAt &&
    this.publicationMeta.enrollmentClosesAt < this.publicationMeta.enrollmentOpensAt
  ) {
    throw new Error(
      "publicationMeta.enrollmentClosesAt cannot be earlier than enrollmentOpensAt"
    );
  }
});

CourseProfileSchema.index({ ownerTeacherId: 1, code: 1 }, { unique: true });

CourseProfileSchema.index(
  { "storefront.slug": 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      "storefront.slug": { $type: "string" },
    },
  }
);

CourseProfileSchema.index({ templateId: 1, templateVersion: 1 });
CourseProfileSchema.index({ courseType: 1, status: 1 });
CourseProfileSchema.index({ ownerTeacherId: 1, status: 1 });
CourseProfileSchema.index({ "publicationMeta.enrollmentOpen": 1, visibility: 1, status: 1 });

export const CourseProfile =
  models.CourseProfile ||
  model<ICourseProfile>("CourseProfile", CourseProfileSchema);