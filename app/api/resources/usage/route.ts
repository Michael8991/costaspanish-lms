import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import Lesson from "@/models/Lesson";

const objectIdSchema = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), {
    message: "Invalid ObjectId",
  });

const resourceUsageRequestSchema = z.object({
  resourceIds: z.array(objectIdSchema).max(100),
  studentIds: z.array(objectIdSchema).max(50),
  beforeDate: z.string().datetime(),
  excludeLessonId: objectIdSchema.optional(),
});

type UsageRawAttendee = {
  studentId?: Types.ObjectId | string;
  attendanceStatus?: string;
};

type UsageRawBlock = {
  resources?: Array<Types.ObjectId | string>;
};

type UsageRawLesson = {
  title: string;
  scheduledStart: Date;
  attendees?: UsageRawAttendee[];
  blocks?: UsageRawBlock[];
};

type ResourceUsageAccumulator = {
  resourceId: string;
  timesSeen: number;
  lastSeenAt: string;
  lastSeenLessonTitle: string;
  seenByStudentIds: Set<string>;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const parsed = resourceUsageRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid resource usage request" },
        { status: 400 },
      );
    }

    const resourceIds = Array.from(new Set(parsed.data.resourceIds));
    const studentIds = Array.from(new Set(parsed.data.studentIds));
    const beforeDate = new Date(parsed.data.beforeDate);

    if (resourceIds.length === 0 || studentIds.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (user.role !== "admin" && !currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    const resourceObjectIds = resourceIds.map(
      (resourceId) => new Types.ObjectId(resourceId),
    );
    const studentObjectIds = studentIds.map(
      (studentId) => new Types.ObjectId(studentId),
    );
    const filter: Record<string, unknown> = {
      status: "completed",
      scheduledStart: { $lt: beforeDate },
      attendees: {
        $elemMatch: {
          studentId: { $in: studentObjectIds },
          attendanceStatus: "attended",
        },
      },
      "blocks.resources": { $in: resourceObjectIds },
    };

    if (user.role !== "admin") {
      filter.teacherId = currentUserObjectId;
    }

    if (parsed.data.excludeLessonId) {
      filter._id = {
        $ne: new Types.ObjectId(parsed.data.excludeLessonId),
      };
    }

    await dbConnect();

    const lessons = await Lesson.find(filter)
      .select("title scheduledStart attendees.studentId attendees.attendanceStatus blocks.resources")
      .sort({ scheduledStart: -1 })
      .limit(500)
      .lean<UsageRawLesson[]>();
    const requestedResourceIds = new Set(resourceIds);
    const requestedStudentIds = new Set(studentIds);
    const usageByResourceId = new Map<string, ResourceUsageAccumulator>();

    lessons.forEach((lesson) => {
      const seenByStudentIds = (lesson.attendees ?? [])
        .filter(
          (attendee) =>
            attendee.attendanceStatus === "attended" &&
            attendee.studentId !== undefined &&
            requestedStudentIds.has(attendee.studentId.toString()),
        )
        .map((attendee) => attendee.studentId?.toString())
        .filter((studentId): studentId is string => Boolean(studentId));
      const lessonResourceIds = new Set(
        (lesson.blocks ?? [])
          .flatMap((block) => block.resources ?? [])
          .map(String)
          .filter((resourceId) => requestedResourceIds.has(resourceId)),
      );

      lessonResourceIds.forEach((resourceId) => {
        const existingUsage = usageByResourceId.get(resourceId);

        if (existingUsage) {
          existingUsage.timesSeen += 1;
          seenByStudentIds.forEach((studentId) =>
            existingUsage.seenByStudentIds.add(studentId),
          );
          return;
        }

        usageByResourceId.set(resourceId, {
          resourceId,
          timesSeen: 1,
          lastSeenAt: new Date(lesson.scheduledStart).toISOString(),
          lastSeenLessonTitle: lesson.title,
          seenByStudentIds: new Set(seenByStudentIds),
        });
      });
    });

    return NextResponse.json({
      items: Array.from(usageByResourceId.values()).map((usage) => ({
        ...usage,
        seenByStudentIds: Array.from(usage.seenByStudentIds),
      })),
    });
  } catch (error) {
    console.error("Error en POST /api/resources/usage:", error);

    return NextResponse.json(
      { error: "Error al consultar el uso de recursos" },
      { status: 500 },
    );
  }
}
