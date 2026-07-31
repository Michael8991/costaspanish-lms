import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import type {
  LessonClassType,
  LessonPolicySnapshot,
  LessonStatus,
} from "@/lib/types/lesson";
import { normalizeCourseMembers } from "@/lib/utils/course-members";
import { normalizeCourseOperationalPolicies } from "@/lib/utils/course-policies";
import { buildLessonPolicySnapshotFromCoursePolicies } from "@/lib/utils/lesson-policy-snapshot";
import { toLessonDetailDTO } from "@/lib/utils/lesson.mapper";
import { assignLessonToCourseSchema } from "@/lib/validators/lesson-course-link";
import { CourseProfile } from "@/models/CourseProfile";
import Lesson from "@/models/Lesson";

type LessonForCourseLink = {
  _id: Types.ObjectId;
  status: LessonStatus;
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  classType: LessonClassType;
  attendees?: Array<{
    studentId: Types.ObjectId | string;
  }>;
  policySnapshot?: LessonPolicySnapshot;
  creditSettlement?: unknown;
};

export type LessonCourseLinkWarningCode =
  | "lesson_has_students_not_in_course"
  | "course_has_students_not_in_lesson"
  | "lesson_already_completed"
  | "lesson_has_credit_settlement";

type LessonCourseLinkWarning = {
  code: LessonCourseLinkWarningCode;
  message: string;
};

function getOwnedLessonFilter({
  lessonId,
  userRole,
  currentUserObjectId,
}: {
  lessonId: string;
  userRole?: string;
  currentUserObjectId: Types.ObjectId;
}) {
  return userRole === "admin"
    ? { _id: new Types.ObjectId(lessonId) }
    : {
        _id: new Types.ObjectId(lessonId),
        teacherId: currentUserObjectId,
      };
}

function buildMembershipWarnings({
  lesson,
  courseActiveStudentIds,
}: {
  lesson: LessonForCourseLink;
  courseActiveStudentIds: string[];
}): LessonCourseLinkWarning[] {
  const warnings: LessonCourseLinkWarning[] = [];
  const courseStudents = new Set(courseActiveStudentIds);
  const lessonStudents = new Set(
    (lesson.attendees ?? []).map((attendee) =>
      attendee.studentId.toString(),
    ),
  );

  if (
    Array.from(lessonStudents).some(
      (studentId) => !courseStudents.has(studentId),
    )
  ) {
    warnings.push({
      code: "lesson_has_students_not_in_course",
      message:
        "Esta clase tiene alumnos que no pertenecen actualmente al curso.",
    });
  }

  if (
    Array.from(courseStudents).some(
      (studentId) => !lessonStudents.has(studentId),
    )
  ) {
    warnings.push({
      code: "course_has_students_not_in_lesson",
      message:
        "El curso tiene integrantes activos que no aparecen en esta clase.",
    });
  }

  if (lesson.status === "completed") {
    warnings.push({
      code: "lesson_already_completed",
      message:
        "La clase ya estaba completada; no se han recalculado créditos.",
    });
  }

  if (lesson.creditSettlement !== undefined && lesson.creditSettlement !== null) {
    warnings.push({
      code: "lesson_has_credit_settlement",
      message:
        "La clase ya tiene liquidación de créditos; no se ha modificado.",
    });
  }

  return warnings;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid lesson id" },
        { status: 400 },
      );
    }

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 400 },
      );
    }

    const parsed = assignLessonToCourseSchema.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid course link payload",
          issues: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const lessonFilter = getOwnedLessonFilter({
      lessonId: id,
      userRole: user.role,
      currentUserObjectId,
    });
    const courseFilter =
      user.role === "admin"
        ? {
            _id: new Types.ObjectId(parsed.data.courseId),
            status: { $ne: "archived" },
          }
        : {
            _id: new Types.ObjectId(parsed.data.courseId),
            ownerTeacherId: currentUserObjectId,
            status: { $ne: "archived" },
          };

    const [lesson, course] = await Promise.all([
      Lesson.findOne(lessonFilter).lean<LessonForCourseLink>(),
      CourseProfile.findOne(courseFilter).lean(),
    ]);

    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 },
      );
    }

    if (!course) {
      return NextResponse.json(
        { error: "Course not found or unavailable" },
        { status: 404 },
      );
    }

    const courseMembers = normalizeCourseMembers({
      members: course.members,
      legacyStudentIds: course.studentIds,
      fallbackJoinedAt: course.startDate ?? course.createdAt,
    });

    if (courseMembers.length === 0) {
      return NextResponse.json(
        { error: "This course has no members" },
        { status: 400 },
      );
    }

    const activeStudentIds = courseMembers
      .filter((member) => member.status === "active")
      .map((member) => member.studentId);
    const warnings = buildMembershipWarnings({
      lesson,
      courseActiveStudentIds: activeStudentIds,
    });
    const policies = normalizeCourseOperationalPolicies(course.policies);
    const durationMinutes = Math.max(
      1,
      Math.round(
        (new Date(lesson.scheduledEnd).getTime() -
          new Date(lesson.scheduledStart).getTime()) /
          60_000,
      ),
    );
    const shouldReplaceSnapshot =
      parsed.data.policySnapshotMode === "replace_from_course";
    const shouldCopyMissingSnapshot =
      parsed.data.policySnapshotMode === "copy_from_course_if_missing" &&
      !lesson.policySnapshot &&
      (lesson.status === "scheduled" || lesson.status === "in_progress");
    const set: Record<string, unknown> = {
      courseId: course._id,
      courseTemplateId: course.templateId,
      courseTemplateVersion: course.templateVersion,
      courseLink: {
        relationType: parsed.data.relationType,
        linkedAt: new Date(),
        linkedBy: currentUserObjectId,
        notes: parsed.data.notes,
        sourceTemplateLesson: parsed.data.sourceTemplateLesson,
      },
      updatedAt: new Date(),
    };

    if (shouldReplaceSnapshot || shouldCopyMissingSnapshot) {
      set.policySnapshot = buildLessonPolicySnapshotFromCoursePolicies({
        policies,
        durationMinutes,
        timezone: lesson.timezone,
        classType: lesson.classType,
      });
    }

    const updatedLesson = await Lesson.findOneAndUpdate(
      lessonFilter,
      { $set: set },
      { new: true },
    )
      .populate({ path: "courseId", select: "name internalName classType" })
      .lean<Parameters<typeof toLessonDetailDTO>[0]>();

    if (!updatedLesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: toLessonDetailDTO(updatedLesson),
      warnings,
    });
  } catch (error) {
    console.error("PATCH /api/lessons/[id]/course-link error:", error);
    return NextResponse.json(
      { error: "Failed to assign lesson to course" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid lesson id" },
        { status: 400 },
      );
    }

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 400 },
      );
    }

    await dbConnect();

    const lessonFilter = getOwnedLessonFilter({
      lessonId: id,
      userRole: user.role,
      currentUserObjectId,
    });
    const updatedLesson = await Lesson.findOneAndUpdate(
      lessonFilter,
      {
        $unset: {
          courseId: 1,
          courseTemplateId: 1,
          courseTemplateVersion: 1,
          courseLink: 1,
        },
        $set: { updatedAt: new Date() },
      },
      { new: true },
    ).lean<Parameters<typeof toLessonDetailDTO>[0]>();

    if (!updatedLesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      item: toLessonDetailDTO(updatedLesson),
    });
  } catch (error) {
    console.error("DELETE /api/lessons/[id]/course-link error:", error);
    return NextResponse.json(
      { error: "Failed to unlink lesson from course" },
      { status: 500 },
    );
  }
}
