import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import type { LessonImportCandidateDTO } from "@/lib/dto/lesson-import.dto";
import type {
  LessonClassType,
  LessonStatus,
} from "@/lib/types/lesson";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import Lesson from "@/models/Lesson";

const querySchema = z.object({
  search: z.string().trim().max(140).default(""),
  status: z.enum(["completed", "scheduled", "all"]).default("completed"),
  limit: z.coerce.number().int().min(1).max(20).default(20),
});

interface CandidateLessonSource {
  _id: unknown;
  title: string;
  scheduledStart?: Date | string;
  scheduledEnd?: Date | string;
  status: LessonStatus;
  classType: LessonClassType;
  attendees?: unknown[];
  blocks?: Array<{
    estimatedMinutes?: number;
    actualMinutes?: number;
    resources?: unknown[];
  }>;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toCandidateDTO(lesson: CandidateLessonSource): LessonImportCandidateDTO {
  const blocks = lesson.blocks ?? [];
  const attendeeCount = lesson.attendees?.length ?? 0;
  const scheduledMinutes =
    lesson.scheduledStart && lesson.scheduledEnd
      ? Math.max(
          0,
          Math.round(
            (new Date(lesson.scheduledEnd).getTime() -
              new Date(lesson.scheduledStart).getTime()) /
              60_000,
          ),
        )
      : 0;
  const estimatedMinutes =
    blocks.reduce(
      (total, block) => total + (block.estimatedMinutes ?? 0),
      0,
    ) || scheduledMinutes || 60;
  const actualMinutes = blocks.reduce(
    (total, block) => total + (block.actualMinutes ?? 0),
    0,
  );
  const resourceIds = new Set(
    blocks
      .flatMap((block) => block.resources ?? [])
      .map(String)
      .filter(Boolean),
  );

  return {
    id: String(lesson._id),
    title: lesson.title,
    scheduledStart: lesson.scheduledStart
      ? new Date(lesson.scheduledStart).toISOString()
      : null,
    status: lesson.status,
    classType: lesson.classType,
    attendeesSummary: `${attendeeCount} ${
      attendeeCount === 1 ? "alumno" : "alumnos"
    }`,
    blocksCount: blocks.length,
    resourcesCount: resourceIds.size,
    estimatedMinutes,
    actualMinutes: actualMinutes > 0 ? actualMinutes : undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsedQuery = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );

    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: "Parámetros de búsqueda no válidos." },
        { status: 400 },
      );
    }

    await dbConnect();

    const currentUserObjectId = getCurrentUserObjectId(user);
    if (user.role !== "admin" && !currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    const { search, status, limit } = parsedQuery.data;
    const filter: Record<string, unknown> = {};

    if (user.role !== "admin") {
      filter.teacherId = currentUserObjectId;
    }
    if (status !== "all") {
      filter.status = status;
    }
    if (search) {
      filter.title = { $regex: escapeRegex(search), $options: "i" };
    }

    const rawItems = await Lesson.find(filter)
      .select({
        title: 1,
        scheduledStart: 1,
        scheduledEnd: 1,
        status: 1,
        classType: 1,
        attendees: 1,
        blocks: 1,
      })
      .sort({ scheduledStart: -1 })
      .limit(limit)
      .lean();
    const items = rawItems as unknown as CandidateLessonSource[];

    return NextResponse.json({
      items: items.map(toCandidateDTO),
    });
  } catch (error) {
    console.error("GET /api/lessons/import-candidates error:", error);
    return NextResponse.json(
      { error: "No se pudieron cargar las clases disponibles." },
      { status: 500 },
    );
  }
}
