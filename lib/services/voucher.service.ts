import { Types } from "mongoose";

import { CourseEnrollment } from "@/models/CourseEnrollment";
import { CourseProfile } from "@/models/CourseProfile";

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

function time(value: Date | string) {
  return new Date(value).getTime();
}

export function voucherCoversLesson(
  voucher: VoucherCandidate,
  lessonDate: Date,
) {
  const lessonTime = lessonDate.getTime();
  if (!voucher.validFrom || !voucher.validUntil) return false;
  return time(voucher.validFrom) <= lessonTime && lessonTime <= time(voucher.validUntil);
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
  const reserved = args.reservedCredits ?? (() => 0);
  const matches = args.vouchers.filter((voucher) => {
    const linkedToEnrollment = args.enrollmentId &&
      voucher.enrollmentId?.toString() === args.enrollmentId;
    // courseId is retained as a safe compatibility projection for vouchers
    // created by the pre-enrollment course generator.
    const linkedToLegacyCourse = !voucher.enrollmentId && args.courseId &&
      voucher.courseId?.toString() === args.courseId;
    return Boolean(linkedToEnrollment || linkedToLegacyCourse) &&
      voucher.classType === args.classType &&
      voucher.status === "active" &&
      voucherCoversLesson(voucher, args.lessonDate) &&
      (voucher.creditsRemaining ?? 0) - reserved(voucher) >= args.requiredCredits;
  });

  if (matches.length > 1) {
    throw new VoucherDomainError(
      "Hay varios bonos utilizables para el mismo alumno, curso y periodo. Corrige los periodos solapados antes de continuar.",
      409,
    );
  }
  return matches[0];
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
    time(voucher.validFrom) <= args.validUntil.getTime() &&
    time(voucher.validUntil) >= args.validFrom.getTime(),
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
