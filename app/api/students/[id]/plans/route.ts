import { revalidatePath } from "next/cache";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import dbConnect from "@/lib/mongo";
import { ensurePaymentLedgerForVoucher } from "@/lib/services/payment-ledger.service";
import { createStudentVoucherSchema } from "@/lib/validators/voucher";
import { StudentProfile, type PlanDoc } from "@/models/StudentProfile";

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
  const amountPaid =
    payload.paymentStatus === "paid" && payload.amountPaid === 0
      ? priceTotal
      : payload.amountPaid;
  const unitCreditPriceSnapshot =
    creditsTotal !== undefined && creditsTotal > 0
      ? priceTotal / creditsTotal
      : null;
  const voucherObjectId = new mongoose.Types.ObjectId();
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
    price: priceTotal,
    courseId: payload.courseId
      ? new mongoose.Types.ObjectId(payload.courseId)
      : undefined,
    courseNameSnapshot: payload.courseNameSnapshot,
    generatedFromCourse: payload.generatedFromCourse,
    generatedFromCourseMember: payload.generatedFromCourseMember,
    billingMode: payload.billingMode ?? undefined,
    billingPeriodStart: payload.billingPeriodStart ?? undefined,
    billingPeriodEnd: payload.billingPeriodEnd ?? undefined,
    billingAnchorDay: payload.billingAnchorDay ?? undefined,
    paymentStatus: payload.paymentStatus,
    amountPaid,
    paidAt:
      payload.paymentStatus === "paid"
        ? payload.paidAt ?? new Date()
        : payload.paidAt,
    paymentMethod: payload.paymentMethod,
    paymentNotes: payload.paymentNotes,
    internalNotes: payload.internalNotes,
    priceTotal,
    currency: payload.currency,
    unitCreditPriceSnapshot,
    createdFrom: payload.createdFrom,
  };

  await dbConnect();
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
  const studentFilter = getStudentOwnershipFilter(user, {
    _id: new mongoose.Types.ObjectId(id),
    activePlans: {
      $not: {
        $elemMatch: {
          classType: payload.classType,
          status: "active",
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
        error: `El alumno ya tiene un plan activo del modelo '${payload.classType}'. Finaliza o archiva el actual antes de añadir otro.`,
      },
      { status: 409 },
    );
  }

  const changedBy = getCurrentUserObjectId(user);
  const updatedVoucher = updated.activePlans.find(
    (voucher) => voucher._id.toString() === voucherObjectId.toString(),
  );
  const ledgerTeacherId = updated.teacherId ?? changedBy;

  if (!changedBy || !ledgerTeacherId || !updatedVoucher) {
    await StudentProfile.updateOne(
      { _id: updated._id },
      { $pull: { activePlans: { _id: voucherObjectId } } },
    );
    return NextResponse.json(
      { error: "No se pudo registrar el pago del bono." },
      { status: 500 },
    );
  }

  try {
    await ensurePaymentLedgerForVoucher({
      teacherId: ledgerTeacherId,
      student: updated,
      voucher: updatedVoucher,
      changedBy,
      source: "voucher_created_paid",
    });
  } catch (ledgerError) {
    await StudentProfile.updateOne(
      { _id: updated._id },
      { $pull: { activePlans: { _id: voucherObjectId } } },
    );
    console.error("Error creating payment ledger for voucher:", ledgerError);
    return NextResponse.json(
      { error: "No se pudo registrar el pago del bono." },
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
