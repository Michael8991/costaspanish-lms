import type { Types } from "mongoose";

export type TeacherTaskPriority = "low" | "medium" | "high";
export type TeacherTaskStatus = "open" | "completed";

export interface TeacherTaskDTO {
  id: string;
  title: string;
  notes: string;
  priority: TeacherTaskPriority;
  status: TeacherTaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherTaskSummaryDTO {
  open: number;
  completed: number;
  highPriorityOpen: number;
}

export interface TeacherTasksResponseDTO {
  items: TeacherTaskDTO[];
  summary: TeacherTaskSummaryDTO;
}

export interface TeacherTaskStatsDTO {
  today: {
    created: number;
    completed: number;
  };
  yesterday?: {
    completed: number;
  };
  open: {
    total: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
  trend?: {
    completedDeltaVsYesterday: number;
  };
}

type TeacherTaskDTOInput = {
  _id: Types.ObjectId | string;
  title: string;
  notes?: string;
  priority: TeacherTaskPriority;
  status: TeacherTaskStatus;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export function toTeacherTaskDTO(
  task: TeacherTaskDTOInput,
): TeacherTaskDTO {
  return {
    id: task._id.toString(),
    title: task.title,
    notes: task.notes ?? "",
    priority: task.priority,
    status: task.status,
    completedAt: task.completedAt
      ? new Date(task.completedAt).toISOString()
      : null,
    createdAt: new Date(task.createdAt).toISOString(),
    updatedAt: new Date(task.updatedAt).toISOString(),
  };
}
