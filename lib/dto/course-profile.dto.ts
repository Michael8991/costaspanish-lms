import type {
  CourseProfileStatus,
  ICourseProgress,
  ICourseTemplateSnapshot,
  ICourseProfile,
  IWeeklySlot,
  IRegularPolicy,
  IPrivateFlexiblePolicy,
  IConsumptionAction,
  IStudentCancellationRule,
  IConsumptionPolicies,
  IPriceCondition,
  IPriceOption,
  ICourseStorefront,
  IPublicationMeta,
  ICourseStats,
} from "@/models/CourseProfile";
import type { ClassType } from "@/models/StudentProfile";
import type { CourseOperationalPolicies } from "@/lib/types/course-policies";
import type { StudentPlanListDTO } from "@/lib/dto/student.dto";

export type CourseOperationalPoliciesDTO = CourseOperationalPolicies;
export type CoursePoliciesSource =
  | "course"
  | "template_fallback"
  | "default_fallback";

export type WeeklySlotDTO = IWeeklySlot;

export interface RegularPolicyDTO extends Omit<IRegularPolicy, "weeklySlots"> {
  weeklySlots: WeeklySlotDTO[];
}

export type PrivateFlexiblePolicyDTO = IPrivateFlexiblePolicy;

export type ConsumptionActionDTO = IConsumptionAction;

export type StudentCancellationRuleDTO = IStudentCancellationRule;

export interface ConsumptionPoliciesDTO
  extends Omit<IConsumptionPolicies, "attendance" | "noShow" | "teacherCancellation" | "studentCancellationRules"> {
  attendance: ConsumptionActionDTO;
  noShow: ConsumptionActionDTO;
  teacherCancellation: ConsumptionActionDTO;
  studentCancellationRules: StudentCancellationRuleDTO[];
}

export type PriceConditionDTO = IPriceCondition;

export interface PriceOptionDTO extends Omit<IPriceOption, "condition"> {
  condition?: PriceConditionDTO;
}

export interface CourseStorefrontDTO
  extends Omit<ICourseStorefront, "priceOptions"> {
  priceOptions: PriceOptionDTO[];
}

// export interface PublicationMetaDTO extends IPublicationMeta { }


// export interface CourseStatsDTO extends ICourseStats {}
export type PublicationMetaDTO = IPublicationMeta; 
export type CourseStatsDTO = ICourseStats;
export type CourseProfileProgressDTO = ICourseProgress;
export type CourseTemplateSnapshotDTO = ICourseTemplateSnapshot;

export interface CourseMemberBillingDTO {
  mode: "individual_cycle";
  billingAnchorDay: number | null;
  billingStartedAt: string | null;
  nextBillingDate: string | null;
  firstVoucherId: string | null;
  lastVoucherId: string | null;
  notes: string;
}

export interface CourseMemberDTO {
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  status: "active" | "paused" | "left";
  joinedAt: string;
  leftAt: string | null;
  billing: CourseMemberBillingDTO;
  lastVoucher: StudentPlanListDTO | null;
}

export interface CourseProfilePolicySummaryDTO {
  durationMinutes: number;
  timezone: string;
  defaultClassType: CourseOperationalPolicies["lessonDefaults"]["defaultClassType"];
  frequency: CourseOperationalPolicies["schedulingDefaults"]["frequency"];
  creditsPerLesson: number;
  consumeOn: CourseOperationalPolicies["creditPolicy"]["consumeOn"];
}

export interface CourseProfileListItemDTO {
  id: string;
  teacherId: string;
  ownerTeacherId: string;
  templateId: string;
  templateVersion: number;

  name: string;
  classType: ClassType;
  studentsCount: number;
  membersCount: number;
  activeMembersCount: number;
  activeMemberIds: string[];
  studentNames: string[];
  policySummary: CourseProfilePolicySummaryDTO;
  templateName: string;
  level: string;
  category: string;
  modulesCount: number;
  lessonsCount: number;
  blocksCount: number;
  resourcesCount: number;
  startDate: string | null;
  targetEndDate: string | null;

  code: string;
  internalName: string;
  status: CourseProfileStatus;
  visibility: ICourseProfile["visibility"];
  courseType: ICourseProfile["courseType"];

  isPublished: boolean;
  publicTitle: string;
  slug?: string;
  enrollmentOpen: boolean;

  activeEnrollmentCount: number;
  lessonCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface CourseProfileDetailDTO extends CourseProfileListItemDTO {
  description?: string;
  scheduleNotes: string;
  internalNotes: string;
  progress: CourseProfileProgressDTO;
  templateSnapshot: CourseTemplateSnapshotDTO | null;

  regularPolicy?: RegularPolicyDTO;
  privateFlexiblePolicy?: PrivateFlexiblePolicyDTO;
  consumptionPolicies: ConsumptionPoliciesDTO;

  storefront: CourseStorefrontDTO;
  publicationMeta: PublicationMetaDTO;
  stats: CourseStatsDTO;
  policies: CourseOperationalPoliciesDTO;
  policiesSource: CoursePoliciesSource;
  members: CourseMemberDTO[];
  legacyStudentIds?: string[];
}
