export const COURSE_ENROLLMENT_REQUIRED_MESSAGE =
  "El alumno debe estar matriculado en este curso antes de crear un bono.";

export type QuickVoucherAvailability =
  | { allowed: true }
  | { allowed: false; reason: "free_mode" | "missing_enrollment" };

export function getQuickVoucherAvailability(args: {
  creationMode: "course" | "free";
  enrollmentId?: string | null;
}): QuickVoucherAvailability {
  if (args.creationMode === "free") {
    return { allowed: false, reason: "free_mode" };
  }
  if (!args.enrollmentId) {
    return { allowed: false, reason: "missing_enrollment" };
  }
  return { allowed: true };
}
