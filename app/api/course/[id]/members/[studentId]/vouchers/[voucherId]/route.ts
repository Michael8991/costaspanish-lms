import { QueryFilter, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole, type Role } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import { toStudentPlanListDTO } from "@/lib/dto/student.dto";
import dbConnect from "@/lib/mongo";
import { buildCourseVoucherUpdateSet } from "@/lib/server/course-vouchers";
import { normalizeCourseMembers } from "@/lib/utils/course-members";
import { getVoucherEffectiveStatus } from "@/lib/utils/date-only";
import {
  resolveCourseVoucherDatePatch,
  VoucherDatePolicyError,
} from "@/lib/utils/voucher-date-policy";
import { editCourseVoucherSchema } from "@/lib/validators/voucher";
import {
  assertNoOverlappingVoucherPeriod,
  VoucherDomainError,
} from "@/lib/services/voucher.service";
import {
  CourseProfile,
  type ICourseProfile,
} from "@/models/CourseProfile";
import { StudentProfile, type PlanStatus } from "@/models/StudentProfile";

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
  const student = await StudentProfile.findOne(studentFilter)
    .select("activePlans")
    .lean();
  const voucher = student?.activePlans?.find(
    (candidate) => candidate._id.toString() === voucherId.toString(),
  );
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

  return { course, member, student, voucher } as const;
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
    let dateResolution;
    try {
      dateResolution = resolveCourseVoucherDatePatch({
        current: {
          validFrom: result.voucher.validFrom,
          validUntil: result.voucher.validUntil,
          billingPeriodStart: result.voucher.billingPeriodStart,
          billingPeriodEnd: result.voucher.billingPeriodEnd,
        },
        patch: {
          billingPeriodStart: payload.billingPeriodStart,
          billingPeriodEnd: payload.billingPeriodEnd,
        },
      });
    } catch (error) {
      if (error instanceof VoucherDatePolicyError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const set = buildCourseVoucherUpdateSet({
      internalNotes: payload.internalNotes,
      priceTotal: payload.priceTotal,
      creditsTotal: result.voucher.creditsTotal,
      datePatch: dateResolution.patch,
    });
    if (dateResolution.validityChanged) {
      const effectiveStatus = getVoucherEffectiveStatus({
        status: result.voucher.status,
        creditsRemaining: result.voucher.creditsRemaining,
        validFrom: dateResolution.state.validFrom,
        validUntil: dateResolution.state.validUntil,
      });
      const persistedStatus: PlanStatus =
        effectiveStatus === "upcoming" ? "active" : effectiveStatus;
      set["activePlans.$.status"] = persistedStatus;

      if (
        result.voucher.enrollmentId &&
        persistedStatus !== "canceled"
      ) {
        try {
          assertNoOverlappingVoucherPeriod({
            vouchers: result.student?.activePlans ?? [],
            enrollmentId: result.voucher.enrollmentId.toString(),
            classType: result.voucher.classType,
            validFrom: dateResolution.state.validFrom,
            validUntil: dateResolution.state.validUntil,
            excludeVoucherId: voucherId,
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
      }
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const overlapGuard =
      dateResolution.validityChanged &&
      result.voucher.enrollmentId &&
      result.voucher.status !== "canceled"
        ? {
            activePlans: {
              $not: {
                $elemMatch: {
                  _id: { $ne: voucherObjectId },
                  enrollmentId: result.voucher.enrollmentId,
                  classType: result.voucher.classType,
                  status: { $ne: "canceled" },
                  validFrom: { $lte: dateResolution.state.validUntil },
                  validUntil: { $gte: dateResolution.state.validFrom },
                },
              },
            },
          }
        : {};
    const updateFilter = getStudentOwnershipFilter(user, {
      _id: studentObjectId,
      "activePlans._id": voucherObjectId,
      ...overlapGuard,
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
    if (!updated || !updatedVoucher) {
      return NextResponse.json(
        {
          error: dateResolution.validityChanged
            ? "Ya existe un bono del mismo tipo con un periodo solapado."
            : "Voucher not found after update",
        },
        { status: dateResolution.validityChanged ? 409 : 404 },
      );
    }

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
