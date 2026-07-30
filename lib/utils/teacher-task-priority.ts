import type { TeacherTaskPriority } from "@/lib/dto/teacher-task.dto";

const priorityVisuals: Record<
  TeacherTaskPriority,
  { label: string; className: string }
> = {
  low: {
    label: "Baja",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  medium: {
    label: "Media",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  high: {
    label: "Alta",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export function getTeacherTaskPriorityVisual(
  priority: TeacherTaskPriority,
) {
  return priorityVisuals[priority];
}
