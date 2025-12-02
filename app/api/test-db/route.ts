import dbConnect from "@/lib/mongo";
import { NextResponse } from "next/server";

export async function GET() {
    await dbConnect();

    return NextResponse.json({
        ok: true,
        db: process.env.MONGO_DB,
    })
}