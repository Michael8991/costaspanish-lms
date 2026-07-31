import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import dbConnect from "@/lib/mongo";
import { StudentProfile } from "@/models/StudentProfile";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

type Ctx = { params: Promise<{ id: string, planId: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
    const user = await requireAuth(req);
    if (!user || !requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, planId } = await params;
    
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user.id)) return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    if (!mongoose.isValidObjectId(planId)) return NextResponse.json({ error: "Invalid planId" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
  const amount = Math.max(1, Number(body.amount ?? 1));

  await dbConnect();

  // 1) Decremento atómico solo si hay créditos suficientes y está activo
  const planObjectId = new mongoose.Types.ObjectId(planId);
  const ownershipFilter = getStudentOwnershipFilter(user, {
    _id: new mongoose.Types.ObjectId(id),
  });
  if (!ownershipFilter) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
  }

  const dec = await StudentProfile.updateOne(
    {
      ...ownershipFilter,
      activePlans: {
        $elemMatch: {
          _id: planObjectId,
          status: "active",
          creditsRemaining: { $gte: amount },
        },
      },
    },
    { $inc: { "activePlans.$.creditsRemaining": -amount } }
  );

  if (dec.modifiedCount === 0) {
    return NextResponse.json(
      { error: "Cannot consume: plan not active, not found, or insufficient credits" },
      { status: 400 }
    );
  }

  // 2) Si llega a 0, márcalo como exhausted (segunda operación, MVP)
  const updated = await StudentProfile.findOne({ ...ownershipFilter, "activePlans._id": planObjectId }).lean();
  if (!updated) return NextResponse.json({ error: "Not found after update" }, { status: 404 });

  const plan = updated.activePlans.find((p) => String(p._id) === String(planId));
  if (plan && Number(plan.creditsRemaining) === 0 && plan.status === "active") {
    await StudentProfile.updateOne(
      { ...ownershipFilter, "activePlans._id": planObjectId },
      { $set: { "activePlans.$.status": "exhausted" } }
    );
  }

  const fresh = await StudentProfile.findOne(ownershipFilter).lean();
  return NextResponse.json(fresh);

}
