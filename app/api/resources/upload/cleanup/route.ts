import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { deleteFirebaseFile } from "@/lib/firebase/deleteFirebaseFile";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest) {
    try {
        const user = await requireAuth(req)
        if (!user) {
            return NextResponse.json({error: "Unauthorized"},{status: 401})
        }

        if (!requireRole(user, ["admin", "teacher"])) {
            return NextResponse.json({error: "Forbidden"}, {status:401})
        }

        const body = await req.json();

        const storagePath = body.storagePath;
        const thumbnailStoragePath = body.thumbnailStoragePath;

        if (storagePath && (typeof storagePath != "string" || !storagePath.startsWith("resources/"))) {
            return NextResponse.json({error: "Invalid storagePath"}, {status: 400})
        }

        if (thumbnailStoragePath && (typeof thumbnailStoragePath !== "string" || !thumbnailStoragePath.startsWith("resources/"))) {
            return NextResponse.json({error: "Invalid ThumbnailStoragepath"}, {status: 400})
        }

        await deleteFirebaseFile(storagePath);
        await deleteFirebaseFile(thumbnailStoragePath); 

        return NextResponse.json({ ok: true });

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown cleanup error"
        return NextResponse.json({error: message}, {status: 500})
    }
}