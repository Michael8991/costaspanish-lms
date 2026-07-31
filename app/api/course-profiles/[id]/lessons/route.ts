import { randomUUID } from "crypto";
import { QueryFilter, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth, requireRole, type Role } from "@/lib/auth/apiAuth";
import { getStudentOwnershipFilter } from "@/lib/auth/studentOwnership";
import {
  CEFR_LEVELS,
  LESSON_BLOCK_TYPES,
  LESSON_SKILLS,
} from "@/lib/constants/lesson.constants";
import { toLessonDetailDTO } from "@/lib/utils/lesson.mapper";
import { createLessonFromCourseSchema } from "@/lib/validators/courseLesson.validator";
import dbConnect from "@/lib/mongo";
import type {
  CefrLevel,
  LessonBlockType,
  LessonSkill,
} from "@/lib/types/lesson";
import { CourseProfile, type ICourseProfile } from "@/models/CourseProfile";
import {
  CourseTemplate,
  type ICourseTemplate,
  type ITemplateBlock,
} from "@/models/CourseTemplate";
import Lesson from "@/models/Lesson";
import { StudentProfile } from "@/models/StudentProfile";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CurrentUser = {
  id: string;
  role: Role;
};

function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

function isLessonBlockType(value: string): value is LessonBlockType {
  return LESSON_BLOCK_TYPES.includes(value as LessonBlockType);
}

function isLessonSkill(value: string): value is LessonSkill {
  return LESSON_SKILLS.includes(value as LessonSkill);
}

function isCefrLevel(value: string): value is CefrLevel {
  return CEFR_LEVELS.includes(value as CefrLevel);
}

function getCourseFilter(
  courseId: Types.ObjectId,
  user: CurrentUser,
): QueryFilter<ICourseProfile> {
  return user.role === "admin"
    ? { _id: courseId }
    : {
        _id: courseId,
        ownerTeacherId: new Types.ObjectId(user.id),
      };
}

