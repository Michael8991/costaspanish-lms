import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import type { LessonBlockType } from "@/lib/types/lesson";
import { normalizeLessonBlockCategories } from "@/lib/utils/lesson-block-categories";
import Lesson from "@/models/Lesson";

const pendingBlocksRequestSchema = z.object({
  courseId: z.string().trim().optional(),
  studentIds: z.array(z.string().trim()).default([]),
  excludeLessonId: z.string().trim().optional(),
  referenceDate: z.string().trim().optional(),
});

type PendingRawAttendee = {
  studentId?: Types.ObjectId | string;
};

type PendingRawBlock = {
  _id?: Types.ObjectId;
  lineageId?: string;
  title: string;
  type: LessonBlockType;
  categories?: LessonBlockType[];
  cefrLevels?: string[];
  skills?: string[];
  tags?: string[];
  resources?: Array<Types.ObjectId | string>;
  plannedContent: string;
  estimatedMinutes?: number;
  plannedObjectives?: string[];
  nextStepSuggestion?: string;
  completionStatus?: string;
  carryOverToNextLesson?: boolean;
  origin?: {
    sourceLessonId?: Types.ObjectId | string;
    sourceBlockId?: Types.ObjectId | string;
  };
};

type PendingRawLesson = {
  _id: Types.ObjectId;
  courseId?: Types.ObjectId;
  title: string;
  scheduledStart: Date;
  nextLessonFocus?: string;
  attendees?: PendingRawAttendee[];
  blocks?: PendingRawBlock[];
};

type CurrentLessonContext = Pick<
  PendingRawLesson,
  "_id" | "courseId" | "scheduledStart" | "attendees"
>;

function validateOptionalObjectId(value: string | undefined) {
  return value === undefined || Types.ObjectId.isValid(value);
}

function addLessonScopeFilter(
  filter: Record<string, unknown>,
  courseId: string | undefined,
  studentIds: string[],
) {
  if (courseId) {
    filter.courseId = new Types.ObjectId(courseId);
    return;
  }

  const studentObjectIds = studentIds.map(
    (studentId) => new Types.ObjectId(studentId),
  );

  filter["attendees.studentId"] = { $all: studentObjectIds };
  filter.$expr = {
    $eq: [{ $size: "$attendees" }, studentObjectIds.length],
  };
}

