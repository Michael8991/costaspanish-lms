import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import {
  toTeacherTaskDTO,
  type TeacherTaskDTO,
} from "@/lib/dto/teacher-task.dto";
import dbConnect from "@/lib/mongo";
import { getTodayRange } from "@/lib/utils/time-zone";
import { createTeacherTaskSchema } from "@/lib/validators/teacher-task.schema";
import {
  TeacherTask,
  type TeacherTaskDoc,
} from "@/models/TeacherTask";

const teacherTasksQuerySchema = z.object({
  status: z
    .enum(["open", "completed", "completed_today", "all_visible", "all"])
    .default("open"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const priorityOrder: Record<TeacherTaskDTO["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

const statusOrder: Record<TeacherTaskDTO["status"], number> = {
  open: 0,
  completed: 1,
};

function sortTeacherTasks(
  first: TeacherTaskDTO,
  second: TeacherTaskDTO,
) {
  const statusDifference =
    statusOrder[first.status] - statusOrder[second.status];
  const priorityDifference =
    priorityOrder[first.priority] - priorityOrder[second.priority];
  const dateDifference =
    new Date(second.createdAt).getTime() -
    new Date(first.createdAt).getTime();

  return statusDifference || priorityDifference || dateDifference;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const query = teacherTasksQuerySchema.safeParse({
      status: req.nextUrl.searchParams.get("status") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
    });

    if (!query.success) {
      return NextResponse.json(
        { error: "Invalid teacher task query" },
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

    const ownerFilter = {
      teacherId: currentUserObjectId,
      deletedAt: null,
    };
    const { start, end } = getTodayRange();
    const taskFilter: Record<string, unknown> = { ...ownerFilter };

    if (query.data.status === "open") {
      taskFilter.status = "open";
    } else if (query.data.status === "completed") {
      taskFilter.status = "completed";
    } else if (query.data.status === "completed_today") {
      taskFilter.status = "completed";
      taskFilter.completedAt = { $gte: start, $lte: end };
    } else if (query.data.status === "all_visible") {
      taskFilter.$or = [
        { status: "open" },
        {
          status: "completed",
          completedAt: { $gte: start, $lte: end },
        },
      ];
    }

    const [tasks, open, completed, highPriorityOpen] = await Promise.all([
      TeacherTask.find(taskFilter)
        .sort({ createdAt: -1 })
        .limit(query.data.limit)
        .lean<TeacherTaskDoc[]>(),
      TeacherTask.countDocuments({ ...ownerFilter, status: "open" }),
      TeacherTask.countDocuments({ ...ownerFilter, status: "completed" }),
      TeacherTask.countDocuments({
        ...ownerFilter,
        status: "open",
        priority: "high",
      }),
    ]);

    const items = tasks.map(toTeacherTaskDTO).sort(sortTeacherTasks);

    return NextResponse.json({
      items,
      summary: { open, completed, highPriorityOpen },
    });
  } catch (error) {
    console.error("Error in GET /api/teacher-tasks:", error);

    return NextResponse.json(
      { error: "Error al cargar las tareas" },
      { status: 500 },
    );
  }
}

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
    const parsed = createTeacherTaskSchema.safeParse(body);

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

    const task = await TeacherTask.create({
      teacherId: currentUserObjectId,
      title: parsed.data.title,
      notes: parsed.data.notes ?? "",
      priority: parsed.data.priority ?? "medium",
      status: "open",
      completedAt: null,
      deletedAt: null,
    });

    return NextResponse.json(
      { item: toTeacherTaskDTO(task) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error in POST /api/teacher-tasks:", error);

    return NextResponse.json(
      { error: "Error al crear la tarea" },
      { status: 500 },
    );
  }
}
