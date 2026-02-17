import dbConnect from "@/lib/mongo";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        await dbConnect();

        try {
            const body = await req.json()
            
            const email = body.email
            const password = body.password
            const emailstr = typeof email;
            const passwordstr = typeof password;
    
            if (emailstr === "string") {
                if (passwordstr === "string") {                    
                    if (email.trim().length === 0 || password.trim().length === 0) {   
                        return NextResponse.json(
                            { ok: false, message: "Incorrect credencials" },
                            { status: 400 }
                        );
                    } else {
                        // caso positivo
                    }
                    
                }
            } else {
                return NextResponse.json(
                    { ok: false, message: "Incorrect credencials" },
                    { status: 400 }
                );
            }
            
        } catch {
            
        }

    } catch {
        
    }
}