import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { toCourseProfileDetailDTO } from "@/lib/utils/course-profile.mapper";
import { toCourseTemplateDetailDTO } from "@/lib/utils/course-template.mapper";
import { createCourseProfileSchema } from "@/lib/validators/courseProfile.validator";
import dbConnect from "@/lib/mongo";
import { CourseProfile, type CourseType } from "@/models/CourseProfile";
import { CourseTemplate } from "@/models/CourseTemplate";
import { StudentProfile, type ClassType } from "@/models/StudentProfile";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function toLegacyCourseType(classType: ClassType): CourseType {
  if (classType === "group_regular") return "regular_group";
  if (classType === "semi_intensive") return "semi-intensive_group";
  if (classType === "intensive") return "intensive_group";
  return "private_flexible";
}

function createCourseCode(templateCode: string, courseId: Types.ObjectId) {
  const suffix = courseId.toHexString().slice(-8).toUpperCase();
  const base = templateCode
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]+/g, "-")
    .slice(0, 50);

  return `${base || "COURSE"}-${suffix}`;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);

    if (!user || !requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid course template id" },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();
    const parsed = createCourseProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: formatZodError(parsed.error),
        },
        { status: 400 },
      );
    }

    if (parsed.data.templateId !== id) {
      return NextResponse.json(
        { error: "templateId does not match the route" },
        { status: 400 },
      );
    }

    await dbConnect();

    const templateObjectId = new Types.ObjectId(id);
    const teacherObjectId = new Types.ObjectId(user.id);
    const templateQuery =
      user.role === "admin"
        ? { _id: templateObjectId }
        : { _id: templateObjectId, ownerTeacherId: teacherObjectId };
    const template = await CourseTemplate.findOne(templateQuery).lean();

    if (!template || template.status === "archived") {
      return NextResponse.json(
        { error: "Course template not found" },
        { status: 404 },
      );
    }

    const studentObjectIds = parsed.data.studentIds.map(
      (studentId) => new Types.ObjectId(studentId),
    );
    const students = await StudentProfile.find({
      _id: { $in: studentObjectIds },
    })
      .select("_id")
      .lean();

    if (students.length !== studentObjectIds.length) {
      return NextResponse.json(
        { error: "One or more students do not exist" },
        { status: 400 },
      );
    }

    const templateDTO = toCourseTemplateDetailDTO(template);
    const courseId = new Types.ObjectId();
    const course = await CourseProfile.create({
      _id: courseId,
      ownerTeacherId: teacherObjectId,
      teacherId: teacherObjectId,
      templateId: templateObjectId,
      templateVersion: template.version,
      code: createCourseCode(template.code, courseId),
      internalName: parsed.data.name,
      description: "",
      status: parsed.data.status,
      visibility: "private",
      courseType: toLegacyCourseType(parsed.data.classType),
      consumptionPolicies: {
        attendance: { outcome: "consume", creditsToConsume: 1 },
        noShow: { outcome: "consume", creditsToConsume: 1 },
        teacherCancellation: {
          outcome: "reschedule",
          creditsToConsume: 0,
        },
        studentCancellationRules: [],
      },
      storefront: {
        isPublished: false,
        publicTitle: parsed.data.name,
        shortDescription:
          template.storefront.shortDescription ||
          `Curso basado en ${template.internalName}`,
        benefits: [],
        priceMode: "custom_label",
        priceOptions: [],
        currency: "EUR",
      },
      publicationMeta: {
        enrollmentOpen: false,
      },
      stats: {
        activeEnrollmentCount: studentObjectIds.length,
        lessonCount: 0,
      },
      name: parsed.data.name,
      classType: parsed.data.classType,
      studentIds: studentObjectIds,
      startDate: parsed.data.startDate
        ? new Date(parsed.data.startDate)
        : undefined,
      targetEndDate: parsed.data.targetEndDate
        ? new Date(parsed.data.targetEndDate)
        : undefined,
      scheduleNotes: parsed.data.scheduleNotes,
      internalNotes: parsed.data.internalNotes,
      progress: {
        currentModuleOrder: 0,
        currentLessonOrder: 0,
        completedLessonsCount: 0,
      },
      templateSnapshot: {
        templateId: templateDTO.id,
        code: templateDTO.code,
        internalName: templateDTO.internalName,
        version: templateDTO.version,
        level: templateDTO.pedagogicalMeta.level,
        category: templateDTO.pedagogicalMeta.category,
        curriculumStats: templateDTO.stats,
      },
    });

    await course.populate({
      path: "studentIds",
      select: "fullName contactEmail level isActive",
    });

    return NextResponse.json(
      { item: toCourseProfileDetailDTO(course.toObject()) },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/course-template/[id]/create-course error:",
      error,
    );
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 },
    );
  }
}
