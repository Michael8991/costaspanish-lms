export function getLessonStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    scheduled: "Planificada",
    in_progress: "En curso",
    completed: "Completada",
    canceled_by_teacher: "Cancelada",
    voided: "Anulada",
  };
  return status ? (labels[status] ?? "Estado desconocido") : "Sin estado";
}

export function getLessonStatusClassName(status?: string | null): string {
  const classes: Record<string, string> = {
    scheduled: "border-blue-200 bg-blue-50 text-blue-700",
    in_progress: "border-amber-200 bg-amber-50 text-amber-700",
    completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    canceled_by_teacher: "border-red-200 bg-red-50 text-red-700",
    voided: "border-slate-300 bg-slate-100 text-slate-600",
  };
  return status
    ? (classes[status] ?? "border-slate-200 bg-slate-50 text-slate-600")
    : "border-slate-200 bg-slate-50 text-slate-600";
}

export function getPreparationStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    needs_preparation: "Por preparar",
    prepared: "Preparada",
  };
  return status ? (labels[status] ?? "Sin estado") : "Sin estado";
}

export function getPreparationStatusClassName(
  status?: string | null,
): string {
  return status === "prepared"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";
}

export function getAttendanceLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    attended: "Asistió",
    absent: "Ausente",
    no_show: "No show",
    excused: "Justificada",
    canceled_early: "Cancelación anticipada",
    canceled_late: "Cancelación tardía",
    pending: "Pendiente",
    unknown: "Pendiente",
  };
  return status ? (labels[status] ?? "Pendiente") : "Pendiente";
}

export function getAttendanceClassName(status?: string | null): string {
  const classes: Record<string, string> = {
    attended: "border-emerald-200 bg-emerald-50 text-emerald-700",
    absent: "border-red-200 bg-red-50 text-red-700",
    no_show: "border-rose-200 bg-rose-50 text-rose-700",
    excused: "border-blue-200 bg-blue-50 text-blue-700",
    canceled_early: "border-blue-200 bg-blue-50 text-blue-700",
    canceled_late: "border-rose-200 bg-rose-50 text-rose-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    unknown: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return status
    ? (classes[status] ?? "border-slate-200 bg-slate-50 text-slate-600")
    : "border-amber-200 bg-amber-50 text-amber-700";
}

export function getClassTypeLabel(classType?: string | null): string {
  const labels: Record<string, string> = {
    private: "Privada",
    pair: "Pareja",
    group_regular: "Grupo regular",
    semi_intensive: "Semi-intensivo",
    intensive: "Intensivo",
  };
  return classType ? (labels[classType] ?? classType) : "—";
}