function mapTemplateBlock(
  block: ITemplateBlock,
  index: number,
  context: {
    courseId: Types.ObjectId;
    templateId: Types.ObjectId;
    moduleOrder: number;
    lessonOrder: number;
    lessonTitle: string;
    studentIds: Types.ObjectId[];
  },
) {
  const type: LessonBlockType = isLessonBlockType(block.type)
    ? block.type
    : "custom";
  const categories = Array.from(
    new Set([type, ...(block.categories ?? []).filter(isLessonBlockType)]),
  );
  const resourceIds = Array.from(
    new Set((block.resources ?? []).map(String).filter(Types.ObjectId.isValid)),
  ).map((resourceId) => new Types.ObjectId(resourceId));

  return {
    lineageId: randomUUID(),
    order: block.order ?? index,
    title: block.title,
    type,
    categories,
    plannedContent: block.plannedContent?.trim() || block.title,
    actualContent: "",
    plannedObjectives: block.plannedObjectives ?? [],
    achievedObjectives: [],
    estimatedMinutes: block.estimatedMinutes,
    cefrLevels: (block.cefrLevels ?? []).filter(isCefrLevel),
    skills: (block.skills ?? []).filter(isLessonSkill),
    tags: Array.from(
      new Set((block.tags ?? []).map((tag) => tag.trim()).filter(Boolean)),
    ),
    resources: resourceIds,
    completionStatus: "not_completed",
    carryOverToNextLesson: false,
    teacherReflection: "",
    errorCategories: [],
    origin: {
      sourceType: "course_template",
      sourceCourseId: context.courseId,
      sourceTemplateId: context.templateId,
      sourceModuleOrder: context.moduleOrder,
      sourceLessonOrder: context.lessonOrder,
      sourceLessonTitle: context.lessonTitle,
      sourceBlockTitle: block.title,
      sourceStudentIds: context.studentIds,
    },
  };
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid course profile id" },
        { status: 400 },
      );
    }

    const body: unknown = await request.json();
    const parsed = createLessonFromCourseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          details: formatZodError(parsed.error),
        },
        { status: 400 },
      );
    }

    await dbConnect();

    const courseId = new Types.ObjectId(id);
    const courseProfile = (await CourseProfile.findOne(
      getCourseFilter(courseId, user),
    ).lean()) as (ICourseProfile & { _id: Types.ObjectId }) | null;

    if (!courseProfile) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }
    if (courseProfile.status === "archived") {
      return NextResponse.json(
        { error: "Archived courses cannot create lessons" },
        { status: 400 },
      );
    }
    if (!courseProfile.classType) {
      return NextResponse.json(
        { error: "Course classType is missing" },
        { status: 400 },
      );
    }

    const studentIds = courseProfile.studentIds ?? [];
    if (studentIds.length === 0) {
      return NextResponse.json(
        { error: "Course has no students" },
        { status: 400 },
      );
    }

    const studentFilter = getStudentOwnershipFilter(user, {
      _id: { $in: studentIds },
    });
    if (!studentFilter) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 500 });
    }
    const [rawTemplate, existingStudentsCount] = await Promise.all([
      CourseTemplate.findById(courseProfile.templateId).lean(),
      StudentProfile.countDocuments(studentFilter),
    ]);
    const template = rawTemplate as
      | (ICourseTemplate & { _id: Types.ObjectId })
      | null;

    if (!template) {
      return NextResponse.json(
        { error: "Course template not found" },
        { status: 404 },
      );
    }
    if (existingStudentsCount !== studentIds.length) {
      return NextResponse.json(
        { error: "Some students are invalid or not accessible" },
        { status: 400 },
      );
    }

    const templateModule = (template.curriculum?.modules ?? []).find(
      (candidate, index) =>
        (candidate.order ?? index) === parsed.data.moduleOrder,
    );
    const templateLesson = templateModule?.lessons?.find(
      (candidate, index) =>
        (candidate.order ?? index) === parsed.data.lessonOrder,
    );

    if (!templateModule || !templateLesson) {
      return NextResponse.json(
        { error: "Template lesson not found" },
        { status: 404 },
      );
    }

    const teacherId =
      courseProfile.teacherId ?? courseProfile.ownerTeacherId;
    const title =
      parsed.data.titleOverride?.trim() ||
      `${courseProfile.name ?? courseProfile.internalName} · ${templateLesson.title}`;
    const blocks = (templateLesson.blocks ?? []).map((block, index) =>
      mapTemplateBlock(block, index, {
        courseId,
        templateId: template._id,
        moduleOrder: parsed.data.moduleOrder,
        lessonOrder: parsed.data.lessonOrder,
        lessonTitle: templateLesson.title,
        studentIds,
      }),
    );

    const lesson = await Lesson.create({
      teacherId,
      courseId,
      courseTemplateId: template._id,
      courseTemplateVersion: courseProfile.templateVersion,
      sourceTemplateLesson: {
        moduleOrder: parsed.data.moduleOrder,
        lessonOrder: parsed.data.lessonOrder,
        moduleTitle: templateModule.title,
        lessonTitle: templateLesson.title,
      },
      title,
      scheduledStart: parsed.data.scheduledStart,
      scheduledEnd: parsed.data.scheduledEnd,
      timezone: parsed.data.timezone,
      status: "scheduled",
      preparationStatus: "needs_preparation",
      classType: courseProfile.classType,
      isTrial: false,
      attendees: studentIds.map((studentId) => ({
        studentId,
        attendanceStatus: "pending",
        creditsToConsume: 1,
        isTrial: false,
      })),
      blocks,
      preparationNotes: "",
      teacherNotes: "",
      homeworkAssigned: "",
      nextLessonFocus: "",
      creationSource: "template",
      integration: { provider: "manual" },
    });

    return NextResponse.json(
      {
        item: toLessonDetailDTO(lesson.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/course-profiles/[id]/lessons error:", error);
    return NextResponse.json(
      { error: "Failed to create lesson from course" },
      { status: 500 },
    );
  }
}
