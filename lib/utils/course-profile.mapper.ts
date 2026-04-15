import type {
  CourseProfileDetailDTO,
  CourseProfileListItemDTO,
  WeeklySlotDTO,
  RegularPolicyDTO,
  PrivateFlexiblePolicyDTO,
  ConsumptionActionDTO,
  StudentCancellationRuleDTO,
  ConsumptionPoliciesDTO,
  PriceConditionDTO,
  PriceOptionDTO,
  CourseStorefrontDTO,
  PublicationMetaDTO,
  CourseStatsDTO,
} from "../dto/course-profile.dto";

import type {
  ICourseProfile,
  CourseProfileDocument,
} from "@/models/CourseProfile";

type CourseProfileSource =
  | ICourseProfile
  | CourseProfileDocument
  | (ICourseProfile & { _id: unknown });

function toIdString(value: unknown): string {
  if (!value) return "";
  return String(value);
}

function toIsoDate(value: Date | string | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toWeeklySlotDTO(slot: {
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  durationMinutes: number;
  creditsPerOccurrence: number;
  calendarId?: string;
}): WeeklySlotDTO {
  return {
    dayOfWeek: slot.dayOfWeek,
    startTime: slot.startTime,
    durationMinutes: slot.durationMinutes,
    creditsPerOccurrence: slot.creditsPerOccurrence,
    calendarId: slot.calendarId,
  };
}

function toRegularPolicyDTO(
  policy?: ICourseProfile["regularPolicy"]
): RegularPolicyDTO | undefined {
  if (!policy) return undefined;

  return {
    billingModel: policy.billingModel,
    voucherGenerationMode: policy.voucherGenerationMode,
    issueDayOfMonth: policy.issueDayOfMonth,
    voucherStatusOnIssue: policy.voucherStatusOnIssue,
    timezone: policy.timezone,
    weeklySlots: (policy.weeklySlots ?? []).map(toWeeklySlotDTO),
  };
}

function toPrivateFlexiblePolicyDTO(
  policy?: ICourseProfile["privateFlexiblePolicy"]
): PrivateFlexiblePolicyDTO | undefined {
  if (!policy) return undefined;

  return {
    billingModel: policy.billingModel,
    voucherGenerationMode: policy.voucherGenerationMode,
    allowAdditionalStudentsLater: policy.allowAdditionalStudentsLater,
    maxStudents: policy.maxStudents,
    defaultPackCredits: policy.defaultPackCredits,
  };
}

function toConsumptionActionDTO(action: {
  outcome: "consume" | "do_not_consume" | "reschedule";
  creditsToConsume: number;
}): ConsumptionActionDTO {
  return {
    outcome: action.outcome,
    creditsToConsume: action.creditsToConsume,
  };
}

function toStudentCancellationRuleDTO(rule: {
  minHoursBeforeStart?: number;
  maxHoursBeforeStart?: number;
  outcome: "consume" | "do_not_consume" | "reschedule";
  creditsToConsume: number;
}): StudentCancellationRuleDTO {
  return {
    minHoursBeforeStart: rule.minHoursBeforeStart,
    maxHoursBeforeStart: rule.maxHoursBeforeStart,
    outcome: rule.outcome,
    creditsToConsume: rule.creditsToConsume,
  };
}

function toConsumptionPoliciesDTO(
  policies: ICourseProfile["consumptionPolicies"]
): ConsumptionPoliciesDTO {
  return {
    attendance: toConsumptionActionDTO(policies.attendance),
    noShow: toConsumptionActionDTO(policies.noShow),
    teacherCancellation: toConsumptionActionDTO(policies.teacherCancellation),
    studentCancellationRules: (policies.studentCancellationRules ?? []).map(
      toStudentCancellationRuleDTO
    ),
  };
}

function toPriceConditionDTO(condition?: {
  participantMode?: "solo" | "pair" | "trio" | "group";
  participantCount?: number;
  packageClasses?: number;
  monthlyClasses?: number;
}): PriceConditionDTO | undefined {
  if (!condition) return undefined;

  return {
    participantMode: condition.participantMode,
    participantCount: condition.participantCount,
    packageClasses: condition.packageClasses,
    monthlyClasses: condition.monthlyClasses,
  };
}

function toPriceOptionDTO(option: {
  label: string;
  amount?: number;
  condition?: {
    participantMode?: "solo" | "pair" | "trio" | "group";
    participantCount?: number;
    packageClasses?: number;
    monthlyClasses?: number;
  };
  isFeatured?: boolean;
  isActive: boolean;
  sortOrder?: number;
}): PriceOptionDTO {
  return {
    label: option.label,
    amount: option.amount,
    condition: toPriceConditionDTO(option.condition),
    isFeatured: option.isFeatured,
    isActive: option.isActive,
    sortOrder: option.sortOrder,
  };
}

function toCourseStorefrontDTO(
  storefront: ICourseProfile["storefront"]
): CourseStorefrontDTO {
  return {
    isPublished: storefront.isPublished,
    slug: storefront.slug,
    publicTitle: storefront.publicTitle,
    shortDescription: storefront.shortDescription,
    longDescription: storefront.longDescription,
    seoTitle: storefront.seoTitle,
    seoDescription: storefront.seoDescription,
    promoVideoUrl: storefront.promoVideoUrl,
    benefits: storefront.benefits ?? [],
    priceMode: storefront.priceMode,
    priceOptions: (storefront.priceOptions ?? []).map(toPriceOptionDTO),
    currency: storefront.currency,
    heroImageUrl: storefront.heroImageUrl,
    thumbnailUrl: storefront.thumbnailUrl,
    ctaText: storefront.ctaText,
  };
}

function toPublicationMetaDTO(
  publicationMeta: ICourseProfile["publicationMeta"]
): PublicationMetaDTO {
  return {
    enrollmentOpen: publicationMeta.enrollmentOpen,
    publishedAt: publicationMeta.publishedAt,
    enrollmentOpensAt: publicationMeta.enrollmentOpensAt,
    enrollmentClosesAt: publicationMeta.enrollmentClosesAt,
    maxStudents: publicationMeta.maxStudents,
  };
}

function toCourseStatsDTO(stats: ICourseProfile["stats"]): CourseStatsDTO {
  return {
    activeEnrollmentCount: stats.activeEnrollmentCount,
    lessonCount: stats.lessonCount,
  };
}

export function toCourseProfileListItemDTO(
  source: CourseProfileSource
): CourseProfileListItemDTO {
  return {
    id: toIdString((source as { _id?: unknown })._id),
    ownerTeacherId: toIdString(source.ownerTeacherId),
    templateId: toIdString(source.templateId),
    templateVersion: source.templateVersion,

    code: source.code,
    internalName: source.internalName,
    status: source.status,
    visibility: source.visibility,
    courseType: source.courseType,

    isPublished: source.storefront.isPublished,
    publicTitle: source.storefront.publicTitle,
    slug: source.storefront.slug,
    enrollmentOpen: source.publicationMeta.enrollmentOpen,

    activeEnrollmentCount: source.stats.activeEnrollmentCount,
    lessonCount: source.stats.lessonCount,

    createdAt: toIsoDate(source.createdAt),
    updatedAt: toIsoDate(source.updatedAt),
  };
}

export function toCourseProfileDetailDTO(
  source: CourseProfileSource
): CourseProfileDetailDTO {
  return {
    id: toIdString((source as { _id?: unknown })._id),
    ownerTeacherId: toIdString(source.ownerTeacherId),
    templateId: toIdString(source.templateId),
    templateVersion: source.templateVersion,

    code: source.code,
    internalName: source.internalName,
    description: source.description,

    status: source.status,
    visibility: source.visibility,
    courseType: source.courseType,

    regularPolicy: toRegularPolicyDTO(source.regularPolicy),
    privateFlexiblePolicy: toPrivateFlexiblePolicyDTO(source.privateFlexiblePolicy),
    consumptionPolicies: toConsumptionPoliciesDTO(source.consumptionPolicies),

    storefront: toCourseStorefrontDTO(source.storefront),
    publicationMeta: toPublicationMetaDTO(source.publicationMeta),
    stats: toCourseStatsDTO(source.stats),

    createdAt: toIsoDate(source.createdAt),
    updatedAt: toIsoDate(source.updatedAt),
  };
}

export function toCourseProfileListDTO(
  sources: CourseProfileSource[]
): CourseProfileListItemDTO[] {
  return sources.map(toCourseProfileListItemDTO);
}