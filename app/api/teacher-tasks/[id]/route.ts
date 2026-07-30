import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import { toTeacherTaskDTO } from "@/lib/dto/teacher-task.dto";
import dbConnect from "@/lib/mongo";
import { updateTeacherTaskSchema } from "@/lib/validators/teacher-task.schema";
import { TeacherTask } from "@/models/TeacherTask";

type TeacherTaskRouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  req: NextRequest,
  { params }: TeacherTaskRouteContext,
) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid teacher task id" },
        { status: 400 },
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = updateTeacherTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid teacher task payload",
          issues: z.flattenError(parsed.error),
        },
        { status: 400 },
      );
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    await dbConnect();

    const set: Record<string, unknown> = { ...parsed.data };

    if (parsed.data.status === "completed") {
      set.completedAt = new Date();
    } else if (parsed.data.status === "open") {
      set.completedAt = null;
    }

    const task = await TeacherTask.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        teacherId: currentUserObjectId,
        deletedAt: null,
      },
      { $set: set },
      { new: true, runValidators: true },
    );

    if (!task) {
      return NextResponse.json(
        { error: "Teacher task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ item: toTeacherTaskDTO(task) });
  } catch (error) {
    console.error("Error in PATCH /api/teacher-tasks/[id]:", error);

    return NextResponse.json(
      { error: "Error al actualizar la tarea" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: TeacherTaskRouteContext,
) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid teacher task id" },
        { status: 400 },
      );
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    await dbConnect();

    const task = await TeacherTask.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        teacherId: currentUserObjectId,
        deletedAt: null,
      },
      {
        $set: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!task) {
      return NextResponse.json(
        { error: "Teacher task not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in DELETE /api/teacher-tasks/[id]:", error);

    return NextResponse.json(
      { error: "Error al eliminar la tarea" },
      { status: 500 },
    );
  }
}
