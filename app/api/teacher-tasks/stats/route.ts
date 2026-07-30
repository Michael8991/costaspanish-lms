import { NextRequest, NextResponse } from "next/server";

import { requireAuth, requireRole } from "@/lib/auth/apiAuth";
import { getCurrentUserObjectId } from "@/lib/auth/getCurrentUserObjectId";
import dbConnect from "@/lib/mongo";
import { getTodayRange } from "@/lib/utils/time-zone";
import { TeacherTask } from "@/models/TeacherTask";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!requireRole(user, ["admin", "teacher"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const currentUserObjectId = getCurrentUserObjectId(user);

    if (!currentUserObjectId) {
      return NextResponse.json(
        { error: "Invalid current user id" },
        { status: 500 },
      );
    }

    await dbConnect();

    const { start, end } = getTodayRange();
    const activeOwnerFilter = {
      teacherId: currentUserObjectId,
      deletedAt: null,
    };
    const openOwnerFilter = {
      ...activeOwnerFilter,
      status: "open",
    };

    const [
      createdToday,
      completedToday,
      openTotal,
      highPriorityOpen,
      mediumPriorityOpen,
      lowPriorityOpen,
    ] = await Promise.all([
      TeacherTask.countDocuments({
        ...activeOwnerFilter,
        createdAt: { $gte: start, $lte: end },
      }),
      TeacherTask.countDocuments({
        ...activeOwnerFilter,
        status: "completed",
        completedAt: { $gte: start, $lte: end },
      }),
      TeacherTask.countDocuments(openOwnerFilter),
      TeacherTask.countDocuments({
        ...openOwnerFilter,
        priority: "high",
      }),
      TeacherTask.countDocuments({
        ...openOwnerFilter,
        priority: "medium",
      }),
      TeacherTask.countDocuments({
        ...openOwnerFilter,
        priority: "low",
      }),
    ]);

    return NextResponse.json({
      today: {
        created: createdToday,
        completed: completedToday,
      },
      open: {
        total: openTotal,
        highPriority: highPriorityOpen,
        mediumPriority: mediumPriorityOpen,
        lowPriority: lowPriorityOpen,
      },
    });
  } catch (error) {
    console.error("Error in GET /api/teacher-tasks/stats:", error);

    return NextResponse.json(
      { error: "Error al cargar las estadísticas de tareas" },
      { status: 500 },
    );
  }
}
