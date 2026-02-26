import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import {
  ClassType,
  PlanBillingType,
  PlanStatus,
  StudentProfile,
  StudentProfileDoc,
} from "@/models/StudentProfile";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: { id: string; planId: string } | Promise<{ id: string; planId: string }> };

type PlanSetPath =
  | "activePlans.$.name"
  | "activePlans.$.billingType"
  | "activePlans.$.classType"
  | "activePlans.$.validFrom"
  | "activePlans.$.validUntil"
  | "activePlans.$.creditsTotal"
  | "activePlans.$.creditsRemaining"
  | "activePlans.$.status";

type PlanSetValue = string | number | Date;
type PlanSet = Partial<Record<PlanSetPath, PlanSetValue>>;

function parseDate(value: unknown) {
  if (value === undefined || value === null) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isClassType(v: unknown): v is ClassType {
  return v === "private" || v === "pair" || v === "group_regular" || v === "semi_intensive" || v === "intensive";
}

function isPlanBillingType(v: unknown): v is PlanBillingType {
  return v === "single" || v === "package" || v === "subscription";
}

function isPlanStatus(v: unknown): v is PlanStatus {
  return v === "active" || v === "exhausted" || v === "expired" || v === "canceled";
}

type PlanActiveConflictGuard = {
  $not: {
    $elemMatch: {
      _id: { $ne: mongoose.Types.ObjectId };
      classType: ClassType;
      status: "active";
    };
  };
};

type PatchQuery = mongoose.QueryFilter<StudentProfileDoc> & {
  _id: mongoose.Types.ObjectId;
  "activePlans._id": mongoose.Types.ObjectId;
  activePlans?: PlanActiveConflictGuard;
};

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth(req);
    if (!requireRole(user, ["teacher", "admin"])) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, planId } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }
    if (!mongoose.isValidObjectId(planId)) {
      return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const set: PlanSet = {};

    if (typeof body.name === "string") set["activePlans.$.name"] = body.name.trim();

    if (body.billingType !== undefined) {
      if (!isPlanBillingType(body.billingType)) {
        return NextResponse.json({ error: "Invalid billingType" }, { status: 400 });
      }
      set["activePlans.$.billingType"] = body.billingType;
    }

    if (body.classType !== undefined) {
      if (!isClassType(body.classType)) {
        return NextResponse.json({ error: "Invalid classType" }, { status: 400 });
      }
      set["activePlans.$.classType"] = body.classType;
    }

    if (body.status !== undefined) {
      if (!isPlanStatus(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      set["activePlans.$.status"] = body.status;
    }

    if (body.validFrom !== undefined) {
      const d = parseDate(body.validFrom);
      if (!d) return NextResponse.json({ error: "Invalid validFrom" }, { status: 400 });
      set["activePlans.$.validFrom"] = d;
    }

    if (body.validUntil !== undefined) {
      const d = parseDate(body.validUntil);
      if (!d) return NextResponse.json({ error: "Invalid validUntil" }, { status: 400 });
      set["activePlans.$.validUntil"] = d;
    }

    if (body.creditsTotal !== undefined) {
      const n = Number(body.creditsTotal);
      if (!Number.isFinite(n)) return NextResponse.json({ error: "creditsTotal must be a number" }, { status: 400 });
      set["activePlans.$.creditsTotal"] = n;
    }

    if (body.creditsRemaining !== undefined) {
      const n = Number(body.creditsRemaining);
      if (!Number.isFinite(n)) return NextResponse.json({ error: "creditsRemaining must be a number" }, { status: 400 });
      set["activePlans.$.creditsRemaining"] = n;
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: "No valid fields provided to update" }, { status: 400 });
    }

    await dbConnect();

    const planObjectId = new mongoose.Types.ObjectId(planId);
    const studentObjectId = new mongoose.Types.ObjectId(id);


    let finalStatus: PlanStatus | undefined =
      typeof set["activePlans.$.status"] === "string" ? (set["activePlans.$.status"] as PlanStatus) : undefined;

    let finalClassType: ClassType | undefined =
      typeof set["activePlans.$.classType"] === "string" ? (set["activePlans.$.classType"] as ClassType) : undefined;

   
    const needsCurrent =
      (finalStatus === "active" && !finalClassType) || 
      (!!finalClassType && !finalStatus);

    if (needsCurrent) {
      const current = await StudentProfile.findOne(
        { _id: studentObjectId, "activePlans._id": planObjectId },
        { activePlans: { $elemMatch: { _id: planObjectId } } }
      ).lean();

      if (!current || !current.activePlans?.length) {
        return NextResponse.json({ error: "Student or specific plan not found" }, { status: 404 });
      }

      const currentPlan = current.activePlans[0];
      if (!finalStatus) finalStatus = currentPlan.status;
      if (!finalClassType) finalClassType = currentPlan.classType;
    }

    const query: PatchQuery = {
      _id: studentObjectId,
      "activePlans._id": planObjectId,
    };

    // Aplica el guard SOLO si el plan va a quedar activo y tenemos classType final
    if (finalStatus === "active" && finalClassType) {
      query.activePlans = {
        $not: {
          $elemMatch: {
            _id: { $ne: planObjectId },
            classType: finalClassType,
            status: "active",
          },
        },
      };
    }

    const updated = await StudentProfile.findOneAndUpdate(query, { $set: set }, { new: true, runValidators: true }).lean();

    if (!updated) {
      const exists = await StudentProfile.exists({ _id: studentObjectId, "activePlans._id": planObjectId });
      return NextResponse.json(
        { error: exists ? "Conflict: already an active plan with same classType" : "Not found" },
        { status: exists ? 409 : 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error patching plan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}