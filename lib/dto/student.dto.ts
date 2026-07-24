import type { Types } from "mongoose";

import type {
  AcademicLevel,
  ClassType,
  PlanBillingType,
  PlanDoc,
  PlanStatus,
  StudentProfileDoc,
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
}

export interface StudentListDTO {
  id: string;
  _id: string;
  teacherId?: string;
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

function toStudentPlanListDTO(
  plan: StudentPlanListSource,
): StudentPlanListDTO {
  const id = plan._id ? String(plan._id) : "";
  const name = plan.name?.trim() || "Plan sin nombre";
  const billingType = plan.billingType ?? "single";

  return {
    id,
    _id: id,
    name,
    title: name,
    billingType,
    type: billingType,
    planType: billingType,
    classType: plan.classType ?? "private",
    status: plan.status ?? "active",
    creditsRemaining: toFiniteNumberOrZero(plan.creditsRemaining),
    creditsTotal: toFiniteNumberOrZero(plan.creditsTotal),
    validFrom: toISOStringOrNull(plan.validFrom),
    validUntil: toISOStringOrNull(plan.validUntil),
  };
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
    teacherId: student.teacherId ? String(student.teacherId) : undefined,
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
