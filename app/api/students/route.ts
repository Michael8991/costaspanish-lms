import { requireAuth, requireRole } from "@/lib/auth/apiAuth"
import dbConnect from "@/lib/mongo";
import { StudentProfile, StudentProfileDoc } from "@/models/StudentProfile";
import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose";



export async function POST(req: NextRequest){
    const user = await requireAuth(req);
    if (!requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    
    const { fullName, email, name, billingType, classType, validUntil } = body; 
    
    if (!fullName) {
        return NextResponse.json({error: "Full name is required"}, {status: 400})
    }
    if (!email) {
        return NextResponse.json({error: "Email is required"}, {status: 400})
    }
    if (!name) {
        return NextResponse.json({error: "Plan name is required"}, {status: 400})
    }
    if (!billingType) {
        return NextResponse.json({error: "Billing type is required"}, {status: 400})
    }
    if (!classType) {
        return NextResponse.json({error: "Class type is required"}, {status: 400})
    }
    if (!validUntil) {
        return NextResponse.json({error: "Valid until is required"}, {status: 400})
    }

    await dbConnect();

    try {
        const newStudent = await StudentProfile.create({
            email: body.email,
            fullName: body.fullName,
            phone: body.phone,
            country: body.country,
            timezone: body.timezone,
            level: body.level,
            nativeLanguage: body.nativeLanguage,
            goals: body.goals,
            internalNotes: body.internalNotes,

            activePlans: [
                {
                    name: name,
                    billingType: billingType,
                    classType: classType,
                    validUntil: new Date(validUntil),
                    creditsTotal: body.creditsTotal || 0,
                    creditsRemaining: body.creditsRemaining || 0,
                    status: "active"
                }
            ]
        });

        return NextResponse.json(
            { message: "Alumno creado con éxito", student: newStudent },
            { status: 201 }
        );

    } catch (error: unknown) { 
        // Le decimos a TypeScript qué forma ESPERAMOS que tenga el error para que no se queje.
        const mongoError = error as { code?: number; message?: string };

        if (mongoError.code === 11000) {
            return NextResponse.json(
                { error: "Ya existe un alumno con este email." },
                { status: 400 }
            );
        }

        console.error("Error creando alumno:", mongoError.message || error);
        return NextResponse.json(
            { error: "Error interno del servidor al crear el alumno." },
            { status: 500 }
        );
    }
}

export async function GET(req: NextRequest) {
    const user = await requireAuth(req);
    if (!requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } 

    await dbConnect();

    const searchParams = req.nextUrl.searchParams;
    
    const q = (searchParams.get("q") || "").trim();
    const statusPlan = (searchParams.get("statusPlan") || "").trim();
    const academicLevel = (searchParams.get("academicLevel") || "").trim();
    const classType = (searchParams.get("classType") || "").trim();

    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 20)))
    
    const skip = (page - 1) * limit;

   const filter: mongoose.QueryFilter<StudentProfileDoc> = {};

    if (q) {
        filter.fullName = { $regex: q, $options: "i" };
    }

    if (academicLevel) {
        filter.level = academicLevel; 
    }

    if (statusPlan) {
        filter["activePlans.status"] = statusPlan;
    }

    if (classType) {
        filter["activePlans.classType"] = classType;
    }

        const[items, total] = await Promise.all([
            StudentProfile.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        StudentProfile.countDocuments(filter)
    ]);

    return NextResponse.json({
        page,
        limit,
        total,
        items,
    })
}
