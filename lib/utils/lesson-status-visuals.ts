import type { LessonStatus } from "@/lib/types/lesson";

export function getLessonStatusVisual(status: LessonStatus) {
  if (status === "scheduled") {
    return {
      label: "Programada",
      badgeClassName: "bg-blue-50 text-blue-700 ring-blue-100",
      sideBarClassName: "bg-blue-500",
    };
  }

  if (status === "in_progress") {
    return {
      label: "En curso",
      badgeClassName: "bg-amber-50 text-amber-700 ring-amber-100",
      sideBarClassName: "bg-amber-500",
    };
  }

  if (status === "completed") {
    return {
      label: "Completada",
      badgeClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      sideBarClassName: "bg-emerald-500",
    };
  }

  if (status === "canceled_by_teacher") {
    return {
      label: "Cancelada",
      badgeClassName: "bg-red-50 text-red-700 ring-red-100",
      sideBarClassName: "bg-red-500",
    };
  }

  return {
    label: "Anulada",
    badgeClassName: "bg-gray-100 text-gray-700 ring-gray-200",
    sideBarClassName: "bg-gray-400",
  };
}
