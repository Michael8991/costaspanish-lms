import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";

import { requireAuth } from "@/lib/auth/apiAuth";
import {
  CourseEnrollmentError,
  courseEnrollmentService,
} from "@/lib/services/course-enrollment.service";
import { enrollStudentSchema } from "@/lib/validators/course-enrollment";
import dbConnect from "@/lib/mongo";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ courseId: string }>;
};

function enrollmentErrorResponse(error: unknown) {
  if (error instanceof CourseEnrollmentError) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("Course enrollment API error:", error);
  return NextResponse.json(
    { success: false, error: "Error interno al gestionar la matrícula." },
    { status: 500 },
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuth(request);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { courseId } = await context.params;
    if (!Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "El identificador del curso no es válido." },
        { status: 400 },
      );
    }

    await dbConnect();
    const data = await courseEnrollmentService.listCourseEnrollments({
      courseId,
      actor,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return enrollmentErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const actor = await requireAuth(request);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { courseId } = await context.params;
    if (!Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "El identificador del curso no es válido." },
        { status: 400 },
      );
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = enrollStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Datos de matrícula no válidos.",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    await dbConnect();
    const data = await courseEnrollmentService.enrollStudentInCourse({
      courseId,
      studentId: parsed.data.studentId,
      actor,
    });

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    return enrollmentErrorResponse(error);
  }
}

