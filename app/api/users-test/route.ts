import dbConnect from "@/lib/mongo";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        await dbConnect();
    
        //?Info: .lean() convierte los documentos de Mongoose a objetos simples de JS (más rápido)
        const users = await User.find().limit(10).lean();

        return NextResponse.json({ ok: true, users });
    } catch (error: unknown) {
        console.error("Error fetching users:", error);
      
        if (error instanceof Error) {
            return NextResponse.json(
                { ok: false, error: error.message },
                { status: 500 }
            );
        }
        return NextResponse.json(
            { ok: false, error: "Error desconocido" },
            { status: 500 }
        );
    }
}
