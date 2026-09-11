import { Types } from "mongoose";

import { CourseEnrollment } from "@/models/CourseEnrollment";
import { CourseProfile } from "@/models/CourseProfile";
import {
  isDateWithinVoucherValidity,
  voucherPeriodsOverlap,
} from "@/lib/utils/voucher-period";

export class VoucherDomainError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "VoucherDomainError";
  }
}

type VoucherCandidate = {
  _id: Types.ObjectId;
  enrollmentId?: Types.ObjectId | null;
  courseId?: Types.ObjectId | null;
  classType?: string;
  status?: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
  creditsRemaining?: number;
};

export function voucherCoversLesson(
  voucher: VoucherCandidate,
  lessonDate: Date,
) {
  if (!voucher.validFrom || !voucher.validUntil) return false;
  return isDateWithinVoucherValidity(
    lessonDate,
    voucher.validFrom,
    voucher.validUntil,
  );
}

export type VoucherRejectionReason =
  | "NO_VOUCHER_FOR_COURSE"
  | "NO_VOUCHER_FOR_CLASS_TYPE"
  | "VOUCHER_CANCELLED"
  | "NO_VOUCHER_FOR_PERIOD"
  | "VOUCHER_EXHAUSTED"
  | "VOUCHER_NOT_FOUND";

function rejectionReason<T extends VoucherCandidate>(args: {
  voucher: T;
  enrollmentId?: string | null;
  courseId?: string | null;
  classType: string;
  lessonDate: Date;
  requiredCredits: number;
  reservedCredits: (voucher: T) => number;
}): VoucherRejectionReason | null {
  const linkedToEnrollment = args.enrollmentId &&
    args.voucher.enrollmentId?.toString() === args.enrollmentId;
  const linkedToLegacyCourse = !args.voucher.enrollmentId && args.courseId &&
    args.voucher.courseId?.toString() === args.courseId;
  if (!linkedToEnrollment && !linkedToLegacyCourse) {
    return "NO_VOUCHER_FOR_COURSE";
  }
  if (args.voucher.classType !== args.classType) {
    return "NO_VOUCHER_FOR_CLASS_TYPE";
  }
  if (args.voucher.status !== "active") return "VOUCHER_CANCELLED";
  if (!voucherCoversLesson(args.voucher, args.lessonDate)) {
    return "NO_VOUCHER_FOR_PERIOD";
  }
  if ((args.voucher.creditsRemaining ?? 0) -
      args.reservedCredits(args.voucher) < args.requiredCredits) {
    return "VOUCHER_EXHAUSTED";
  }
  return null;
}

export function resolveVoucherForLessonResult<T extends VoucherCandidate>(args: {
  vouchers: T[];
  reservedVoucherId?: string | null;
  enrollmentId?: string | null;
  courseId?: string | null;
  classType: string;
  lessonDate: Date;
  requiredCredits: number;
  reservedCredits?: (voucher: T) => number;
}): { voucher?: T; reasons: VoucherRejectionReason[] } {
  const reserved = args.reservedCredits ?? (() => 0);
  const reservedVoucher = args.reservedVoucherId
    ? args.vouchers.find(
        (voucher) => voucher._id.toString() === args.reservedVoucherId,
      )
    : undefined;

  // A lesson's voucherId is a preference/reservation, not a permanent lock.
  // Keep it when it is still usable; otherwise resolve against the student's
  // current vouchers so stale lesson data cannot hide a valid replacement.
  if (reservedVoucher) {
    const reservedReason = rejectionReason({
      ...args,
      voucher: reservedVoucher,
      reservedCredits: reserved,
    });
    if (reservedReason === null) {
      return { voucher: reservedVoucher, reasons: [] };
    }
  }

  const evaluated = args.vouchers.map((voucher) => ({
    voucher,
    reason: rejectionReason({ ...args, voucher, reservedCredits: reserved }),
  }));
  const matches = evaluated.filter((item) => item.reason === null);

  if (matches.length > 1) {
    throw new VoucherDomainError(
      "Hay varios bonos utilizables para el mismo alumno, curso y periodo. Corrige los periodos solapados antes de continuar.",
      409,
    );
  }
  return {
    voucher: matches[0]?.voucher,
    reasons: matches.length > 0
      ? []
      : Array.from(new Set([
          ...(args.reservedVoucherId && !reservedVoucher
            ? ["VOUCHER_NOT_FOUND" as const]
            : []),
          ...evaluated.flatMap((item) => item.reason ? [item.reason] : []),
        ])),
  };
}

export function resolveVoucherForLesson<T extends VoucherCandidate>(args: {
  vouchers: T[];
  enrollmentId?: string | null;
  courseId?: string | null;
  classType: string;
  lessonDate: Date;
  requiredCredits: number;
  reservedCredits?: (voucher: T) => number;
}): T | undefined {
  return resolveVoucherForLessonResult(args).voucher;
}

export async function validateVoucherEnrollment(args: {
  enrollmentId: string;
  studentId: string;
  actorId: string;
  actorRole: string;
}) {
  const enrollment = await CourseEnrollment.findById(args.enrollmentId).lean();
  if (!enrollment || enrollment.status !== "active" ||
      enrollment.studentId.toString() !== args.studentId) {
    throw new VoucherDomainError(
      "La matrícula seleccionada no pertenece al alumno o no está activa.",
    );
  }
  if (args.actorRole !== "admin") {
    const ownsCourse = await CourseProfile.exists({
      _id: enrollment.courseId,
      ownerTeacherId: new Types.ObjectId(args.actorId),
    });
    if (!ownsCourse) {
      throw new VoucherDomainError("No tienes permiso para usar esta matrícula.", 403);
    }
  }
  return enrollment;
}

export function assertNoOverlappingVoucherPeriod(args: {
  vouchers: VoucherCandidate[];
  enrollmentId: string;
  classType: string;
  validFrom: Date;
  validUntil: Date;
  excludeVoucherId?: string;
}) {
  const overlap = args.vouchers.some((voucher) =>
    voucher._id.toString() !== args.excludeVoucherId &&
    voucher.status !== "canceled" &&
    voucher.enrollmentId?.toString() === args.enrollmentId &&
    voucher.classType === args.classType &&
    voucher.validFrom && voucher.validUntil &&
    voucherPeriodsOverlap({
      firstStart: voucher.validFrom,
      firstEnd: voucher.validUntil,
      secondStart: args.validFrom,
      secondEnd: args.validUntil,
    }),
  );
  if (overlap) {
    throw new VoucherDomainError(
      "Ya existe un bono del mismo tipo para esta matrícula con un periodo solapado.",
      409,
    );
  }
}

export function enrollmentObjectId(value?: string) {
  return value ? new Types.ObjectId(value) : undefined;
}
