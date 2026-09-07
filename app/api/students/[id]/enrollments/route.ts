import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import dbConnect from "@/lib/mongo";
import { CourseEnrollment } from "@/models/CourseEnrollment";
import { CourseProfile } from "@/models/CourseProfile";
import { StudentProfile } from "@/models/StudentProfile";
import {
  buildLegacyEnrollmentBulkOperations,
  type EnrollmentCourseRecord,
} from "@/lib/services/course-enrollment.service";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireAuth(request);
  if (!user || !requireRole(user, ["teacher", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: user ? 403 : 401 });
  }
  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
  }
  await dbConnect();
  const ownership = getStudentOwnershipFilter(user, { _id: new Types.ObjectId(id) });
  if (!ownership || !(await StudentProfile.exists(ownership))) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  const studentObjectId = new Types.ObjectId(id);
  // Courses created before CourseEnrollment stored membership in CourseProfile.
  // This lazy, idempotent backfill only converts explicit legacy membership;
  // it never guesses a course from a voucher or its class type.
  const legacyCourses = await CourseProfile.find({
    ...(user.role === "admin" ? {} : { ownerTeacherId: new Types.ObjectId(user.id) }),
    status: { $ne: "archived" },
    $or: [
      { members: { $elemMatch: { studentId: studentObjectId, status: "active" } } },
      { members: { $exists: false }, studentIds: studentObjectId },
      { members: { $size: 0 }, studentIds: studentObjectId },
    ],
  })
    .select("ownerTeacherId status classType createdAt startDate studentIds members.studentId members.status members.joinedAt")
    .lean<EnrollmentCourseRecord[]>();
  const operations = legacyCourses.flatMap(buildLegacyEnrollmentBulkOperations);
  if (operations.length > 0) {
    await CourseEnrollment.bulkWrite(operations, { ordered: false });
  }
  const enrollments = await CourseEnrollment.find({
    studentId: studentObjectId,
    status: "active",
  }).lean();
  const courses = await CourseProfile.find({
    _id: { $in: enrollments.map((item) => item.courseId) },
    status: { $ne: "archived" },
    ...(user.role === "admin" ? {} : { ownerTeacherId: new Types.ObjectId(user.id) }),
  }).select("name internalName status").lean();
  const coursesById = new Map(courses.map((course) => [course._id.toString(), course]));
  return NextResponse.json({
    items: enrollments.flatMap((enrollment) => {
      const course = coursesById.get(enrollment.courseId.toString());
      return course ? [{
        id: enrollment._id.toString(),
        courseId: course._id.toString(),
        courseName: course.name?.trim() || course.internalName,
      }] : [];
    }),
  });
}
