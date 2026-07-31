import { Schema, model, models } from "mongoose";
import { Types, HydratedDocument } from "mongoose";
import type { CurrencyCode } from "./CourseTemplate";
import { COURSE_STATUSES } from "@/lib/constants/course.constants";
import type { ClassType } from "./StudentProfile";
import {
  COURSE_TEMPLATE_FREQUENCIES,
  CREDIT_CONSUME_ON_VALUES,
  PARTICIPANT_MODES,
} from "@/lib/constants/courseTemplate.constants";
import { LESSON_CLASS_TYPES } from "@/lib/constants/lesson.constants";
import type {
  CourseCreditPolicy,
  CourseLessonDefaults,
  CourseOperationalPolicies,
  CourseParticipantPolicy,
  CoursePreparationPolicy,
  CourseSchedulingDefaults,
  ParticipantMode,
} from "@/lib/types/course-policies";

export type CourseProfileStatus =
  | "draft"
  | "active"
  | "paused"
  | "completed"
  | "archived";
export type CourseVisibility = "private" | "unlisted" | "public";
export type CourseType = "regular_group" | "intensive_group" | "private_flexible" | "semi-intensive_group";
export type StorefrontPriceMode = "monthly" | "package" | "free" | "custom_label";
export type ConsumptionOutcome = "consume" | "do_not_consume" | "reschedule";
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type CourseProfilePolicies = CourseOperationalPolicies;
export type CourseMemberStatus = "active" | "paused" | "left";
export type CourseMemberBillingMode = "individual_cycle";

export interface ICourseMemberBilling {
  mode: CourseMemberBillingMode;
  billingAnchorDay?: number;
  billingStartedAt?: Date | null;
  nextBillingDate?: Date | null;
  firstVoucherId?: Types.ObjectId | null;
  lastVoucherId?: Types.ObjectId | null;
  notes?: string;
}

export interface ICourseMember {
  studentId: Types.ObjectId;
  status: CourseMemberStatus;
  joinedAt: Date;
  leftAt?: Date | null;
  billing: ICourseMemberBilling;
}

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

export interface ICourseProgress {
  currentModuleOrder: number;
  currentLessonOrder: number;
  completedLessonsCount: number;
}

export interface ICourseTemplateSnapshot {
  templateId: string;
  code: string;
  internalName: string;
  version: number;
  level: string;
  category: string;
  curriculumStats: {
    modulesCount: number;
    lessonsCount: number;
    blocksCount: number;
    resourcesCount: number;
  };
}

export interface ICourseProfile {
  ownerTeacherId: Types.ObjectId;
  teacherId?: Types.ObjectId;

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

  name?: string;
  classType?: ClassType;
  studentIds?: Types.ObjectId[];
  members: ICourseMember[];
  startDate?: Date;
  targetEndDate?: Date;
  scheduleNotes?: string;
  internalNotes?: string;
  progress?: ICourseProgress;
  templateSnapshot?: ICourseTemplateSnapshot;
  // TODO: Allow editing course policies without modifying the template.
  // TODO: Create Lesson from CourseProfile using policies.
  // TODO: Store policySnapshot on Lesson.
  // TODO: Consume credits according to policySnapshot on completion.
  policies?: CourseProfilePolicies;
  // TODO: Generate the first voucher for a course member and fill billing dates/ids.
  // TODO: Store a policy snapshot on each Lesson and consume credits from it.

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

const CourseProgressSchema = new Schema<ICourseProgress>(
  {
    currentModuleOrder: {
      type: Number,
      min: 0,
      default: 0,
    },
    currentLessonOrder: {
      type: Number,
      min: 0,
      default: 0,
    },
    completedLessonsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { _id: false },
);

const CourseTemplateSnapshotSchema = new Schema<ICourseTemplateSnapshot>(
  {
    templateId: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    internalName: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      required: true,
      min: 1,
    },
    level: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    curriculumStats: {
      modulesCount: { type: Number, min: 0, default: 0 },
      lessonsCount: { type: Number, min: 0, default: 0 },
      blocksCount: { type: Number, min: 0, default: 0 },
      resourcesCount: { type: Number, min: 0, default: 0 },
    },
  },
  { _id: false },
);

const CoursePolicyLessonDefaultsSchema = new Schema<CourseLessonDefaults>(
  {
    durationMinutes: { type: Number, required: true, min: 1 },
    timezone: { type: String, required: true, trim: true },
    defaultClassType: {
      type: String,
      enum: LESSON_CLASS_TYPES,
      required: true,
    },
  },
  { _id: false },
);

const CoursePolicySchedulingDefaultsSchema =
  new Schema<CourseSchedulingDefaults>(
    {
      frequency: {
        type: String,
        enum: COURSE_TEMPLATE_FREQUENCIES,
        required: true,
      },
      sessionsPerWeek: { type: Number, required: true, min: 1 },
      preferredWeekdays: {
        type: [{ type: Number, min: 0, max: 6 }],
        default: [],
      },
      allowRecurringLessons: { type: Boolean, required: true },
    },
    { _id: false },
  );

const CoursePolicyCreditSchema = new Schema<CourseCreditPolicy>(
  {
    creditsPerLesson: { type: Number, required: true, min: 0 },
    consumeOn: {
      type: String,
      enum: CREDIT_CONSUME_ON_VALUES,
      required: true,
    },
    trialConsumesCredit: { type: Boolean, required: true },
    cancellationConsumesCredit: { type: Boolean, required: true },
    noShowConsumesCredit: { type: Boolean, required: true },
  },
  { _id: false },
);

const CoursePolicyParticipantSchema =
  new Schema<CourseParticipantPolicy>(
    {
      participantMode: {
        type: String,
        enum: PARTICIPANT_MODES,
        required: true,
      },
      minStudents: { type: Number, required: true, min: 1 },
      maxStudents: { type: Number, required: true, min: 1 },
    },
    { _id: false },
  );

const CoursePolicyPreparationSchema =
  new Schema<CoursePreparationPolicy>(
    {
      copyTemplateBlocksToLesson: { type: Boolean, required: true },
      copyTemplateResourcesToLesson: { type: Boolean, required: true },
      defaultPreparationStatus: {
        type: String,
        enum: ["needs_preparation", "prepared"],
        required: true,
      },
    },
    { _id: false },
  );

const CourseProfilePoliciesSchema = new Schema<CourseProfilePolicies>(
  {
    lessonDefaults: {
      type: CoursePolicyLessonDefaultsSchema,
      required: true,
    },
    schedulingDefaults: {
      type: CoursePolicySchedulingDefaultsSchema,
      required: true,
    },
    creditPolicy: {
      type: CoursePolicyCreditSchema,
      required: true,
    },
    participantPolicy: {
      type: CoursePolicyParticipantSchema,
      required: true,
    },
    preparationPolicy: {
      type: CoursePolicyPreparationSchema,
      required: true,
    },
  },
  { _id: false },
);

const CourseMemberBillingSchema = new Schema<ICourseMemberBilling>(
  {
    mode: {
      type: String,
      enum: ["individual_cycle"],
      required: true,
      default: "individual_cycle",
    },
    billingAnchorDay: {
      type: Number,
      min: 1,
      max: 31,
    },
    billingStartedAt: {
      type: Date,
      default: null,
    },
    nextBillingDate: {
      type: Date,
      default: null,
    },
    firstVoucherId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    lastVoucherId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  { _id: false },
);

const CourseMemberSchema = new Schema<ICourseMember>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "StudentProfile",
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "paused", "left"],
      required: true,
      default: "active",
    },
    joinedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    leftAt: {
      type: Date,
      default: null,
    },
    billing: {
      type: CourseMemberBillingSchema,
      required: true,
      default: () => ({
        mode: "individual_cycle",
        billingStartedAt: null,
        nextBillingDate: null,
        firstVoucherId: null,
        lastVoucherId: null,
        notes: "",
      }),
    },
  },
  { _id: false },
);



