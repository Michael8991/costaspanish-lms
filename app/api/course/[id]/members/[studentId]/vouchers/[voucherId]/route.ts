import { QueryFilter, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole, type Role } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import { toStudentPlanListDTO } from "@/lib/dto/student.dto";
import dbConnect from "@/lib/mongo";
import { normalizeCourseMembers } from "@/lib/utils/course-members";
import { editCourseVoucherSchema } from "@/lib/validators/voucher";
import {
  CourseProfile,
  type ICourseProfile,
} from "@/models/CourseProfile";
import { StudentProfile } from "@/models/StudentProfile";

type RouteContext = {
  params: Promise<{ id: string; studentId: string; voucherId: string }>;
};

function getCourseFilter(
  courseId: Types.ObjectId,
  user: { id: string; role: Role },
): QueryFilter<ICourseProfile> {
  return user.role === "admin"
    ? { _id: courseId }
    : {
        _id: courseId,
        ownerTeacherId: new Types.ObjectId(user.id),
      };
}

async function getVoucherContext(
  courseId: Types.ObjectId,
  studentId: Types.ObjectId,
  voucherId: Types.ObjectId,
  user: { id: string; role: Role },
) {
  const course = await CourseProfile.findOne(getCourseFilter(courseId, user));
  if (!course) return { error: "Course not found", status: 404 } as const;

  const members = normalizeCourseMembers({
    members: course.members,
    legacyStudentIds: course.studentIds,
    fallbackJoinedAt: course.startDate ?? course.createdAt,
  });
  const member = members.find(
    (candidate) => candidate.studentId === studentId.toString(),
  );
  if (!member) {
    return {
      error: "El alumno no pertenece a este curso.",
      status: 400,
    } as const;
  }

  const studentFilter = getStudentOwnershipFilter(user, {
    _id: studentId,
    "activePlans._id": voucherId,
  });
  if (!studentFilter) {
    return { error: "Invalid user id", status: 500 } as const;
  }
  const student = await StudentProfile.findOne(
    studentFilter,
    { activePlans: { $elemMatch: { _id: voucherId } } },
  ).lean();
  const voucher = student?.activePlans?.[0];
  if (!voucher) {
    return { error: "Voucher not found", status: 404 } as const;
  }
  if (
    voucher.courseId &&
    voucher.courseId.toString() !== courseId.toString()
  ) {
    return {
      error: "El bono pertenece a otro curso.",
      status: 409,
    } as const;
  }
  if (
    !voucher.courseId &&
    member.billing.lastVoucherId !== voucherId.toString()
  ) {
    return {
      error: "El bono no está asociado a este integrante del curso.",
      status: 409,
    } as const;
  }

  return { course, member, voucher } as const;
}

async function authorize(request: NextRequest) {
  const user = await requireAuth(request);
  if (!user || !requireRole(user, ["admin", "teacher"])) return null;
  return user;
}

function validateIds(values: string[]) {
  return values.every((value) => Types.ObjectId.isValid(value));
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await authorize(request);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, studentId, voucherId } = await context.params;
    if (!validateIds([id, studentId, voucherId, user.id])) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await dbConnect();
    const result = await getVoucherContext(
      new Types.ObjectId(id),
      new Types.ObjectId(studentId),
      new Types.ObjectId(voucherId),
      user,
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      item: toStudentPlanListDTO(result.voucher),
    });
  } catch (error) {
    console.error("GET course member voucher error:", error);
    return NextResponse.json(
      { error: "No se pudo cargar el bono." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await authorize(request);
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, studentId, voucherId } = await context.params;
    if (!validateIds([id, studentId, voucherId, user.id])) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = editCourseVoucherSchema.safeParse(body);
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

    await dbConnect();
    const courseId = new Types.ObjectId(id);
    const studentObjectId = new Types.ObjectId(studentId);
    const voucherObjectId = new Types.ObjectId(voucherId);
    const result = await getVoucherContext(
      courseId,
      studentObjectId,
      voucherObjectId,
      user,
    );
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    const payload = parsed.data;
    const finalPeriodStart =
      payload.billingPeriodStart === undefined
        ? result.voucher.billingPeriodStart
        : payload.billingPeriodStart;
    const finalPeriodEnd =
      payload.billingPeriodEnd === undefined
        ? result.voucher.billingPeriodEnd
        : payload.billingPeriodEnd;
    if (
      finalPeriodStart &&
      finalPeriodEnd &&
      finalPeriodEnd < finalPeriodStart
    ) {
      return NextResponse.json(
        { error: "La fecha final no puede ser anterior a la inicial." },
        { status: 400 },
      );
    }

    const set: Record<string, unknown> = {};
    const allowedFields = [
      "billingPeriodStart",
      "billingPeriodEnd",
      "paymentStatus",
      "amountPaid",
      "paidAt",
      "paymentMethod",
      "paymentNotes",
      "internalNotes",
    ] as const;
    for (const field of allowedFields) {
      if (payload[field] !== undefined) {
        set[`activePlans.$.${field}`] = payload[field];
      }
    }

    const finalPriceTotal =
      payload.priceTotal ??
      result.voucher.priceTotal ??
      result.voucher.price;
    if (payload.priceTotal !== undefined) {
      set["activePlans.$.price"] = payload.priceTotal;
      set["activePlans.$.priceTotal"] = payload.priceTotal;
      set["activePlans.$.unitCreditPriceSnapshot"] =
        result.voucher.creditsTotal && result.voucher.creditsTotal > 0
          ? payload.priceTotal / result.voucher.creditsTotal
          : null;
    }
    if (
      payload.paymentStatus === "paid" &&
      payload.amountPaid === undefined &&
      (result.voucher.amountPaid ?? 0) === 0
    ) {
      set["activePlans.$.amountPaid"] = finalPriceTotal;
    }
    if (
      payload.paymentStatus === "paid" &&
      payload.paidAt === undefined &&
      !result.voucher.paidAt
    ) {
      set["activePlans.$.paidAt"] = new Date();
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const updateFilter = getStudentOwnershipFilter(user, {
      _id: studentObjectId,
      "activePlans._id": voucherObjectId,
    });
    if (!updateFilter) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }
    const updated = await StudentProfile.findOneAndUpdate(
      updateFilter,
      { $set: set },
      { new: true, runValidators: true },
    ).lean();
    const updatedVoucher = updated?.activePlans.find(
      (voucher) => voucher._id.toString() === voucherId,
    );
    if (!updatedVoucher) {
      return NextResponse.json(
        { error: "Voucher not found after update" },
        { status: 404 },
      );
    }

    // TODO: Create PaymentLedgerEntry when a voucher is marked as paid.
    // TODO: Add full voucher history per course member.
    // TODO: Add payment reversal workflow.
    return NextResponse.json({
      item: toStudentPlanListDTO(updatedVoucher),
    });
  } catch (error) {
    console.error("PATCH course member voucher error:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar el bono." },
      { status: 500 },
    );
  }
}
