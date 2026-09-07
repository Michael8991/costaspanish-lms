import type { Types } from "mongoose";

import type {
  AcademicLevel,
  ClassType,
  PlanBillingType,
  PlanDoc,
  PlanStatus,
  StudentProfileDoc,
  VoucherCreatedFrom,
  VoucherPaymentMethod,
  VoucherPaymentStatus,
} from "@/models/StudentProfile";

type StudentPlanListSource = Partial<PlanDoc> & {
  _id?: Types.ObjectId;
};

export type StudentListSource = Partial<
  Pick<
  StudentProfileDoc,
  | "teacherId"
  | "userId"
  | "contactEmail"
  | "fullName"
  | "phone"
  | "level"
  | "isActive"
  | "createdAt"
  | "updatedAt"
  >
> & {
  _id: Types.ObjectId;
  activePlans?: StudentPlanListSource[] | null;
};

export interface StudentPlanListDTO {
  id: string;
  _id: string;
  name: string;
  title: string;
  billingType: PlanBillingType;
  type: PlanBillingType;
  planType: PlanBillingType;
  classType: ClassType;
  status: PlanStatus;
  creditsRemaining: number;
  creditsTotal: number;
  validFrom: string | null;
  validUntil: string | null;
  enrollmentId: string | null;
  courseId: string | null;
  courseNameSnapshot: string | null;
  generatedFromCourse: boolean;
  generatedFromCourseMember: boolean;
  billingMode: "individual_cycle" | null;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  billingAnchorDay: number | null;
  paymentStatus: VoucherPaymentStatus;
  amountPaid: number;
  paidAt: string | null;
  paymentMethod: VoucherPaymentMethod;
  paymentNotes: string;
  internalNotes: string;
  priceTotal: number | null;
  currency: "EUR";
  unitCreditPriceSnapshot: number | null;
  createdFrom: VoucherCreatedFrom;
  temporalStatus: "upcoming" | "active" | "expired" | "exhausted" | "canceled";
  consumedCredits: number | null;
  remainingValue: number | null;
  consumedValue: number | null;
}

