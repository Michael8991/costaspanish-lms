import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { PlanBillingType, StudentProfile, ClassType } from "@/models/StudentProfile";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongo";

type Ctx = { params: Promise<{ id: string }> }; 

function parseDate(value: unknown) {
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest, { params }: Ctx) {
    const user = await requireAuth(req);
    if (!requireRole(user, ["teacher", "admin"])) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
        return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const billingType = body.billingType as PlanBillingType;
    const classType = body.classType as ClassType;
    
    const validUntil = parseDate(body.validUntil);
    const validFrom = body.validFrom ? parseDate(body.validFrom) : new Date();

    if (!name) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (!["single", "package", "subscription"].includes(String(billingType))) {
        return NextResponse.json({ error: "Invalid billingType" }, { status: 400 });
    }
    if (!["private", "pair", "group_regular", "semi_intensive", "intensive"].includes(String(classType))) {
        return NextResponse.json({ error: "Invalid classType" }, { status: 400 });
    }
    if (!validUntil) return NextResponse.json({ error: "validUntil is required" }, { status: 400 });

    const creditsTotal =
        body.creditsTotal === undefined ? undefined : Number(body.creditsTotal);
    let creditsRemaining =
        body.creditsRemaining === undefined ? undefined : Number(body.creditsRemaining);
    
    if (billingType === "package") {
    if (!Number.isFinite(creditsTotal) || (creditsTotal ?? 0) <= 0) {
      return NextResponse.json({ error: "creditsTotal must be > 0 for package" }, { status: 400 });
    }
    if (!Number.isFinite(creditsRemaining as number)) creditsRemaining = creditsTotal!;
    if ((creditsRemaining as number) > (creditsTotal as number) || (creditsRemaining as number) < 0) {
      return NextResponse.json({ error: "Invalid creditsRemaining" }, { status: 400 });
    }
    }
    
    await dbConnect();

    const plan = {
        name,
        billingType,
        classType,
        validFrom: validFrom ?? new Date(),
        validUntil,
        creditsTotal,
        creditsRemaining,
        status: "active" as const
    }

    const updated = await StudentProfile.findOneAndUpdate(
        {
            _id: id,
            activePlans: { $not: { $elemMatch: { classType, status: "active" } } },
        },
        { $push: { activePlans: plan } },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) return NextResponse.json({ error: "Ya existe un plan activo de este tipo." }, { status: 409 });

    return  NextResponse.json(updated, {status: 201})


}