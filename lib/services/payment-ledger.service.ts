import { Types } from "mongoose";

import {
  PaymentLedgerEntry,
  type PaymentLedgerPaymentMethod,
  type PaymentLedgerSource,
} from "@/models/PaymentLedgerEntry";
import {
  getStudentNameSnapshot,
  getVoucherNameSnapshot,
} from "@/lib/utils/ledger-snapshots";

export type PaymentLedgerStudentInput = {
  _id: Types.ObjectId | string;
  fullName?: string;
};

export type PaymentLedgerVoucherInput = {
  _id: Types.ObjectId | string;
  name?: string;
  courseId?: Types.ObjectId | string | null;
  courseNameSnapshot?: string;
  billingPeriodStart?: Date | string | null;
  billingPeriodEnd?: Date | string | null;
  paymentStatus?: "pending" | "paid" | "partial" | "waived";
  amountPaid?: number;
  paidAt?: Date | string | null;
  paymentMethod?: PaymentLedgerPaymentMethod;
  paymentNotes?: string;
  currency?: "EUR";
};

export type PaymentLedgerResult = {
  action: "created" | "unchanged" | "reversed" | "skipped";
  entryId: string | null;
};

function toObjectId(
  value: Types.ObjectId | string | null | undefined,
): Types.ObjectId | null {
  if (!value || !Types.ObjectId.isValid(value.toString())) return null;
  return new Types.ObjectId(value.toString());
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isSameDate(first: Date, second: Date): boolean {
  return first.getTime() === second.getTime();
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function reverseActivePaymentLedgersForVouchers(args: {
  teacherId: Types.ObjectId;
  voucherIds: Types.ObjectId[];
  changedBy: Types.ObjectId;
  reason: string;
}): Promise<void> {
  if (args.voucherIds.length === 0) return;

  await PaymentLedgerEntry.updateMany(
    {
      teacherId: args.teacherId,
      voucherId: { $in: args.voucherIds },
      status: "active",
    },
    {
      $set: {
        status: "reversed",
        reversedAt: new Date(),
        reversedBy: args.changedBy,
        reversalReason: args.reason,
      },
    },
  );
}

export async function ensurePaymentLedgerForVoucher(args: {
  teacherId: Types.ObjectId;
  student: PaymentLedgerStudentInput;
  voucher: PaymentLedgerVoucherInput;
  changedBy: Types.ObjectId;
  source: Exclude<PaymentLedgerSource, "manual_adjustment" | "legacy_snapshot_migration">;
}): Promise<PaymentLedgerResult> {
  const studentId = toObjectId(args.student._id);
  const voucherId = toObjectId(args.voucher._id);

  if (!studentId || !voucherId) {
    throw new Error("Cannot create payment ledger without valid ids");
  }

  const activeEntry = await PaymentLedgerEntry.findOne({
    teacherId: args.teacherId,
    voucherId,
    status: "active",
  });
  const paymentStatus = args.voucher.paymentStatus ?? "pending";
  const amount =
    typeof args.voucher.amountPaid === "number" &&
    Number.isFinite(args.voucher.amountPaid) &&
    args.voucher.amountPaid >= 0
      ? args.voucher.amountPaid
      : 0;

  if (
    (paymentStatus !== "paid" && paymentStatus !== "partial") ||
    amount <= 0
  ) {
    if (!activeEntry) {
      return { action: "skipped", entryId: null };
    }

    activeEntry.status = "reversed";
    activeEntry.reversedAt = new Date();
    activeEntry.reversedBy = args.changedBy;
    activeEntry.reversalReason =
      paymentStatus === "pending" || paymentStatus === "waived"
        ? "payment_status_changed_to_non_paid"
        : "payment_amount_changed_to_zero";
    await activeEntry.save();

    return { action: "reversed", entryId: activeEntry._id.toString() };
  }

  const paidAt =
    toDate(args.voucher.paidAt) ?? activeEntry?.paidAt ?? new Date();
  const paymentMethod = args.voucher.paymentMethod ?? "";

  if (
    activeEntry &&
    activeEntry.amount === amount &&
    activeEntry.paymentStatusSnapshot === paymentStatus &&
    activeEntry.paymentMethod === paymentMethod &&
    isSameDate(activeEntry.paidAt, paidAt)
  ) {
    return { action: "unchanged", entryId: activeEntry._id.toString() };
  }

  if (activeEntry) {
    activeEntry.status = "reversed";
    activeEntry.reversedAt = new Date();
    activeEntry.reversedBy = args.changedBy;
    activeEntry.reversalReason = "payment_details_updated";
    await activeEntry.save();
  }

  try {
    const created = await PaymentLedgerEntry.create({
      teacherId: args.teacherId,
      studentId,
      studentNameSnapshot: getStudentNameSnapshot(args.student),
      courseId: toObjectId(args.voucher.courseId),
      courseNameSnapshot: args.voucher.courseNameSnapshot?.trim() ?? "",
      voucherId,
      voucherNameSnapshot: getVoucherNameSnapshot(args.voucher),
      billingPeriodStart: toDate(args.voucher.billingPeriodStart),
      billingPeriodEnd: toDate(args.voucher.billingPeriodEnd),
      amount,
      currency: "EUR",
      paymentStatusSnapshot: paymentStatus,
      paymentMethod,
      paidAt,
      source: args.source,
      status: "active",
      notes: args.voucher.paymentNotes?.trim() ?? "",
    });

    return { action: "created", entryId: created._id.toString() };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;

    const existing = await PaymentLedgerEntry.findOne({
      teacherId: args.teacherId,
      voucherId,
      status: "active",
    }).select("_id");

    return {
      action: "unchanged",
      entryId: existing?._id.toString() ?? null,
    };
  }
}

// TODO: Reverse PaymentLedgerEntry through an explicit payment reversal flow.
