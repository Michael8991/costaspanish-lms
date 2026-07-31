import type { PaymentLedgerEntryDTO } from "@/lib/dto/payment-ledger.dto";
import type {
  PaymentLedgerPaymentMethod,
  PaymentLedgerPaymentStatus,
  PaymentLedgerSource,
  PaymentLedgerStatus,
} from "@/models/PaymentLedgerEntry";

type PaymentLedgerMapperSource = {
  _id?: unknown;
  id?: unknown;
  teacherId?: unknown;
  studentId?: unknown;
  studentNameSnapshot?: unknown;
  courseId?: unknown;
  courseNameSnapshot?: unknown;
  voucherId?: unknown;
  voucherNameSnapshot?: unknown;
  billingPeriodStart?: unknown;
  billingPeriodEnd?: unknown;
  amount?: unknown;
  currency?: unknown;
  paymentStatusSnapshot?: unknown;
  paymentMethod?: unknown;
  paidAt?: unknown;
  source?: unknown;
  status?: unknown;
  notes?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const paymentStatuses: PaymentLedgerPaymentStatus[] = ["paid", "partial"];
const paymentMethods: PaymentLedgerPaymentMethod[] = [
  "cash",
  "bank_transfer",
  "bizum",
  "card",
  "other",
  "",
];
const sources: PaymentLedgerSource[] = [
  "voucher_created_paid",
  "voucher_marked_paid",
  "voucher_payment_updated",
  "manual_adjustment",
];
const statuses: PaymentLedgerStatus[] = ["active", "reversed"];

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

function toString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

export function toPaymentLedgerEntryDTO(
  source: PaymentLedgerMapperSource,
): PaymentLedgerEntryDTO {
  const courseId = toId(source.courseId);

  return {
    id: toId(source._id ?? source.id),
    teacherId: toId(source.teacherId),
    studentId: toId(source.studentId),
    studentNameSnapshot: toString(source.studentNameSnapshot),
    courseId: courseId || null,
    courseNameSnapshot: toString(source.courseNameSnapshot),
    voucherId: toId(source.voucherId),
    voucherNameSnapshot: toString(source.voucherNameSnapshot),
    billingPeriodStart: toIso(source.billingPeriodStart),
    billingPeriodEnd: toIso(source.billingPeriodEnd),
    amount: toNumber(source.amount),
    currency: source.currency === "EUR" ? "EUR" : "EUR",
    paymentStatusSnapshot: oneOf(
      source.paymentStatusSnapshot,
      paymentStatuses,
      "paid",
    ),
    paymentMethod: oneOf(source.paymentMethod, paymentMethods, ""),
    paidAt: toIso(source.paidAt),
    source: oneOf(source.source, sources, "voucher_marked_paid"),
    status: oneOf(source.status, statuses, "active"),
    notes: toString(source.notes),
    createdAt: toIso(source.createdAt),
    updatedAt: toIso(source.updatedAt),
  };
}
