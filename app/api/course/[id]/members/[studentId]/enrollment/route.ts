import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import dbConnect from "@/lib/mongo";
import { COURSE_ENROLLMENT_REQUIRED_MESSAGE } from "@/lib/utils/lesson-quick-voucher";
import { CourseEnrollment } from "@/models/CourseEnrollment";
import { CourseProfile } from "@/models/CourseProfile";

type Context = {
  params: Promise<{ id: string; studentId: string }>;
};

export async function GET(request: NextRequest, { params }: Context) {
  const user = await requireAuth(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireRole(user, ["teacher", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, studentId } = await params;
  if (
    !Types.ObjectId.isValid(id) ||
    !Types.ObjectId.isValid(studentId) ||
    !Types.ObjectId.isValid(user.id)
  ) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  await dbConnect();
  const course = await CourseProfile.findOne({
    _id: new Types.ObjectId(id),
    ...(user.role === "admin"
      ? {}
      : { ownerTeacherId: new Types.ObjectId(user.id) }),
  })
    .select("name internalName")
    .lean();
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const enrollment = await CourseEnrollment.findOne({
    courseId: course._id,
    studentId: new Types.ObjectId(studentId),
    status: "active",
  })
    .select("_id courseId studentId status")
    .lean();
  if (!enrollment) {
    return NextResponse.json(
      { error: COURSE_ENROLLMENT_REQUIRED_MESSAGE },
      { status: 404 },
    );
  }

  return NextResponse.json({
    item: {
      id: enrollment._id.toString(),
      courseId: enrollment.courseId.toString(),
      courseName: course.name?.trim() || course.internalName,
    },
  });
}
