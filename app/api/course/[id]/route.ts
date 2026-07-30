import { NextRequest, NextResponse } from "next/server";
import { QueryFilter, Types } from "mongoose";
import { z } from "zod";

import { requireAuth, requireRole, type Role } from "@/lib/auth/apiAuth";
import { toCourseProfileDetailDTO } from "@/lib/utils/course-profile.mapper";
import { updateCourseProfileSchema } from "@/lib/validators/courseProfile.validator";
import dbConnect from "@/lib/mongo";
import {
  CourseProfile,
  type CourseProfileDocument,
  type CourseType,
  type ICourseProfile,
} from "@/models/CourseProfile";
import { StudentProfile, type ClassType } from "@/models/StudentProfile";

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

function toLegacyCourseType(classType: ClassType): CourseType {
  if (classType === "group_regular") return "regular_group";
  if (classType === "semi_intensive") return "semi-intensive_group";
  if (classType === "intensive") return "intensive_group";
  return "private_flexible";
}

function getCourseQuery(
  id: string,
  user: CurrentUser,
): QueryFilter<ICourseProfile> {
  const query: QueryFilter<ICourseProfile> = {
    _id: new Types.ObjectId(id),
  };

  if (user.role !== "admin") {
    query.ownerTeacherId = new Types.ObjectId(user.id);
  }

  return query;
}

async function getAuthorizedUser(request: NextRequest) {
  const user = await requireAuth(request);

  if (!requireRole(user, ["admin", "teacher"])) {
    return null;
  }

  return user;
}

async function findCourse(
  id: string,
  user: CurrentUser,
): Promise<CourseProfileDocument | null> {
  return CourseProfile.findOne(getCourseQuery(id, user));
}

function validateCapacity(classType: ClassType, studentIds: string[]) {
  if (studentIds.length === 0) {
    return "Selecciona al menos un alumno";
  }
  if (classType === "private" && studentIds.length > 1) {
    return "Un curso privado admite como máximo un alumno";
  }
  if (classType === "pair" && studentIds.length > 2) {
    return "Un curso en pareja admite como máximo dos alumnos";
  }
  return null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await dbConnect();
    const course = await CourseProfile.findOne(getCourseQuery(id, user))
      .populate({
        path: "studentIds",
        select: "fullName contactEmail level isActive",
      })
      .lean();

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      item: toCourseProfileDetailDTO(course),
    });
  } catch (error) {
    console.error("GET /api/course/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body: unknown = await request.json();
    const parsed = updateCourseProfileSchema.safeParse(body);

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
    const course = await findCourse(id, user);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const classType = parsed.data.classType ?? course.classType ?? "private";
    const studentIds =
      parsed.data.studentIds ?? (course.studentIds ?? []).map(String);
    const capacityError = validateCapacity(classType, studentIds);

    if (capacityError) {
      return NextResponse.json({ error: capacityError }, { status: 400 });
    }

    if (parsed.data.studentIds) {
      const studentsCount = await StudentProfile.countDocuments({
        _id: {
          $in: parsed.data.studentIds.map(
            (studentId) => new Types.ObjectId(studentId),
          ),
        },
      });

      if (studentsCount !== parsed.data.studentIds.length) {
        return NextResponse.json(
          { error: "One or more students do not exist" },
          { status: 400 },
        );
      }

      course.studentIds = parsed.data.studentIds.map(
        (studentId) => new Types.ObjectId(studentId),
      );
      course.stats.activeEnrollmentCount = parsed.data.studentIds.length;
    }

    if (parsed.data.name !== undefined) {
      course.name = parsed.data.name;
      course.internalName = parsed.data.name;
      course.storefront.publicTitle = parsed.data.name;
    }
    if (parsed.data.status !== undefined) course.status = parsed.data.status;
    if (parsed.data.classType !== undefined) {
      course.classType = parsed.data.classType;
      course.courseType = toLegacyCourseType(parsed.data.classType);
    }
    if (parsed.data.scheduleNotes !== undefined) {
      course.scheduleNotes = parsed.data.scheduleNotes;
    }
    if (parsed.data.internalNotes !== undefined) {
      course.internalNotes = parsed.data.internalNotes;
    }
    if (
      typeof body === "object" &&
      body !== null &&
      "startDate" in body
    ) {
      course.startDate = parsed.data.startDate
        ? new Date(parsed.data.startDate)
        : undefined;
    }
    if (
      typeof body === "object" &&
      body !== null &&
      "targetEndDate" in body
    ) {
      course.targetEndDate = parsed.data.targetEndDate
        ? new Date(parsed.data.targetEndDate)
        : undefined;
    }
    if (parsed.data.progress) {
      course.progress = {
        currentModuleOrder:
          parsed.data.progress.currentModuleOrder ??
          course.progress?.currentModuleOrder ??
          0,
        currentLessonOrder:
          parsed.data.progress.currentLessonOrder ??
          course.progress?.currentLessonOrder ??
          0,
        completedLessonsCount:
          parsed.data.progress.completedLessonsCount ??
          course.progress?.completedLessonsCount ??
          0,
      };
    }

    await course.save();
    await course.populate({
      path: "studentIds",
      select: "fullName contactEmail level isActive",
    });

    return NextResponse.json({
      item: toCourseProfileDetailDTO(course.toObject()),
    });
  } catch (error) {
    console.error("PATCH /api/course/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getAuthorizedUser(request);

    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(user.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await dbConnect();
    const course = await CourseProfile.findOneAndUpdate(
      getCourseQuery(id, user),
      { $set: { status: "archived" } },
      { new: true, runValidators: true },
    );

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Course archived successfully",
      id,
    });
  } catch (error) {
    console.error("DELETE /api/course/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to archive course" },
      { status: 500 },
    );
  }
}
