import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import dbConnect from "@/lib/mongo";
import {
  assertNoOverlappingVoucherPeriod,
  validateVoucherEnrollment,
  VoucherDomainError,
} from "@/lib/services/voucher.service";
import { startOfUtcDay } from "@/lib/utils/date-only";
import { toCents } from "@/lib/utils/money";
import {
  resolveCourseVoucherAssociation,
  withAuthoritativeCourseVoucherFields,
} from "@/lib/utils/course-context-voucher";
import {
  resolveManualVoucherDates,
  VoucherDatePolicyError,
} from "@/lib/utils/voucher-date-policy";
import { createStudentVoucherSchema } from "@/lib/validators/voucher";
import { CourseProfile } from "@/models/CourseProfile";
import { StudentProfile, type PlanDoc } from "@/models/StudentProfile";

type Context = {
  params: Promise<{ id: string; studentId: string }>;
};

export async function POST(request: NextRequest, { params }: Context) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(user, ["teacher", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, studentId } = await params;
  if (
    !mongoose.isValidObjectId(id) ||
    !mongoose.isValidObjectId(studentId) ||
    !mongoose.isValidObjectId(user.id)
  ) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await dbConnect();
  const course = await CourseProfile.findOne({
    _id: new mongoose.Types.ObjectId(id),
    ...(user.role === "admin"
      ? {}
      : { ownerTeacherId: new mongoose.Types.ObjectId(user.id) }),
  })
    .select("_id name internalName classType")
    .lean();
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }
  if (!course.classType) {
    return NextResponse.json(
      { error: "El curso no tiene un tipo de clase configurado." },
      { status: 409 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const financialFields = [
    "paymentStatus",
    "amountPaid",
    "amountPaidCents",
    "paidAt",
    "paymentMethod",
    "paymentNotes",
  ];
  if (
    body &&
    typeof body === "object" &&
    financialFields.some((field) =>
      Object.prototype.hasOwnProperty.call(body, field),
    )
  ) {
    return NextResponse.json(
      { error: "Los datos de cobro deben registrarse mediante POST /payments." },
      { status: 400 },
    );
  }

  const bodyWithCourseContext =
    body && typeof body === "object" && !Array.isArray(body)
      ? {
          ...withAuthoritativeCourseVoucherFields(
            body as Record<string, unknown>,
            course.classType,
          ),
          validFrom: Object.prototype.hasOwnProperty.call(body, "validFrom")
            ? Reflect.get(body, "validFrom")
            : startOfUtcDay(new Date()),
        }
      : body;
  const parsed = createStudentVoucherSchema.safeParse(bodyWithCourseContext);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid voucher payload",
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  let voucherDates;
  try {
    voucherDates = resolveManualVoucherDates({
      validFrom: payload.validFrom,
      validUntil: payload.validUntil,
      billingPeriodStart: payload.billingPeriodStart,
      billingPeriodEnd: payload.billingPeriodEnd,
    });
  } catch (error) {
    if (error instanceof VoucherDatePolicyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const creditsTotal = payload.creditsTotal;
  const creditsRemaining = payload.creditsRemaining ?? creditsTotal;
  if (
    payload.billingType === "package" &&
    (creditsTotal === undefined || creditsTotal <= 0)
  ) {
    return NextResponse.json(
      { error: "creditsTotal must be > 0 for package" },
      { status: 400 },
    );
  }
  if (
    creditsTotal !== undefined &&
    creditsRemaining !== undefined &&
    creditsRemaining > creditsTotal
  ) {
    return NextResponse.json(
      { error: "creditsRemaining cannot exceed creditsTotal" },
      { status: 400 },
    );
  }

  let enrollment;
  try {
    enrollment = await validateVoucherEnrollment({
      enrollmentId: payload.enrollmentId,
      studentId,
      actorId: user.id,
      actorRole: user.role,
    });
  } catch (error) {
    if (error instanceof VoucherDomainError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }
  const associationResult = resolveCourseVoucherAssociation({
    routeCourseId: id,
    enrollment,
  });
  if (!associationResult.ok) {
    return NextResponse.json(
      {
        error: associationResult.error,
        code: associationResult.code,
      },
      { status: associationResult.status },
    );
  }

  const priceTotal = payload.priceTotal ?? payload.price ?? 0;
  const priceTotalCents = toCents(priceTotal);
  const unitCreditPriceSnapshot =
    creditsTotal !== undefined && creditsTotal > 0
      ? priceTotal / creditsTotal
      : null;
  const voucherObjectId = new mongoose.Types.ObjectId();
  const voucherAssociation = associationResult.association;
  const plan: PlanDoc = {
    _id: voucherObjectId,
    name: payload.name,
    billingType: payload.billingType,
    classType: course.classType,
    validFrom: voucherDates.validFrom,
    validUntil: voucherDates.validUntil,
    creditsTotal,
    creditsRemaining,
    status: payload.status,
    enrollmentId: voucherAssociation.enrollmentId,
    courseId: voucherAssociation.courseId,
    courseNameSnapshot:
      course.name?.trim() || course.internalName?.trim() || undefined,
    generatedFromCourse: false,
    generatedFromCourseMember: false,
    billingMode: payload.billingMode ?? undefined,
    billingPeriodStart: voucherDates.billingPeriodStart ?? undefined,
    billingPeriodEnd: voucherDates.billingPeriodEnd ?? undefined,
    billingAnchorDay: payload.billingAnchorDay ?? undefined,
    paymentStatus: "pending",
    amountPaid: 0,
    amountPaidCents: 0,
    paidAt: null,
    paymentMethod: "",
    paymentNotes: "",
    internalNotes: payload.internalNotes,
    priceTotal,
    price: priceTotal,
    priceTotalCents,
    currency: payload.currency,
    unitCreditPriceSnapshot,
    createdFrom: "course_profile",
  };

  const ownershipFilter = getStudentOwnershipFilter(user, {
    _id: new mongoose.Types.ObjectId(studentId),
  });
  if (!ownershipFilter) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
  }
  const accessibleStudent = await StudentProfile.exists(ownershipFilter);
  if (!accessibleStudent) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const current = await StudentProfile.findOne(ownershipFilter)
    .select("activePlans")
    .lean();
  try {
    assertNoOverlappingVoucherPeriod({
      vouchers: current?.activePlans ?? [],
      enrollmentId: enrollment._id.toString(),
      classType: course.classType,
      validFrom: plan.validFrom,
      validUntil: plan.validUntil,
    });
  } catch (error) {
    if (error instanceof VoucherDomainError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    throw error;
  }

  const studentFilter = getStudentOwnershipFilter(user, {
    _id: new mongoose.Types.ObjectId(studentId),
    activePlans: {
      $not: {
        $elemMatch: {
          enrollmentId: enrollment._id,
          classType: course.classType,
          status: { $ne: "canceled" },
          validFrom: { $lte: plan.validUntil },
          validUntil: { $gte: plan.validFrom },
        },
      },
    },
  });
  if (!studentFilter) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
  }

  const updated = await StudentProfile.findOneAndUpdate(
    studentFilter,
    { $push: { activePlans: plan } },
    { new: true, runValidators: true },
  ).lean();
  if (!updated) {
    return NextResponse.json(
      {
        error:
          "Ya existe un bono del mismo tipo para esta matrícula con un periodo solapado.",
      },
      { status: 409 },
    );
  }

  const updatedVoucher = updated.activePlans.find(
    (voucher) => voucher._id.toString() === voucherObjectId.toString(),
  );
  if (!updatedVoucher) {
    await StudentProfile.updateOne(
      { _id: updated._id },
      { $pull: { activePlans: { _id: voucherObjectId } } },
    );
    return NextResponse.json(
      { error: "No se encontró el bono después de su creación." },
      { status: 500 },
    );
  }

  revalidatePath("/", "layout");
  return NextResponse.json(updated, { status: 201 });
}
