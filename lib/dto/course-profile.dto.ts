import type {
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


export interface CourseProfileListItemDTO {
  id: string;
  ownerTeacherId: string;
  templateId: string;
  templateVersion: number;

  code: string;
  internalName: string;
  status: ICourseProfile["status"];
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

export interface CourseProfileDetailDTO {
  id: string;
  ownerTeacherId: string;
  templateId: string;
  templateVersion: number;

  code: string;
  internalName: string;
  description?: string;

  status: ICourseProfile["status"];
  visibility: ICourseProfile["visibility"];
  courseType: ICourseProfile["courseType"];

  regularPolicy?: RegularPolicyDTO;
  privateFlexiblePolicy?: PrivateFlexiblePolicyDTO;
  consumptionPolicies: ConsumptionPoliciesDTO;

  storefront: CourseStorefrontDTO;
  publicationMeta: PublicationMetaDTO;
  stats: CourseStatsDTO;

  createdAt: string;
  updatedAt: string;
}