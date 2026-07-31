import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import { toStudentDetailDTO } from "@/lib/dto/student.dto";
import dbConnect from "@/lib/mongo";
import { StudentProfile, StudentProfileDoc } from "@/models/StudentProfile";
import { updateStudentProfileSchema } from "@/lib/validators/student";
import mongoose from "mongoose";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await requireAuth(req);
    if (!user || !requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user?.id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    try {
        await dbConnect();

        const filter = getStudentOwnershipFilter(user, {
            _id: new mongoose.Types.ObjectId(id),
        });
        if (!filter) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
        }
        const student = await StudentProfile.findOne(filter).lean();
        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        return NextResponse.json(toStudentDetailDTO(student));
    } catch (error) {
        console.error("Error fetching student:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, {
    params
}: {
        params: Promise<{ id: string }>;
}) {
    const user = await requireAuth(req);
    if (!user || !requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({error: "Unauthorized"}, {status: 401})
    }

    const { id } = await params;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user?.id)) {
        return NextResponse.json({ error: "Invalid id"}, { status: 400 });
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = updateStudentProfileSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            {
                error: "Invalid student update payload",
                details: parsed.error.issues.map((issue) => ({
                    path: issue.path.join("."),
                    message: issue.message,
                })),
            },
            { status: 400 },
        );
    }

    const payload = parsed.data;

    const patch: mongoose.UpdateQuery<StudentProfileDoc> = {
        $set: {}
    };

    if (payload.fullName !== undefined) patch.$set!.fullName = payload.fullName;
    if (payload.contactEmail !== undefined) {
        const e = payload.contactEmail;
        patch.$set!.contactEmail = e;
        patch.$set!.contactEmailLower = e.toLowerCase();
    }


    if (payload.email !== undefined && payload.contactEmail === undefined) {
        const e = payload.email;
        patch.$set!.contactEmail = e;
        patch.$set!.contactEmailLower = e.toLowerCase();
    }
    if (payload.phone !== undefined) patch.$set!.phone = payload.phone;
    if (payload.country !== undefined) patch.$set!.country = payload.country;
    if (payload.timezone !== undefined) patch.$set!.timezone = payload.timezone;

    if (payload.level !== undefined) patch.$set!.level = payload.level;
    if (payload.nativeLanguage !== undefined) patch.$set!.nativeLanguage = payload.nativeLanguage;
    if (payload.internalNotes !== undefined) patch.$set!.internalNotes = payload.internalNotes;

    if (payload.goals !== undefined) {
        patch.$set!.goals = payload.goals;
    }

    if (payload.isActive !== undefined) {
        patch.$set!.isActive = payload.isActive;
    }

    if (Object.keys(patch.$set!).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await dbConnect();

   try {
    const filter = getStudentOwnershipFilter(user, {
      _id: new mongoose.Types.ObjectId(id),
    });
    if (!filter) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }
    const updated = await StudentProfile.findOneAndUpdate(filter, patch, {
      new: true,
      runValidators: true,
    }).lean();
       
       if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
       revalidatePath("/", "layout");
       return NextResponse.json(toStudentDetailDTO(updated));
    
   } catch {
   
       return NextResponse.json({ error: "Update failed" }, { status: 400 });
   
   }

}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await requireAuth(req);
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!requireRole(user, ["admin", "teacher"])) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user.id)) {
        return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await dbConnect();
    const filter = getStudentOwnershipFilter(user, {
        _id: new mongoose.Types.ObjectId(id),
    });
    if (!filter) {
        return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }

    const archived = await StudentProfile.findOneAndUpdate(
        filter,
        { $set: { isActive: false } },
        { new: true, runValidators: true },
    ).lean();
    if (!archived) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    revalidatePath("/", "layout");
    return NextResponse.json(toStudentDetailDTO(archived));
}
