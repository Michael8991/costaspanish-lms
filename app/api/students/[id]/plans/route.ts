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
import { createStudentVoucherSchema } from "@/lib/validators/voucher";
import { StudentProfile, type PlanDoc } from "@/models/StudentProfile";
import { CourseProfile } from "@/models/CourseProfile";
import { toCents } from "@/lib/utils/money";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(user, ["teacher", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }

  const body: unknown = await req.json().catch(() => null);
  const financialFields = ["paymentStatus", "amountPaid","amountPaidCents", "paidAt", "paymentMethod", "paymentNotes"];
  if (
    body &&
    typeof body === "object" &&
    financialFields.some((field) => Object.prototype.hasOwnProperty.call(body, field))
  ) {
    return NextResponse.json(
      { error: "Los datos de cobro deben registrarse mediante POST /payments." },
      { status: 400 },
    );
  }
  const parsed = createStudentVoucherSchema.safeParse(body);

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

  const priceTotal = payload.priceTotal ?? payload.price ?? 0;
  const priceTotalCents = toCents(priceTotal);
  const unitCreditPriceSnapshot =
    creditsTotal !== undefined && creditsTotal > 0
      ? priceTotal / creditsTotal
      : null;
  const voucherObjectId = new mongoose.Types.ObjectId();
  await dbConnect();
  let enrollment;
  try {
    enrollment = payload.enrollmentId
      ? await validateVoucherEnrollment({
          enrollmentId: payload.enrollmentId,
          studentId: id,
          actorId: user.id,
          actorRole: user.role,
        })
      : null;
  } catch (error) {
    if (error instanceof VoucherDomainError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
  const enrollmentCourse = enrollment
    ? await CourseProfile.findById(enrollment.courseId).select("name internalName").lean()
    : null;
  const plan: PlanDoc = {
    _id: voucherObjectId,
    name: payload.name,
    billingType: payload.billingType,
    classType: payload.classType,
    validFrom: payload.validFrom ?? new Date(),
    validUntil: payload.validUntil,
    creditsTotal,
    creditsRemaining,
    status: payload.status,
    enrollmentId: enrollment?._id,
    courseId: enrollment?.courseId ?? (payload.courseId
      ? new mongoose.Types.ObjectId(payload.courseId)
      : undefined),
      courseNameSnapshot: payload.courseNameSnapshot ??
      (enrollmentCourse?.name?.trim() || enrollmentCourse?.internalName?.trim() || undefined),
    generatedFromCourse: payload.generatedFromCourse,
    generatedFromCourseMember: payload.generatedFromCourseMember,
    billingMode: payload.billingMode ?? undefined,
    billingPeriodStart: payload.billingPeriodStart ?? undefined,
    billingPeriodEnd: payload.billingPeriodEnd ?? undefined,
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
    createdFrom: payload.createdFrom,
  };

  const ownershipFilter = getStudentOwnershipFilter(user, {
    _id: new mongoose.Types.ObjectId(id),
  });
  if (!ownershipFilter) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
  }
  const accessibleStudent = await StudentProfile.exists(ownershipFilter);
  if (!accessibleStudent) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  if (enrollment) {
    const current = await StudentProfile.findOne(ownershipFilter).select("activePlans").lean();
    try {
      assertNoOverlappingVoucherPeriod({
        vouchers: current?.activePlans ?? [],
        enrollmentId: enrollment._id.toString(),
        classType: payload.classType,
        validFrom: plan.validFrom,
        validUntil: plan.validUntil,
      });
    } catch (error) {
      if (error instanceof VoucherDomainError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  }
  const studentFilter = getStudentOwnershipFilter(user, {
    _id: new mongoose.Types.ObjectId(id),
    ...(enrollment ? {
      activePlans: {
        $not: {
          $elemMatch: {
            enrollmentId: enrollment._id,
            classType: payload.classType,
            status: { $ne: "canceled" },
            validFrom: { $lte: plan.validUntil },
            validUntil: { $gte: plan.validFrom },
          },
        },
      },
    } : {}),
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
        error: enrollment
          ? "Ya existe un bono del mismo tipo para esta matrícula con un periodo solapado."
          : "No se pudo crear el bono.",
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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(user, ["admin", "teacher"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    await dbConnect();
    const studentFilter = getStudentOwnershipFilter(user, {
      _id: new mongoose.Types.ObjectId(id),
    });
    if (!studentFilter) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }
    const student = await StudentProfile.findOne(studentFilter)
      .select("activePlans")
      .lean();
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 },
      );
    }

    const history = [...(student.activePlans ?? [])].sort(
      (first, second) =>
        new Date(second.validFrom).getTime() -
        new Date(first.validFrom).getTime(),
    );
    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    console.error("Error fetching student voucher:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