type PendingBlockItem = {
  sourceLessonId: string;
  sourceLessonTitle: string;
  sourceLessonDate: string;
  sourceCourseId?: string;
  sourceStudentIds: string[];
  sourceAttendees: { studentId: string }[];
  sourceBlockId?: string;
  reason: "carry_over" | "not_completed";
  blockIndex: number;
  block: {
    lineageId: string;
    title: string;
    type: LessonBlockType;
    categories: LessonBlockType[];
    cefrLevels: string[];
    skills: string[];
    tags: string[];
    resources: string[];
    plannedContent: string;
    estimatedMinutes?: number;
    plannedObjectives: string[];
    nextStepSuggestion?: string;
    completionStatus: string;
    carryOverToNextLesson: boolean;
  };
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
    const parsed = pendingBlocksRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid pending blocks request" },
        { status: 400 },
      );
    }

    const { excludeLessonId, referenceDate } = parsed.data;
    let courseId = parsed.data.courseId;
    let studentIds = Array.from(new Set(parsed.data.studentIds));

    if (
      !validateOptionalObjectId(courseId) ||
      !validateOptionalObjectId(excludeLessonId) ||
      studentIds.some((studentId) => !Types.ObjectId.isValid(studentId))
    ) {
      return NextResponse.json(
        { error: "Invalid ObjectId in pending blocks request" },
        { status: 400 },
      );
    }

    let cutoffDate = referenceDate ? new Date(referenceDate) : new Date();

    if (Number.isNaN(cutoffDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid referenceDate" },
        { status: 400 },
      );
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (user.role !== "admin" && !currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    await dbConnect();

    if (excludeLessonId) {
      const currentLessonFilter: Record<string, unknown> = {
        _id: new Types.ObjectId(excludeLessonId),
      };

      if (user.role !== "admin") {
        currentLessonFilter.teacherId = currentUserObjectId;
      }

      const currentLesson = await Lesson.findOne(currentLessonFilter)
        .select("courseId scheduledStart attendees.studentId")
        .lean<CurrentLessonContext>();

      if (!currentLesson) {
        return NextResponse.json(
          { error: "Lesson not found" },
          { status: 404 },
        );
      }

      courseId = currentLesson.courseId?.toString();
      studentIds = Array.from(
        new Set(
          (currentLesson.attendees ?? [])
            .map((attendee) => attendee.studentId?.toString())
            .filter((studentId): studentId is string => Boolean(studentId)),
        ),
      );
      cutoffDate = new Date(currentLesson.scheduledStart);
    }

    if (!courseId && studentIds.length === 0) {
      return NextResponse.json({
        focusNote: null,
        items: [],
        meta: { total: 0, previousLessonPendingCount: 0 },
      });
    }

    const filter: Record<string, unknown> = {
      status: { $nin: ["voided", "canceled_by_teacher"] },
      scheduledStart: referenceDate || excludeLessonId
        ? { $lt: cutoffDate }
        : { $lte: cutoffDate },
    };

    if (user.role !== "admin") {
      filter.teacherId = currentUserObjectId;
    }

    if (excludeLessonId) {
      filter._id = { $ne: new Types.ObjectId(excludeLessonId) };
    }

    addLessonScopeFilter(filter, courseId, studentIds);

    const previousLessonFilter: Record<string, unknown> = {
      ...filter,
      status: "completed",
      scheduledStart: { $lt: cutoffDate },
    };

    const [lessons, previousLesson] = await Promise.all([
      Lesson.find(filter)
        .sort({ scheduledStart: -1 })
        .limit(20)
        .lean<PendingRawLesson[]>(),
      Lesson.findOne(previousLessonFilter)
        .sort({ scheduledStart: -1 })
        .select("title scheduledStart nextLessonFocus")
        .lean<PendingRawLesson>(),
    ]);

    const previousFocusText = previousLesson?.nextLessonFocus?.trim();
    const focusNote = previousLesson && previousFocusText
      ? {
          text: previousFocusText,
          sourceLessonId: previousLesson._id.toString(),
          sourceLessonTitle: previousLesson.title,
          sourceLessonDate: new Date(
            previousLesson.scheduledStart,
          ).toISOString(),
        }
      : null;

    const identityToLineage = new Map<string, string>();
    const latestBlockByLineage = new Map<string, PendingBlockItem>();

    [...lessons].reverse().forEach((lesson) => {
      const sourceLessonId = lesson._id.toString();
        const sourceAttendees = (lesson.attendees ?? [])
          .map((attendee) => attendee.studentId?.toString())
          .filter((studentId): studentId is string => Boolean(studentId))
          .map((studentId) => ({ studentId }));
        const sourceStudentIds = sourceAttendees.map(
          (attendee) => attendee.studentId,
        );

      (lesson.blocks ?? []).forEach((block, blockIndex) => {
        const sourceBlockId = block._id?.toString();
        const blockIdentity = sourceBlockId
          ? `${sourceLessonId}:${sourceBlockId}`
          : `${sourceLessonId}:index-${blockIndex}-${block.title}`;
        const originLessonId = block.origin?.sourceLessonId?.toString();
        const originBlockId = block.origin?.sourceBlockId?.toString();
        const originIdentity =
          originLessonId && originBlockId
            ? `${originLessonId}:${originBlockId}`
            : undefined;
        const lineageKey =
          block.lineageId ||
          (originIdentity
            ? identityToLineage.get(originIdentity) ??
              `legacy:${originIdentity}`
            : `legacy:${blockIdentity}`);
        const completionStatus =
          block.completionStatus ?? "not_completed";
        const carryOverToNextLesson =
          block.carryOverToNextLesson ?? false;

        identityToLineage.set(blockIdentity, lineageKey);
        latestBlockByLineage.set(lineageKey, {
          sourceLessonId,
          sourceLessonTitle: lesson.title,
          sourceLessonDate: new Date(lesson.scheduledStart).toISOString(),
          sourceCourseId: lesson.courseId?.toString(),
          sourceStudentIds,
          sourceAttendees,
          sourceBlockId,
          reason: carryOverToNextLesson ? "carry_over" : "not_completed",
          blockIndex,
          block: {
            lineageId: lineageKey,
            title: block.title,
            type: block.type,
            categories: normalizeLessonBlockCategories(
              block.type,
              block.categories,
            ),
            cefrLevels: block.cefrLevels ?? [],
            skills: block.skills ?? [],
            tags: block.tags ?? [],
            resources: (block.resources ?? []).map(String),
            plannedContent: block.plannedContent,
            estimatedMinutes: block.estimatedMinutes,
            plannedObjectives: block.plannedObjectives ?? [],
            nextStepSuggestion: block.nextStepSuggestion,
            completionStatus,
            carryOverToNextLesson,
          },
        });
      });
    });

    const items = Array.from(latestBlockByLineage.values())
      .filter(
        (item) =>
          item.block.carryOverToNextLesson ||
          !["completed", "skipped"].includes(item.block.completionStatus),
      )
      .sort((first, second) => {
        const dateDifference =
          new Date(second.sourceLessonDate).getTime() -
          new Date(first.sourceLessonDate).getTime();

        return dateDifference || first.blockIndex - second.blockIndex;
      })
      .slice(0, 30);

    const previousLessonId = lessons[0]?._id.toString();
    const previousLessonPendingCount = previousLessonId
      ? items.filter((item) => item.sourceLessonId === previousLessonId).length
      : 0;
    const responseItems = items.map((item) => ({
      sourceLessonId: item.sourceLessonId,
      sourceLessonTitle: item.sourceLessonTitle,
      sourceLessonDate: item.sourceLessonDate,
      sourceCourseId: item.sourceCourseId,
      sourceStudentIds: item.sourceStudentIds,
      sourceAttendees: item.sourceAttendees,
      sourceBlockId: item.sourceBlockId,
      reason: item.reason,
      block: item.block,
    }));

    return NextResponse.json({
      focusNote,
      items: responseItems,
      meta: {
        total: items.length,
        previousLessonPendingCount,
      },
    });
  } catch (error) {
    console.error("Error en POST /api/lessons/pending-blocks:", error);

    return NextResponse.json(
      { error: "Error al buscar bloques pendientes" },
      { status: 500 },
    );
  }
}
