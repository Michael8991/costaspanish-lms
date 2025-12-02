import dbConnect from "@/lib/mongo";
import User from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";



export async function POST() {

    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json(
            { ok: false, message: "Esta ruta solo está disponible en modo desarrollo" },
            { status: 403 } // 403 Forbidden
        );
    }

    try {
        await dbConnect();

        const adminEmail = "admin@costaspanishclass.com"
        const existingAdming = await User.findOne({ email: adminEmail })
        if (existingAdming) {
            return NextResponse.json({
                ok: true,
                message: "Admin already exists",
            });
        }

        const password = process.env.MONGO_PSW_ADMIN_TEST;
        if (!password) {
             throw new Error("❌ FALTA LA VARIABLE DE ENTORNO: MONGO_PSW_ADMIN_TEST");
        }
        const passwordHash = await bcrypt.hash(password, 10);

        const admin = await User.create({
            name: "Admin CostaSpanish",
            email: adminEmail,
            passwordHash,
            role: "admin",
            preferredLanguage: "es",
        });
        return NextResponse.json({
            ok: true,
            message: "Admin created",
            admin: {
                id: admin._id,
                email: admin.email,
                role: admin.role,
            },
            devCredentials: {
                email: adminEmail,
                password,
            }
        });
    } catch (error: unknown) {
        console.error("Error seeding admin:", error);
        
        if (error instanceof Error) {
             return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ok: false, error: "Error desconocido" }, { status: 500 });
    }
}