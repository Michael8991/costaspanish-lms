import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import Lesson from "@/models/Lesson";

const discardPendingBlockSchema = z
  .object({
    sourceLessonId: z.string().trim().min(1),
    sourceBlockId: z.string().trim().min(1).optional(),
    lineageId: z.string().trim().min(1).optional(),
  })
  .refine((data) => Boolean(data.sourceBlockId || data.lineageId), {
    message: "sourceBlockId or lineageId is required",
  });

type DiscardableBlock = {
  _id?: Types.ObjectId;
  lineageId?: string;
  completionStatus?: string;
  carryOverToNextLesson?: boolean;
};

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = discardPendingBlockSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid discard request" },
        { status: 400 },
      );
    }

    const { sourceLessonId, sourceBlockId, lineageId } = parsed.data;

    if (
      !Types.ObjectId.isValid(sourceLessonId) ||
      (sourceBlockId !== undefined &&
        !Types.ObjectId.isValid(sourceBlockId))
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid lesson or block id" },
        { status: 400 },
      );
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (user.role !== "admin" && !currentUserObjectId) {
      return NextResponse.json(
        { ok: false, error: "Invalid user id" },
        { status: 500 },
      );
    }

    const lessonObjectId = new Types.ObjectId(sourceLessonId);
    const filter =
      user.role === "admin"
        ? { _id: lessonObjectId }
        : {
            _id: lessonObjectId,
            teacherId: currentUserObjectId,
          };

    await dbConnect();

    const lesson = await Lesson.findOne(filter);

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    const blocks = lesson.blocks as unknown as DiscardableBlock[];
    const block =
      (sourceBlockId
        ? blocks.find(
            (candidate) => candidate._id?.toString() === sourceBlockId,
          )
        : undefined) ??
      (lineageId
        ? blocks.find((candidate) => candidate.lineageId === lineageId)
        : undefined);

    if (!block) {
      return NextResponse.json(
        { ok: false, error: "Block not found" },
        { status: 404 },
      );
    }

    block.completionStatus = "skipped";
    block.carryOverToNextLesson = false;
    await lesson.save();

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Error en PATCH /api/lessons/pending-blocks/discard:",
      error,
    );

    return NextResponse.json(
      { ok: false, error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
