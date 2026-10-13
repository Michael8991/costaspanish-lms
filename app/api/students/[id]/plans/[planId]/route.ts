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
import { updateStudentVoucherSchema } from "@/lib/validators/voucher";
import {
  StudentProfile,
  type PlanStatus,
  type StudentProfileDoc,
} from "@/models/StudentProfile";
import { toCents } from "@/lib/utils/money";
import { getVoucherEffectiveStatus } from "@/lib/utils/date-only";
import {
  resolveVoucherDatePatch,
  VoucherDatePolicyError,
} from "@/lib/utils/voucher-date-policy";

type Ctx = {
  params:
    | { id: string; planId: string }
    | Promise<{ id: string; planId: string }>;
};

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, planId } = await params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(planId) || !mongoose.isValidObjectId(user.id)) {
      return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = updateStudentVoucherSchema.safeParse(body);
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
    const studentObjectId = new mongoose.Types.ObjectId(id);
    const planObjectId = new mongoose.Types.ObjectId(planId);
    const currentFilter = getStudentOwnershipFilter(user, {
      _id: studentObjectId,
      "activePlans._id": planObjectId,
    });
    if (!currentFilter) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }
    const current = await StudentProfile.findOne(currentFilter)
      .select("activePlans")
      .lean();

    const currentPlan = current?.activePlans?.find(
      (plan) => plan._id.toString() === planId,
    );
    if (!current || !currentPlan) {
      return NextResponse.json(
        { error: "Student or specific plan not found" },
        { status: 404 },
      );
    }

    const payload = parsed.data;
    let selectedEnrollment = null;
    if (payload.enrollmentId) {
      try {
        selectedEnrollment = await validateVoucherEnrollment({
          enrollmentId: payload.enrollmentId,
          studentId: id,
          actorId: user.id,
          actorRole: user.role,
        });
      } catch (error) {
        if (error instanceof VoucherDomainError) {
          return NextResponse.json({ error: error.message }, { status: error.status });
        }
        throw error;
      }
    }
    const finalCreditsTotal = payload.creditsTotal ?? currentPlan.creditsTotal;
    const finalCreditsRemaining =
      payload.creditsRemaining ?? currentPlan.creditsRemaining;
    let dateResolution;
    try {
      dateResolution = resolveVoucherDatePatch({
        current: {
          validFrom: currentPlan.validFrom,
          validUntil: currentPlan.validUntil,
          billingPeriodStart: currentPlan.billingPeriodStart,
          billingPeriodEnd: currentPlan.billingPeriodEnd,
        },
        patch: {
          validFrom: payload.validFrom,
          validUntil: payload.validUntil,
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

    if (
      finalCreditsTotal !== undefined &&
      finalCreditsRemaining !== undefined &&
      finalCreditsRemaining > finalCreditsTotal
    ) {
      return NextResponse.json(
        { error: "creditsRemaining cannot exceed creditsTotal" },
        { status: 400 },
      );
    }
    const set: Record<string, unknown> = {};
    const directFields = [
      "name",
      "billingType",
      "classType",
      "creditsTotal",
      "creditsRemaining",
      "status",
      "courseNameSnapshot",
      "generatedFromCourse",
      "generatedFromCourseMember",
      "billingMode",
      "billingAnchorDay",
    ] as const;

    for (const field of directFields) {
      if (payload[field] !== undefined) {
        set[`activePlans.$.${field}`] = payload[field];
      }
    }
    for (const [field, value] of Object.entries(dateResolution.patch)) {
      set[`activePlans.$.${field}`] = value;
    }
    if (payload.courseId !== undefined) {
      set["activePlans.$.courseId"] = new mongoose.Types.ObjectId(
        payload.courseId,
      );
    }
    if (selectedEnrollment) {
      set["activePlans.$.enrollmentId"] = selectedEnrollment._id;
      set["activePlans.$.courseId"] = selectedEnrollment.courseId;
    }

    const priceWasUpdated = payload.price !== undefined;
    const finalPriceTotal =
      payload.price ??
      currentPlan.priceTotal ??
      currentPlan.price;
    if (priceWasUpdated) {
      set["activePlans.$.price"] = finalPriceTotal;
      set["activePlans.$.priceTotal"] = finalPriceTotal;
      set["activePlans.$.priceTotalCents"] = toCents(finalPriceTotal)
    }
    if (priceWasUpdated || payload.creditsTotal !== undefined) {
      set["activePlans.$.unitCreditPriceSnapshot"] =
        finalCreditsTotal !== undefined && finalCreditsTotal > 0
          ? finalPriceTotal / finalCreditsTotal
          : null;
    }

    const shouldRecalculateStatus =
      dateResolution.validityChanged ||
      payload.creditsRemaining !== undefined ||
      payload.status !== undefined;
    let finalStatus: PlanStatus = payload.status ?? currentPlan.status;
    if (shouldRecalculateStatus) {
      const statusForDerivation =
        payload.status ??
        (payload.creditsRemaining !== undefined ? "active" : currentPlan.status);
      const effectiveStatus = getVoucherEffectiveStatus({
        status: statusForDerivation,
        creditsRemaining: finalCreditsRemaining,
        validFrom: dateResolution.state.validFrom,
        validUntil: dateResolution.state.validUntil,
      });
      finalStatus =
        effectiveStatus === "upcoming" ? "active" : effectiveStatus;
      set["activePlans.$.status"] = finalStatus;
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 },
      );
    }

    const finalEnrollmentId = selectedEnrollment?._id ?? currentPlan.enrollmentId;
    const finalClassType = payload.classType ?? currentPlan.classType;
    const overlapRelevantChange =
      dateResolution.validityChanged ||
      payload.classType !== undefined ||
      payload.enrollmentId !== undefined;
    if (overlapRelevantChange && finalEnrollmentId && finalStatus !== "canceled") {
      try {
        assertNoOverlappingVoucherPeriod({
          vouchers: current.activePlans,
          enrollmentId: finalEnrollmentId.toString(),
          classType: finalClassType,
          validFrom: dateResolution.state.validFrom,
          validUntil: dateResolution.state.validUntil,
          excludeVoucherId: planId,
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

    const queryBase: mongoose.QueryFilter<StudentProfileDoc> = {
      _id: studentObjectId,
      "activePlans._id": planObjectId,
    };
    if (overlapRelevantChange && finalEnrollmentId && finalStatus !== "canceled") {
      queryBase.activePlans = {
        $not: {
          $elemMatch: {
            _id: { $ne: planObjectId },
            enrollmentId: finalEnrollmentId,
            classType: finalClassType,
            status: { $ne: "canceled" },
            validFrom: { $lte: dateResolution.state.validUntil },
            validUntil: { $gte: dateResolution.state.validFrom },
          },
        },
      };
    }
    const query = getStudentOwnershipFilter(user, queryBase);
    if (!query) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }

    const updated = await StudentProfile.findOneAndUpdate(
      query,
      { $set: set },
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error patching plan:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(user, ["teacher", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, planId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(planId) || !mongoose.isValidObjectId(user.id)) {
    return NextResponse.json({ error: "Invalid IDs" }, { status: 400 });
  }

  await dbConnect();
  const studentFilter = getStudentOwnershipFilter(user, {
    _id: new mongoose.Types.ObjectId(id),
    "activePlans._id": new mongoose.Types.ObjectId(planId),
  });
  if (!studentFilter) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
  }
  const updateStudent = await StudentProfile.findOneAndUpdate(
    studentFilter,
    {
      $set: {
        "activePlans.$.status": "canceled",
        "activePlans.$.creditsRemaining": 0,
      },
    },
    { new: true },
  ).lean();

  if (!updateStudent) {
    return NextResponse.json(
      { error: "Alumno o plan no encontrado." },
      { status: 404 },
    );
  }
  return NextResponse.json({ success: true }, { status: 200 });
}
