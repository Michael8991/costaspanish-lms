import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import { StudentProfile } from "@/models/StudentProfile";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "La creación de bonos desde la ficha del alumno está deshabilitada.",
      code: "student_voucher_creation_disabled",
    },
    { status: 403 },
  );
}

export async function GET(
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

  try {
    const { default: dbConnect } = await import("@/lib/mongo");
    await dbConnect();
    const studentFilter = getStudentOwnershipFilter(user, {
      _id: new mongoose.Types.ObjectId(id),
    });
    if (!studentFilter) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }
    const student = await StudentProfile.findOne(studentFilter)
      .select("activePlans")
      .lean();
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 },
      );
    }

    const history = [...(student.activePlans ?? [])].sort(
      (first, second) =>
        new Date(second.validFrom).getTime() -
        new Date(first.validFrom).getTime(),
    );
    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    console.error("Error fetching student voucher:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
