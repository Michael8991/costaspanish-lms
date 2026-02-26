import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { StudentProfile, StudentProfileDoc } from "@/models/StudentProfile";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, {
    params
}: {
        params: Promise<{ id: string }>;
}) {
    const user = await requireAuth(req);
    if (!requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401})
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
        return NextResponse.json({ error: "Invalid id"}, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const patch: mongoose.UpdateQuery<StudentProfileDoc> = {
        $set: {}
    };

    if (typeof body.fullName === "string") patch.$set!.fullName = body.fullName.trim();
    if (typeof body.email === "string") patch.$set!.email = body.email.trim().toLowerCase();
    if (typeof body.phone === "string") patch.$set!.phone = body.phone.trim();
    if (typeof body.country === "string") patch.$set!.country = body.country.trim();
    if (typeof body.timezone === "string") patch.$set!.timezone = body.timezone.trim();

    if (typeof body.level === "string") patch.$set!.level = body.level.trim();
    if (typeof body.nativeLanguage === "string") patch.$set!.nativeLanguage = body.nativeLanguage.trim();
    if (typeof body.internalNotes === "string") patch.$set!.internalNotes = body.internalNotes;

    if (Array.isArray(body.goals)) {
        patch.$set!.goals = body.goals;
    }

    if (typeof body.isActive === "boolean") {
        patch.$set!.isActive = body.isActive;
    }

    if (Object.keys(patch.$set!).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await dbConnect();

   try {
    const updated = await StudentProfile.findByIdAndUpdate(id, patch, {
      new: true,
      runValidators: true,
    }).lean();
       
       if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
       return NextResponse.json(updated);
    
   } catch {
   
       return NextResponse.json({ error: "Update failed" }, { status: 400 });
   
   }

    }
