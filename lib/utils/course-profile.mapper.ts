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
} from "@/models/CourseProfile";
import type { ClassType } from "@/models/StudentProfile";

type CourseProfileSource = Omit<ICourseProfile, "studentIds"> & {
  _id?: unknown;
  studentIds?: unknown[];
};

function toIdString(value: unknown): string {
  if (!value) return "";
  return String(value);
}

function toIsoDate(value: Date | string | undefined): string {
  if (!value) return "";
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoDateOrNull(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function getFallbackClassType(
  courseType: ICourseProfile["courseType"],
): ClassType {
  if (courseType === "regular_group") return "group_regular";
  if (courseType === "intensive_group") return "intensive";
  if (courseType === "semi-intensive_group") return "semi_intensive";
  return "private";
}

function getStudentNames(studentIds: unknown[] | undefined): string[] {
  return (studentIds ?? []).flatMap((student) => {
    if (
      typeof student === "object" &&
      student !== null &&
      "fullName" in student &&
      typeof student.fullName === "string"
    ) {
      const name = student.fullName.trim();
      return name ? [name] : [];
    }

    return [];
  });
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
  const snapshot = source.templateSnapshot;
  const studentNames = getStudentNames(source.studentIds);
  const studentsCount =
    source.studentIds?.length ?? source.stats.activeEnrollmentCount;

  return {
    id: toIdString(source._id),
    teacherId: toIdString(source.teacherId ?? source.ownerTeacherId),
    ownerTeacherId: toIdString(source.ownerTeacherId),
    templateId: toIdString(source.templateId),
    templateVersion: source.templateVersion,

    name: source.name?.trim() || source.internalName,
    classType: source.classType ?? getFallbackClassType(source.courseType),
    studentsCount,
    studentNames,
    templateName: snapshot?.internalName ?? "",
    level: snapshot?.level ?? "",
    category: snapshot?.category ?? "",
    modulesCount: snapshot?.curriculumStats.modulesCount ?? 0,
    lessonsCount: snapshot?.curriculumStats.lessonsCount ?? 0,
    blocksCount: snapshot?.curriculumStats.blocksCount ?? 0,
    resourcesCount: snapshot?.curriculumStats.resourcesCount ?? 0,
    startDate: toIsoDateOrNull(source.startDate),
    targetEndDate: toIsoDateOrNull(source.targetEndDate),

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
    ...toCourseProfileListItemDTO(source),
    description: source.description,
    scheduleNotes: source.scheduleNotes ?? "",
    internalNotes: source.internalNotes ?? "",
    progress: {
      currentModuleOrder: source.progress?.currentModuleOrder ?? 0,
      currentLessonOrder: source.progress?.currentLessonOrder ?? 0,
      completedLessonsCount: source.progress?.completedLessonsCount ?? 0,
    },
    templateSnapshot: source.templateSnapshot
      ? {
          templateId: source.templateSnapshot.templateId,
          code: source.templateSnapshot.code,
          internalName: source.templateSnapshot.internalName,
          version: source.templateSnapshot.version,
          level: source.templateSnapshot.level,
          category: source.templateSnapshot.category,
          curriculumStats: {
            modulesCount:
              source.templateSnapshot.curriculumStats.modulesCount ?? 0,
            lessonsCount:
              source.templateSnapshot.curriculumStats.lessonsCount ?? 0,
            blocksCount:
              source.templateSnapshot.curriculumStats.blocksCount ?? 0,
            resourcesCount:
              source.templateSnapshot.curriculumStats.resourcesCount ?? 0,
          },
        }
      : null,

    regularPolicy: toRegularPolicyDTO(source.regularPolicy),
    privateFlexiblePolicy: toPrivateFlexiblePolicyDTO(source.privateFlexiblePolicy),
    consumptionPolicies: toConsumptionPoliciesDTO(source.consumptionPolicies),

    storefront: toCourseStorefrontDTO(source.storefront),
    publicationMeta: toPublicationMetaDTO(source.publicationMeta),
    stats: toCourseStatsDTO(source.stats),
  };
}

export function toCourseProfileListDTO(
  sources: CourseProfileSource[]
): CourseProfileListItemDTO[] {
  return sources.map(toCourseProfileListItemDTO);
}
