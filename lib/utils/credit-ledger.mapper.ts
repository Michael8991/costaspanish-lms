import type { CreditLedgerEntryDTO } from "@/lib/dto/credit-ledger.dto";
import type {
  CreditLedgerSource,
  CreditLedgerStatus,
} from "@/models/CreditLedgerEntry";

type CreditLedgerMapperSource = {
  _id?: unknown;
  id?: unknown;
  teacherId?: unknown;
  lessonId?: unknown;
  lessonTitleSnapshot?: unknown;
  lessonDate?: unknown;
  courseId?: unknown;
  courseNameSnapshot?: unknown;
  studentId?: unknown;
  studentNameSnapshot?: unknown;
  voucherId?: unknown;
  voucherNameSnapshot?: unknown;
  billingPeriodStart?: unknown;
  billingPeriodEnd?: unknown;
  creditsConsumed?: unknown;
  voucherTotalCreditsSnapshot?: unknown;
  voucherPriceSnapshot?: unknown;
  unitCreditPriceSnapshot?: unknown;
  estimatedRevenue?: unknown;
  consumedAt?: unknown;
  source?: unknown;
  status?: unknown;
  settlementReason?: unknown;
  notes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function toId(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) {
    return String(value);
  }
  return "";
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toSource(value: unknown): CreditLedgerSource {
  return value === "manual_adjustment"
    ? "manual_adjustment"
    : "lesson_completion";
}

function toStatus(value: unknown): CreditLedgerStatus {
  return value === "reversed" ? "reversed" : "active";
}

export function toCreditLedgerEntryDTO(
  source: CreditLedgerMapperSource,
): CreditLedgerEntryDTO {
  const courseId = toId(source.courseId);
  const voucherId = toId(source.voucherId);

  return {
    id: toId(source._id ?? source.id),
    teacherId: toId(source.teacherId),
    lessonId: toId(source.lessonId),
    lessonTitleSnapshot: toString(source.lessonTitleSnapshot),
    lessonDate: toIso(source.lessonDate),
    courseId: courseId || null,
    courseNameSnapshot: toString(source.courseNameSnapshot),
    studentId: toId(source.studentId),
    studentNameSnapshot: toString(source.studentNameSnapshot),
    voucherId: voucherId || null,
    voucherNameSnapshot: toString(source.voucherNameSnapshot),
    billingPeriodStart: toIso(source.billingPeriodStart),
    billingPeriodEnd: toIso(source.billingPeriodEnd),
    creditsConsumed: toNumber(source.creditsConsumed),
    voucherTotalCreditsSnapshot: toNullableNumber(
      source.voucherTotalCreditsSnapshot,
    ),
    voucherPriceSnapshot: toNullableNumber(source.voucherPriceSnapshot),
    unitCreditPriceSnapshot: toNumber(source.unitCreditPriceSnapshot),
    estimatedRevenue: toNumber(source.estimatedRevenue),
    consumedAt: toIso(source.consumedAt),
    source: toSource(source.source),
    status: toStatus(source.status),
    settlementReason: toString(source.settlementReason),
    notes: toString(source.notes),
    createdAt: toIso(source.createdAt),
    updatedAt: toIso(source.updatedAt),
  };
}
