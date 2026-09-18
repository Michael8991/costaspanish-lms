import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import dbConnect from "@/lib/mongo";
import { validateVoucherEnrollment, VoucherDomainError } from "@/lib/services/voucher.service";
import { updateStudentVoucherSchema } from "@/lib/validators/voucher";
import {
  StudentProfile,
  type PlanStatus,
  type StudentProfileDoc,
} from "@/models/StudentProfile";
import { toCents } from "@/lib/utils/money";

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
    const current = await StudentProfile.findOne(
      currentFilter,
      { activePlans: { $elemMatch: { _id: planObjectId } } },
    ).lean();

    if (!current?.activePlans?.length) {
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
    const currentPlan = current.activePlans[0];
    const finalCreditsTotal = payload.creditsTotal ?? currentPlan.creditsTotal;
    const finalCreditsRemaining =
      payload.creditsRemaining ?? currentPlan.creditsRemaining;
    const finalValidFrom = payload.validFrom ?? currentPlan.validFrom;
    const finalValidUntil = payload.validUntil ?? currentPlan.validUntil;
    const finalBillingPeriodStart =
      payload.billingPeriodStart === undefined
        ? currentPlan.billingPeriodStart
        : payload.billingPeriodStart;
    const finalBillingPeriodEnd =
      payload.billingPeriodEnd === undefined
        ? currentPlan.billingPeriodEnd
        : payload.billingPeriodEnd;

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
    if (new Date(finalValidUntil) < new Date(finalValidFrom)) {
      return NextResponse.json(
        { error: "validUntil cannot be before validFrom" },
        { status: 400 },
      );
    }
    if (
      finalBillingPeriodStart &&
      finalBillingPeriodEnd &&
      finalBillingPeriodEnd < finalBillingPeriodStart
    ) {
      return NextResponse.json(
        { error: "billingPeriodEnd cannot be before billingPeriodStart" },
        { status: 400 },
      );
    }

    const set: Record<string, unknown> = {};
    const directFields = [
      "name",
      "billingType",
      "classType",
      "validFrom",
      "validUntil",
      "creditsTotal",
      "creditsRemaining",
      "status",
      "courseNameSnapshot",
      "generatedFromCourse",
      "generatedFromCourseMember",
      "billingMode",
      "billingPeriodStart",
      "billingPeriodEnd",
      "billingAnchorDay",
    ] as const;

    for (const field of directFields) {
      if (payload[field] !== undefined) {
        set[`activePlans.$.${field}`] = payload[field];
      }
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

    let finalStatus: PlanStatus = payload.status ?? currentPlan.status;
    if (finalStatus !== "canceled") {
      if (new Date(finalValidUntil) < new Date()) finalStatus = "expired";
      else if (finalCreditsRemaining === 0) finalStatus = "exhausted";
      else finalStatus = "active";
      set["activePlans.$.status"] = finalStatus;
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided to update" },
        { status: 400 },
      );
    }

    const queryBase: mongoose.QueryFilter<StudentProfileDoc> = {
      _id: studentObjectId,
      "activePlans._id": planObjectId,
    };
    const finalClassType = payload.classType ?? currentPlan.classType;
    if (finalStatus === "active") {
      queryBase.activePlans = {
        $not: {
          $elemMatch: {
            _id: { $ne: planObjectId },
            classType: finalClassType,
            status: "active",
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
        { error: "Conflict: already an active plan with same classType" },
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
