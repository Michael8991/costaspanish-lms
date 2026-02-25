import { requireAuth, requireRole } from "@/lib/auth/apiAuth"
import dbConnect from "@/lib/mongo";
import { StudentProfile } from "@/models/StudentProfile";
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest){
    const user = await requireAuth(req);
    if (!requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    
    const { fullName, email, name, billingType, classType, validUntil } = body; //? Si estoy creando no puedo meter userId como requerido en estas validaciones no?

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
