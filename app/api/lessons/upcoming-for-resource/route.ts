import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import type {
  UpcomingLessonForResourceDTO,
  UpcomingLessonsForResourceResponse,
} from "@/lib/dto/lesson-resource.dto";
import dbConnect from "@/lib/mongo";
import type {
  LessonBlockType,
  LessonClassType,
  LessonStatus,
} from "@/lib/types/lesson";
import Lesson from "@/models/Lesson";
import { StudentProfile } from "@/models/StudentProfile";
import { Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

interface UpcomingLessonSource {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  title?: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  classType: LessonClassType;
  status: LessonStatus;
  attendees?: Array<{
    studentId: Types.ObjectId;
  }>;
  blocks?: Array<{
    _id?: Types.ObjectId;
    lineageId?: string;
    order?: number;
    title?: string;
    type: LessonBlockType;
    resources?: Types.ObjectId[];
  }>;
}

interface StudentNameSource {
  _id: Types.ObjectId;
  fullName?: string;
  contactEmail?: string;
}

function parseLimit(value: string | null): number {
  const parsed = Number(value ?? 20);

  if (!Number.isInteger(parsed) || parsed < 1) return 20;

  return Math.min(parsed, 50);
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const resourceId = req.nextUrl.searchParams.get("resourceId");

    if (!resourceId || !Types.ObjectId.isValid(resourceId)) {
      return NextResponse.json(
        { ok: false, error: "Invalid resourceId" },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Authenticated user id is not a valid ObjectId" },
        { status: 500 },
      );
    }

    const filter =
      user.role === "teacher"
        ? {
            teacherId: currentUserObjectId,
            scheduledEnd: { $gte: new Date() },
            status: { $in: ["scheduled", "in_progress"] },
          }
        : {
            scheduledEnd: { $gte: new Date() },
            status: { $in: ["scheduled", "in_progress"] },
          };

    const lessons = await Lesson.find(filter)
      .select(
        "teacherId title scheduledStart scheduledEnd classType status attendees.studentId blocks._id blocks.lineageId blocks.order blocks.title blocks.type blocks.resources",
      )
      .sort({ scheduledStart: 1 })
      .limit(parseLimit(req.nextUrl.searchParams.get("limit")))
      .lean<UpcomingLessonSource[]>();

    const studentIds = [
      ...new Set(
        lessons.flatMap((lesson) =>
          (lesson.attendees ?? []).map((attendee) =>
            attendee.studentId.toString(),
          ),
        ),
      ),
    ].map((id) => new Types.ObjectId(id));

    const students =
      studentIds.length === 0
        ? []
        : await StudentProfile.find({ _id: { $in: studentIds } })
            .select("fullName contactEmail")
            .lean<StudentNameSource[]>();
    const studentNamesById = new Map(
      students.map((student) => [
        student._id.toString(),
        student.fullName?.trim() ||
          student.contactEmail?.trim() ||
          "Alumno sin nombre",
      ]),
    );

    const items: UpcomingLessonForResourceDTO[] = lessons.map((lesson) => {
      const blocks = [...(lesson.blocks ?? [])]
        .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
        .map((block, index) => ({
          id: block._id?.toString() ?? block.lineageId ?? `block-${index}`,
          lineageId: block.lineageId,
          order: block.order ?? index,
          title: block.title?.trim() || `Bloque ${index + 1}`,
          type: block.type,
          resourceIds: (block.resources ?? []).map((id) => id.toString()),
        }));
      const resourceBlockTitles = blocks
        .filter((block) => block.resourceIds.includes(resourceId))
        .map((block) => block.title);

      return {
        id: lesson._id.toString(),
        title: lesson.title?.trim() || "Clase sin título",
        scheduledStart: lesson.scheduledStart.toISOString(),
        scheduledEnd: lesson.scheduledEnd.toISOString(),
        classType: lesson.classType,
        status: lesson.status,
        attendeeNames: (lesson.attendees ?? []).map(
          (attendee) =>
            studentNamesById.get(attendee.studentId.toString()) ??
            "Alumno sin nombre",
        ),
        blocks,
        alreadyContainsResource: resourceBlockTitles.length > 0,
        resourceBlockTitles,
      };
    });
    const response: UpcomingLessonsForResourceResponse = { ok: true, items };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error GET /api/lessons/upcoming-for-resource:", error);

    return NextResponse.json(
      { ok: false, error: "Error al obtener las próximas clases" },
      { status: 500 },
    );
  }
}
