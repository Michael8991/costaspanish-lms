import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { PlanBillingType, StudentProfile, ClassType } from "@/models/StudentProfile";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongo";
import { revalidatePath } from "next/cache";

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
    const price = Number(body.price);
    
    
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
    if (body.price === undefined || isNaN(price) || price < 0) {
        return NextResponse.json({error: "Price is required and must be a valid number (>= 0)"}, {status: 400});
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
        status: "active" as const,
        price,
    }

    const updated = await StudentProfile.findOneAndUpdate(
        {
            _id: id,
            activePlans: { $not: { $elemMatch: { classType, status: "active" } } },
        },
        { $push: { activePlans: plan } },
        { new: true, runValidators: true }
    ).lean();

    if (!updated) {
        return NextResponse.json({ 
            error: `El alumno ya tiene un plan activo del modelo '${classType}'. Por favor, finaliza o archiva el actual antes de añadir uno nuevo igual.` 
        }, { status: 409 });
    }
    revalidatePath("/", "layout");
    return  NextResponse.json(updated, {status: 201})


}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await requireAuth(req);
        if (!requireRole(user, ["admin", "teacher"])) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { id } = await params;
        if (!mongoose.isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }
    try {
        await dbConnect();
        const student = await StudentProfile.findById(id).select('activePlans').lean();
        if(!student) return NextResponse.json({error: "Student does not found"}, {status: 400})

        const history = (student.activePlans || []).sort((a, b) => 
        new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime()
    );
        if (!history) {
            return NextResponse.json({error: "No Vouchers"}, {status: 404})
        }
        revalidatePath("/", "layout");
        return NextResponse.json(history, {status: 200})
    } catch (error) {
        console.log("Error fetching student voucher:", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}