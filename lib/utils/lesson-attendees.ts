export const DUPLICATE_LESSON_ATTENDEE_CODE =
  "duplicate_lesson_attendee";
export const DUPLICATE_LESSON_ATTENDEE_ERROR =
  "A student can appear only once in lesson attendees";

type LessonAttendeeIdentity = {
  studentId: unknown;
};

function normalizeStudentId(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim().toLowerCase();
}

export function findDuplicateLessonAttendeeStudentId(
  attendees: readonly LessonAttendeeIdentity[],
): string | null {
  const seen = new Set<string>();

  for (const attendee of attendees) {
    const studentId = normalizeStudentId(attendee.studentId);
    if (!studentId) continue;

    if (seen.has(studentId)) return studentId;
    seen.add(studentId);
  }

  return null;
}

export function validateUniqueLessonAttendees(
  attendees: readonly LessonAttendeeIdentity[],
):
  | { ok: true }
  | {
      ok: false;
      status: 400;
      code: typeof DUPLICATE_LESSON_ATTENDEE_CODE;
      error: typeof DUPLICATE_LESSON_ATTENDEE_ERROR;
      duplicateStudentId: string;
    } {
  const duplicateStudentId =
    findDuplicateLessonAttendeeStudentId(attendees);

  if (!duplicateStudentId) return { ok: true };

  return {
    ok: false,
    status: 400,
    code: DUPLICATE_LESSON_ATTENDEE_CODE,
    error: DUPLICATE_LESSON_ATTENDEE_ERROR,
    duplicateStudentId,
  };
}
