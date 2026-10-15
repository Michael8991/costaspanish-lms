import { validateUniqueLessonAttendees } from "@/lib/utils/lesson-attendees";

type CompletionAttendee = {
  studentId: unknown;
  attendanceStatus: string;
};

export type LessonCompletionBlocker = {
  status: 400 | 409;
  error: string;
  code?: string;
};

export function isLessonSettlementFinal({
  lessonStatus,
  settlementStatus,
}: {
  lessonStatus: string;
  settlementStatus?: string | null;
}): boolean {
  return (
    lessonStatus === "completed" ||
    settlementStatus === "settled" ||
    settlementStatus === "skipped"
  );
}

export function getLessonCompletionBlocker({
  status,
  attendees,
}: {
  status: string;
  attendees: readonly CompletionAttendee[];
}): LessonCompletionBlocker | null {
  if (status === "voided" || status === "canceled_by_teacher") {
    return {
      status: 409,
      error: "This lesson cannot be completed",
    };
  }

  if (attendees.length === 0) {
    return {
      status: 400,
      error: "Lesson has no attendees",
    };
  }

  const uniqueness = validateUniqueLessonAttendees(attendees);
  if (!uniqueness.ok) {
    return {
      status: uniqueness.status,
      code: uniqueness.code,
      error: uniqueness.error,
    };
  }

  if (
    attendees.some(
      (attendee) => attendee.attendanceStatus === "pending",
    )
  ) {
    return {
      status: 400,
      error:
        "All attendees must have attendance marked before completing the lesson",
    };
  }

  return null;
}
