import { Types } from "mongoose";

import type { LessonCreditSettlement } from "@/lib/types/lesson";
import {
  calculateEstimatedRevenue,
  calculateUnitCreditPrice,
  getStudentNameSnapshot,
  getVoucherNameSnapshot,
} from "@/lib/utils/ledger-snapshots";
import { CourseProfile } from "@/models/CourseProfile";
import { CreditLedgerEntry } from "@/models/CreditLedgerEntry";
import { StudentProfile, type PlanDoc } from "@/models/StudentProfile";

export type CreditLedgerLessonInput = {
  _id: Types.ObjectId | string;
  title?: string;
  scheduledStart?: Date | string | null;
  courseId?: Types.ObjectId | string | { _id?: unknown } | null;
};

export type CreditLedgerResult = {
  createdCount: number;
  skippedCount: number;
  warnings: string[];
};

type CreditLedgerStudent = {
  _id: Types.ObjectId;
  fullName: string;
  activePlans?: PlanDoc[];
};

function getIdCandidate(value: CreditLedgerLessonInput["courseId"]): unknown {
  if (value && typeof value === "object" && !(value instanceof Types.ObjectId)) {
    return "_id" in value ? value._id : null;
  }
  return value;
}

function toObjectId(value: unknown): Types.ObjectId | null {
  if (!value) return null;
  const stringValue = String(value);
  return Types.ObjectId.isValid(stringValue)
    ? new Types.ObjectId(stringValue)
    : null;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toOptionalNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function ensureCreditLedgerForLessonSettlement(args: {
  teacherId: Types.ObjectId;
  lesson: CreditLedgerLessonInput;
  settlement: LessonCreditSettlement;
  changedBy: Types.ObjectId;
}): Promise<CreditLedgerResult> {
  void args.changedBy;

  if (args.settlement.status !== "settled") {
    return { createdCount: 0, skippedCount: 0, warnings: [] };
  }

  const lessonId = toObjectId(args.lesson._id);
  if (!lessonId) throw new Error("Cannot create credit ledger without lesson id");

  const relevantItems = args.settlement.items.filter(
    (item) =>
      typeof item.creditsConsumed === "number" && item.creditsConsumed > 0,
  );
  if (relevantItems.length === 0) {
    return { createdCount: 0, skippedCount: 0, warnings: [] };
  }

  const studentIds = relevantItems
    .map((item) => toObjectId(item.studentId))
    .filter((studentId): studentId is Types.ObjectId => Boolean(studentId));
  const students = await StudentProfile.find({ _id: { $in: studentIds } })
    .select("fullName activePlans")
    .lean<CreditLedgerStudent[]>();
  const studentsById = new Map(
    students.map((student) => [student._id.toString(), student]),
  );

  const courseId = toObjectId(getIdCandidate(args.lesson.courseId));
  const course = courseId
    ? await CourseProfile.findById(courseId)
        .select("name internalName")
        .lean<{ name?: string; internalName?: string }>()
    : null;
  const courseNameSnapshot =
    course?.name?.trim() || course?.internalName?.trim() || "";
  const consumedAt = args.settlement.settledAt ?? new Date();
  const lessonDate =
    toDate(args.lesson.scheduledStart) ??
    toDate(args.settlement.settledAt) ??
    new Date();
  const warnings: string[] = [];
  let createdCount = 0;
  let skippedCount = 0;

  for (const item of relevantItems) {
    const studentId = toObjectId(item.studentId);
    if (!studentId) {
      warnings.push("credit_ledger_item_missing_student_id");
      skippedCount += 1;
      continue;
    }

    const duplicate = await CreditLedgerEntry.exists({
      teacherId: args.teacherId,
      lessonId,
      studentId,
      source: "lesson_completion",
      status: "active",
    });
    if (duplicate) {
      skippedCount += 1;
      continue;
    }

    const student = studentsById.get(studentId.toString());
    if (!student) {
      warnings.push(`credit_ledger_student_not_found:${studentId.toString()}`);
      skippedCount += 1;
      continue;
    }

    const voucherId = toObjectId(item.voucherId);
    const voucher = voucherId
      ? student.activePlans?.find(
          (plan) => plan._id.toString() === voucherId.toString(),
        )
      : undefined;
    const voucherTotalCreditsSnapshot = toOptionalNumber(
      voucher?.creditsTotal,
    );
    const voucherPriceSnapshot = toOptionalNumber(voucher?.priceTotal);
    const storedUnitPrice = toOptionalNumber(
      voucher?.unitCreditPriceSnapshot,
    );
    const unitCreditPrice =
      storedUnitPrice ??
      calculateUnitCreditPrice({
        priceTotal: voucherPriceSnapshot,
        creditsTotal: voucherTotalCreditsSnapshot,
      });

    if (!voucher) {
      warnings.push(`credit_ledger_voucher_not_found:${voucherId?.toString() ?? "none"}`);
    } else if (voucherPriceSnapshot === null) {
      warnings.push(`credit_ledger_voucher_price_missing:${voucher._id.toString()}`);
    }

    try {
      await CreditLedgerEntry.create({
        teacherId: args.teacherId,
        lessonId,
        lessonTitleSnapshot: args.lesson.title?.trim() || "Clase",
        lessonDate,
        courseId,
        courseNameSnapshot,
        studentId,
        studentNameSnapshot: getStudentNameSnapshot(student),
        voucherId,
        voucherNameSnapshot: getVoucherNameSnapshot(voucher),
        billingPeriodStart: voucher?.billingPeriodStart ?? null,
        billingPeriodEnd: voucher?.billingPeriodEnd ?? null,
        creditsConsumed: item.creditsConsumed,
        voucherTotalCreditsSnapshot,
        voucherPriceSnapshot,
        unitCreditPriceSnapshot: unitCreditPrice,
        estimatedRevenue: calculateEstimatedRevenue({
          creditsConsumed: item.creditsConsumed,
          unitCreditPrice,
        }),
        consumedAt,
        source: "lesson_completion",
        status: "active",
        settlementReason: item.reason,
        notes: item.notes?.trim() ?? "",
      });
      createdCount += 1;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      skippedCount += 1;
    }
  }

  return { createdCount, skippedCount, warnings };
}