const CourseProfileSchema = new Schema<ICourseProfile>(
  {
    ownerTeacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: function (this: ICourseProfile) {
        return Boolean(this.templateSnapshot);
      },
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
      enum: [
        "regular_group",
        "intensive_group",
        "private_flexible",
        "semi-intensive_group",
      ],
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

    name: {
      type: String,
      trim: true,
      maxlength: 140,
      required: function (this: ICourseProfile) {
        return Boolean(this.templateSnapshot);
      },
    },

    classType: {
      type: String,
      enum: [
        "private",
        "pair",
        "group_regular",
        "semi_intensive",
        "intensive",
      ],
      index: true,
      required: function (this: ICourseProfile) {
        return Boolean(this.templateSnapshot);
      },
    },

    studentIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "StudentProfile",
        },
      ],
      default: [],
    },

    members: {
      type: [CourseMemberSchema],
      default: [],
    },

    startDate: {
      type: Date,
    },

    targetEndDate: {
      type: Date,
    },

    scheduleNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    progress: {
      type: CourseProgressSchema,
      default: () => ({
        currentModuleOrder: 0,
        currentLessonOrder: 0,
        completedLessonsCount: 0,
      }),
    },

    templateSnapshot: {
      type: CourseTemplateSnapshotSchema,
    },

    policies: {
      type: CourseProfilePoliciesSchema,
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
  const isActiveCourseInstance = Boolean(this.classType);

  if (!isActiveCourseInstance && isRegular && !this.regularPolicy) {
    throw new Error("regularPolicy is required for regular_group and intensive_group");
  }

  if (!isRegular) {
    this.regularPolicy = undefined;
  }

  if (
    !isActiveCourseInstance &&
    this.courseType === "private_flexible" &&
    !this.privateFlexiblePolicy
  ) {
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
CourseProfileSchema.index({ ownerTeacherId: 1, status: 1, createdAt: -1 });
CourseProfileSchema.index({ ownerTeacherId: 1, templateId: 1 });
CourseProfileSchema.index({ ownerTeacherId: 1, studentIds: 1 });
CourseProfileSchema.index({ ownerTeacherId: 1, "members.studentId": 1 });
CourseProfileSchema.index({ teacherId: 1, status: 1, createdAt: -1 });
CourseProfileSchema.index({ teacherId: 1, templateId: 1 });
CourseProfileSchema.index({ teacherId: 1, studentIds: 1 });
CourseProfileSchema.index({ teacherId: 1, "members.studentId": 1 });
CourseProfileSchema.index({ "publicationMeta.enrollmentOpen": 1, visibility: 1, status: 1 });

export const CourseProfile =
  models.CourseProfile ||
  model<ICourseProfile>("CourseProfile", CourseProfileSchema);
