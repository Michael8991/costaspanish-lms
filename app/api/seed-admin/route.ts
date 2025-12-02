import dbConnect from "@/lib/mongo";
import User from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST() {
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
        const password = "Admin1234!";
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
    } catch (error: any) {
        console.error("Error sedding admin:", error);
        return NextResponse.json({ ok: false, error: error.message }, {status: 500})
    }
}