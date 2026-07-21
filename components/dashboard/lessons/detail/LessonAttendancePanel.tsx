"use client";

import { useEffect, useState } from "react";
import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import {
  CheckCircle2,
  CircleDot,
  Clock3,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";

interface LessonAttendancePanelProps {
  lesson: LessonDetailDTO;
}

type AttendanceStatus =
  LessonDetailDTO["attendees"][number]["attendanceStatus"];
type LessonAttendeeItem = LessonDetailDTO["attendees"][number];
type LocalLessonStatus = LessonDetailDTO["status"];

const attendanceActions: {
  status: AttendanceStatus;
  label: string;
}[] = [
  { status: "attended", label: "Asistió" },
  { status: "no_show", label: "No show" },
  { status: "canceled_early", label: "Pronto" },
  { status: "canceled_late", label: "Tarde" },
];

function AttendanceIcon({ status }: { status: AttendanceStatus }) {
  if (status === "attended") return <CheckCircle2 size={13} />;
  if (status === "no_show") return <UserX size={13} />;
  if (status === "canceled_early") return <Clock3 size={13} />;
  if (status === "canceled_late") return <XCircle size={13} />;

  return <CircleDot size={13} />;
}

function getAttendanceClassName(status: AttendanceStatus) {
  if (status === "attended") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === "no_show") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (status === "canceled_early") {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  if (status === "canceled_late") {
    return "bg-orange-50 text-orange-700 ring-orange-100";
  }

  return "bg-gray-100 text-gray-600 ring-gray-200";
}

export default function LessonAttendancePanel({
  lesson,
}: LessonAttendancePanelProps) {
  const lessonNextLessonFocus = lesson.nextLessonFocus ?? "";
  const [updatingStudentId, setUpdatingStudentId] = useState<string | null>(
    null,
  );
  const [attendees, setAttendees] = useState<LessonAttendeeItem[]>(
    () => lesson.attendees,
  );

  const [localLessonStatus, setLocalLessonStatus] = useState<LocalLessonStatus>(
    lesson.status,
  );
  const [nextLessonFocus, setNextLessonFocus] = useState(
    lessonNextLessonFocus,
  );
  const [nextLessonFocusDraft, setNextLessonFocusDraft] = useState(
    lessonNextLessonFocus,
  );

  useEffect(() => {
    setAttendees(lesson.attendees);
    setLocalLessonStatus(lesson.status);
    setNextLessonFocus(lessonNextLessonFocus);
    setNextLessonFocusDraft(lessonNextLessonFocus);
  }, [lesson.attendees, lesson.status, lessonNextLessonFocus]);
  const [error, setError] = useState<string | null>(null);
  const [isCompletingLesson, setIsCompletingLesson] = useState(false);
  const [isUpdatingNextLessonFocus, setIsUpdatingNextLessonFocus] =
    useState(false);
  const [nextLessonFocusError, setNextLessonFocusError] = useState<
    string | null
  >(null);

  const hasPendingAttendance = attendees.some(
    (attendee) => attendee.attendanceStatus === "pending",
  );

  const isCompleted = localLessonStatus === "completed";

  const canCompleteLesson =
    !isCompleted && !hasPendingAttendance && attendees.length > 0;

  const hasNextLessonFocusChanges =
    nextLessonFocusDraft !== nextLessonFocus;

  const updateNextLessonFocus = async () => {
    const previousNextLessonFocus = nextLessonFocus;
    const nextValue = nextLessonFocusDraft.trim();

    setIsUpdatingNextLessonFocus(true);
    setNextLessonFocusError(null);
    setNextLessonFocus(nextValue);

    try {
      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextLessonFocus: nextValue }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Error al actualizar el foco de la próxima clase",
        );
      }

      setNextLessonFocusDraft(nextValue);
    } catch (error) {
      setNextLessonFocus(previousNextLessonFocus);
      setNextLessonFocusError(
        error instanceof Error ? error.message : "Error desconocido",
      );
    } finally {
      setIsUpdatingNextLessonFocus(false);
    }
  };

  const handleCompleteLesson = async () => {
    try {
      setIsCompletingLesson(true);
      setError(null);

      const response = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Error al completar la clase");
      }

      setLocalLessonStatus("completed");

      if (data?.item?.attendees) {
        setAttendees(data.item.attendees);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setIsCompletingLesson(false);
    }
  };

  const updateAttendance = async (
    studentId: string,
    attendanceStatus: AttendanceStatus,
  ) => {
    const previousAttendees = attendees;

    const nextAttendees = attendees.map((attendee) => ({
      ...attendee,
      attendanceStatus:
        attendee.studentId === studentId
          ? attendanceStatus
          : attendee.attendanceStatus,
    }));

    try {
      setUpdatingStudentId(studentId);
      setError(null);

      setAttendees(nextAttendees);

      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendees: nextAttendees.map((attendee) => ({
            studentId: attendee.studentId,
            voucherId: attendee.voucherId,
            attendanceStatus: attendee.attendanceStatus,
            creditsToConsume: attendee.creditsToConsume ?? 1,
            isTrial: attendee.isTrial ?? false,
          })),
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setAttendees(previousAttendees);
        throw new Error(data?.error ?? "Error al actualizar asistencia");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setUpdatingStudentId(null);
    }
  };
  return (
    <aside className="space-y-4">
      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-950">
              Asistencia
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {attendees.length} alumno
              {attendees.length === 1 ? "" : "s"} en esta clase.
            </p>
          </div>

          <Users size={18} className="text-gray-400" />
        </div>

        {error && (
          <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-2">
          {attendees.map((attendee, index) => {
            const isUpdating = updatingStudentId === attendee.studentId;

            return (
              <div
                key={`${attendee.studentId}-${index}`}
                className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-950">
                      {attendee.studentName || `Alumno ${index + 1}`}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500">
                      {attendee.isTrial ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 font-medium text-blue-700 ring-1 ring-blue-100">
                          Trial
                        </span>
                      ) : (
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-gray-600 ring-1 ring-gray-100">
                          {attendee.creditsToConsume ?? 0} crédito
                          {(attendee.creditsToConsume ?? 0) === 1 ? "" : "s"}
                        </span>
                      )}

                      {attendee.voucherId && !attendee.isTrial && (
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-gray-500 ring-1 ring-gray-100">
                          Bono
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${getAttendanceClassName(
                      attendee.attendanceStatus,
                    )}`}
                  >
                    <AttendanceIcon status={attendee.attendanceStatus} />
                    {formatLabel(attendee.attendanceStatus)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {attendanceActions.map((action) => {
                    const isActive =
                      attendee.attendanceStatus === action.status;

                    return (
                      <button
                        key={action.status}
                        type="button"
                        disabled={isUpdating}
                        onClick={() =>
                          updateAttendance(attendee.studentId, action.status)
                        }
                        className={`cursor-pointer rounded-lg border px-2 py-1.5 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isActive
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {isUpdating ? "..." : action.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          disabled={!canCompleteLesson || isCompletingLesson}
          onClick={handleCompleteLesson}
          className="cursor-pointer mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <UserCheck size={15} />
          {isCompletingLesson
            ? "Completando..."
            : isCompleted
              ? "Clase completada"
              : hasPendingAttendance
                ? "Marca asistencia primero"
                : "Completar clase"}
        </button>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-950">Notas rápidas</h2>

        <div className="mt-4 space-y-3 text-sm">
          {lesson.preparationNotes && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Preparación
              </p>
              <p className="mt-1 text-gray-600">{lesson.preparationNotes}</p>
            </div>
          )}

          {lesson.homeworkAssigned && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                Homework
              </p>
              <p className="mt-1 text-gray-600">{lesson.homeworkAssigned}</p>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
            <label className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Foco de la próxima clase
            </label>

            <textarea
              value={nextLessonFocusDraft}
              onChange={(event) => setNextLessonFocusDraft(event.target.value)}
              rows={4}
              placeholder="Ej: Reforzar pasados, terminar la actividad de conversación y preparar deberes de verbos irregulares..."
              className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
            />

            {nextLessonFocusError && (
              <p className="mt-2 text-xs text-red-600">
                {nextLessonFocusError}
              </p>
            )}

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={
                  !hasNextLessonFocusChanges || isUpdatingNextLessonFocus
                }
                onClick={updateNextLessonFocus}
                className="inline-flex cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isUpdatingNextLessonFocus ? "Guardando..." : "Guardar foco"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </aside>
  );
}
