export function getLessonCourseRelationLabel(
  relationType?: string | null,
): string {
  if (relationType === "course_free_lesson") return "Clase libre del curso";
  if (relationType === "template_based") return "Basada en modelo";
  if (relationType === "review") return "Repaso";
  if (relationType === "makeup") return "Recuperación";
  if (relationType === "extra") return "Extra";
  if (relationType === "imported_historical") return "Histórica importada";
  if (relationType === "legacy_free") return "Clase libre";

  return "Clase del curso";
}

export function getLessonCourseRelationBadgeClassName(
  relationType?: string | null,
): string {
  if (relationType === "template_based") {
    return "bg-violet-50 text-violet-700 ring-violet-100";
  }
  if (relationType === "review") {
    return "bg-blue-50 text-blue-700 ring-blue-100";
  }
  if (relationType === "makeup") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }
  if (relationType === "extra") {
    return "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-100";
  }
  if (relationType === "imported_historical") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  return "bg-emerald-50 text-emerald-700 ring-emerald-100";
}