export interface StudentListDTO {
  id: string;
  _id: string;
  teacherId: string | null;
  userId?: string;
  fullName: string;
  contactEmail: string;
  phone?: string;
  level: AcademicLevel;
  status: "active" | "inactive";
  isActive: boolean;
  activePlans: StudentPlanListDTO[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface StudentListPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface StudentListSummary {
  activeStudents: number;
  expiringPlansSoon: number;
  pendingLevel: number;
  studentsWithoutActivePlan: number;
}

export interface StudentListResponse {
  items: StudentListDTO[];
  pagination: StudentListPagination;
  summary: StudentListSummary;
  page: number;
  limit: number;
  total: number;
}

function toISOStringOrNull(value: Date | string | null | undefined) {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toFiniteNumberOrZero(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function toStudentPlanListDTO(
  plan: StudentPlanListSource,
): StudentPlanListDTO {
  const id = plan._id ? String(plan._id) : "";
  const name = plan.name?.trim() || "Plan sin nombre";
  const billingType = plan.billingType ?? "single";
  const creditsTotal =
    typeof plan.creditsTotal === "number" && Number.isFinite(plan.creditsTotal)
      ? plan.creditsTotal
      : null;
  const creditsRemaining =
    typeof plan.creditsRemaining === "number" &&
    Number.isFinite(plan.creditsRemaining)
      ? plan.creditsRemaining
      : null;
  const priceTotal =
    typeof plan.priceTotal === "number" && Number.isFinite(plan.priceTotal)
      ? plan.priceTotal
      : typeof plan.price === "number" && Number.isFinite(plan.price)
        ? plan.price
        : null;
  const unitCreditPriceSnapshot =
    typeof plan.unitCreditPriceSnapshot === "number" &&
    Number.isFinite(plan.unitCreditPriceSnapshot)
      ? plan.unitCreditPriceSnapshot
      : priceTotal !== null && creditsTotal !== null && creditsTotal > 0
        ? priceTotal / creditsTotal
        : null;
  const consumedCredits =
    creditsTotal !== null && creditsRemaining !== null
      ? Math.max(0, creditsTotal - creditsRemaining)
      : null;
  const validUntil = toISOStringOrNull(plan.validUntil);
  const fallbackStatus: PlanStatus =
    creditsRemaining !== null && creditsRemaining <= 0
      ? "exhausted"
      : validUntil && new Date(validUntil) < new Date()
        ? "expired"
        : "active";
  const now = Date.now();
  const validFrom = toISOStringOrNull(plan.validFrom);
  const temporalStatus =
    (plan.status ?? fallbackStatus) === "canceled"
      ? "canceled" as const
      : creditsRemaining !== null && creditsRemaining <= 0
        ? "exhausted" as const
        : validFrom && new Date(validFrom).getTime() > now
          ? "upcoming" as const
          : validUntil && new Date(validUntil).getTime() < now
            ? "expired" as const
            : "active" as const;

  return {
    id,
    _id: id,
    name,
    title: name,
    billingType,
    type: billingType,
    planType: billingType,
    classType: plan.classType ?? "private",
    status: plan.status ?? fallbackStatus,
    creditsRemaining: creditsRemaining ?? 0,
    creditsTotal: creditsTotal ?? 0,
    validFrom,
    validUntil,
    enrollmentId: plan.enrollmentId ? String(plan.enrollmentId) : null,
    courseId: plan.courseId ? String(plan.courseId) : null,
    courseNameSnapshot: plan.courseNameSnapshot?.trim() || null,
    generatedFromCourse: plan.generatedFromCourse ?? false,
    generatedFromCourseMember: plan.generatedFromCourseMember ?? false,
    billingMode: plan.billingMode ?? null,
    billingPeriodStart: toISOStringOrNull(plan.billingPeriodStart),
    billingPeriodEnd: toISOStringOrNull(plan.billingPeriodEnd),
    billingAnchorDay: plan.billingAnchorDay ?? null,
    paymentStatus: plan.paymentStatus ?? "pending",
    amountPaid: toFiniteNumberOrZero(plan.amountPaid),
    paidAt: toISOStringOrNull(plan.paidAt),
    paymentMethod: plan.paymentMethod ?? "",
    paymentNotes: plan.paymentNotes ?? "",
    internalNotes: plan.internalNotes ?? plan.notes ?? "",
    priceTotal,
    currency: plan.currency ?? "EUR",
    unitCreditPriceSnapshot,
    createdFrom: plan.createdFrom ?? "legacy",
    temporalStatus,
    consumedCredits,
    remainingValue:
      creditsRemaining !== null && unitCreditPriceSnapshot !== null
        ? creditsRemaining * unitCreditPriceSnapshot
        : null,
    consumedValue:
      consumedCredits !== null && unitCreditPriceSnapshot !== null
        ? consumedCredits * unitCreditPriceSnapshot
        : null,
  };
}

export interface StudentDetailDTO extends StudentListDTO {
  contactEmailLower: string;
  country: string | null;
  nativeLanguage: string | null;
  timezone: string;
  goals: string[];
  internalNotes: string;
}

export function toStudentListDTO(
  student: StudentListSource,
): StudentListDTO {
  const id = String(student._id);
  const isActive = student.isActive !== false;
  const activePlans = Array.isArray(student.activePlans)
    ? student.activePlans
    : [];

  return {
    id,
    _id: id,
    teacherId: student.teacherId ? String(student.teacherId) : null,
    userId: student.userId ? String(student.userId) : undefined,
    fullName: student.fullName?.trim() || "Estudiante sin nombre",
    contactEmail: student.contactEmail?.trim() || "",
    phone: student.phone,
    level: student.level ?? "Evaluando",
    status: isActive ? "active" : "inactive",
    isActive,
    activePlans: activePlans.map(toStudentPlanListDTO),
    createdAt: toISOStringOrNull(student.createdAt),
    updatedAt: toISOStringOrNull(student.updatedAt),
  };
}


export function toStudentDetailDTO(
  student: StudentProfileDoc,
): StudentDetailDTO {
  return {
    ...toStudentListDTO(student),
    contactEmailLower: student.contactEmailLower?.trim() || "",
    country: student.country?.trim() || null,
    nativeLanguage: student.nativeLanguage?.trim() || null,
    timezone: student.timezone?.trim() || "Europe/Madrid",
    goals: Array.isArray(student.goals) ? [...student.goals] : [],
    internalNotes: student.internalNotes ?? "",
  };
}
