"use client";

import { useEffect, useState } from "react";
import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { formatLabel } from "@/lib/utils/lessonDetail-helpers";
import CustomModal from "@/components/ui/CustomModal";
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
type ReviewLessonBlock = LessonDetailDTO["blocks"][number] & {
  id?: string;
  _id?: string;
};

type LessonDetailApiResponse = {
  item?: LessonDetailDTO;
  error?: string;
};

type CompleteLessonApiResponse = {
  item?: {
    attendees?: LessonAttendeeItem[];
  };
  error?: string;
};

const BLOCK_SUCCESS_RATINGS = [1, 2, 3, 4, 5] as const;

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

function getReviewBlockKey(block: ReviewLessonBlock, index: number) {
  return block.id ?? block._id ?? `${index}-${block.title}`;
}

function mapBlocksToPatchPayload(blocks: ReviewLessonBlock[]) {
  return blocks.map((block) => ({
    lineageId: block.lineageId,
    title: block.title,
    type: block.type,
    cefrLevels: block.cefrLevels ?? [],
    skills: block.skills ?? [],
    tags: block.tags ?? [],
    resources: block.resources ?? [],
    plannedContent: block.plannedContent,
    completionStatus: block.completionStatus ?? "not_completed",
    carryOverToNextLesson: block.carryOverToNextLesson ?? false,
    actualContent: block.actualContent,
    plannedObjectives: block.plannedObjectives ?? [],
    achievedObjectives: block.achievedObjectives ?? [],
    estimatedMinutes: block.estimatedMinutes,
    actualMinutes: block.actualMinutes,
    blockSuccessRating: block.blockSuccessRating,
    studentDifficultyLevel: block.studentDifficultyLevel,
    engagementLevel: block.engagementLevel,
    errorCategories: block.errorCategories ?? [],
    studentDifficultiesText: block.studentDifficultiesText,
    teacherReflection: block.teacherReflection,
    nextStepSuggestion: block.nextStepSuggestion,
    origin: block.origin?.sourceLessonId
      ? {
          sourceLessonId: block.origin.sourceLessonId,
          sourceBlockId: block.origin.sourceBlockId,
          sourceCourseId: block.origin.sourceCourseId,
          sourceStudentIds: block.origin.sourceStudentIds ?? [],
          sourceLessonTitle: block.origin.sourceLessonTitle,
          sourceLessonDate: block.origin.sourceLessonDate,
          sourceBlockTitle: block.origin.sourceBlockTitle,
        }
      : undefined,
  }));
}

function getRatingLabel(rating: number) {
  if (rating === 1) return "No funcionó";
  if (rating === 2) return "Flojo";
  if (rating === 3) return "Correcto";
  if (rating === 4) return "Bien";
  if (rating === 5) return "Muy bien";
  return "";
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
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isLoadingCompletionReview, setIsLoadingCompletionReview] =
    useState(false);
  const [hasLoadedCompletionReview, setHasLoadedCompletionReview] =
    useState(false);
  const [reviewBlocks, setReviewBlocks] = useState<ReviewLessonBlock[]>([]);
  const [completionReviewError, setCompletionReviewError] = useState<
    string | null
  >(null);
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

  const openCompleteLessonModal = async () => {
    setIsCompleteModalOpen(true);
    setCompletionReviewError(null);
    setIsLoadingCompletionReview(true);
    setHasLoadedCompletionReview(false);
    setReviewBlocks([]);

    try {
      const response = await fetch(`/api/lessons/${lesson.id}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | LessonDetailApiResponse
        | null;

      if (!response.ok) {
        throw new Error(
          data?.error ?? "Error al cargar la revisión de la clase",
        );
      }

      setReviewBlocks((data?.item?.blocks ?? []) as ReviewLessonBlock[]);
      setHasLoadedCompletionReview(true);
    } catch (error) {
      setCompletionReviewError(
        error instanceof Error ? error.message : "Error desconocido",
      );
    } finally {
      setIsLoadingCompletionReview(false);
    }
  };

  const updateReviewBlockRating = (blockKey: string, rating: number) => {
    if (!BLOCK_SUCCESS_RATINGS.some((value) => value === rating)) {
      return;
    }

    setReviewBlocks((currentBlocks) =>
      currentBlocks.map((block, index) =>
        getReviewBlockKey(block, index) === blockKey
          ? { ...block, blockSuccessRating: rating }
          : block,
      ),
    );
  };

  const saveBlockRatings = async () => {
    const response = await fetch(`/api/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocks: mapBlocksToPatchPayload(reviewBlocks),
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(data?.error ?? "Error al guardar las valoraciones");
    }
  };

  const confirmCompleteLesson = async () => {
    try {
      setIsCompletingLesson(true);
      setCompletionReviewError(null);

      await saveBlockRatings();

      const response = await fetch(`/api/lessons/${lesson.id}/complete`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | CompleteLessonApiResponse
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Error al completar la clase");
      }

      setLocalLessonStatus("completed");

      if (data?.item?.attendees) {
        setAttendees(data.item.attendees);
      }

      setIsCompleteModalOpen(false);
    } catch (error) {
      setCompletionReviewError(
        error instanceof Error ? error.message : "Error desconocido",
      );
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
    <>
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

        {!isCompleted && (
          <button
            type="button"
            disabled={!canCompleteLesson || isCompletingLesson}
            onClick={openCompleteLessonModal}
            className="cursor-pointer mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserCheck size={15} />
            {isCompletingLesson
              ? "Completando..."
              : hasPendingAttendance
                ? "Marca asistencia primero"
                : "Completar clase"}
          </button>
        )}
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

      <CustomModal
        isOpen={isCompleteModalOpen}
        onClose={() => {
          if (!isCompletingLesson) {
            setIsCompleteModalOpen(false);
          }
        }}
        title="Completar clase"
        maxWidth="3xl"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-300">
            Valora rápidamente qué tal funcionó cada bloque antes de cerrar la
            clase.
          </p>

          {isLoadingCompletionReview && (
            <div className="rounded-2xl border border-gray-600 bg-gray-700/60 p-4 text-sm text-gray-200">
              Cargando bloques...
            </div>
          )}

          {completionReviewError && (
            <div className="rounded-2xl border border-red-400/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
              {completionReviewError}
            </div>
          )}

          {hasLoadedCompletionReview && reviewBlocks.length === 0 && (
            <div className="rounded-2xl border border-gray-600 bg-gray-700/60 p-4 text-sm text-gray-200">
              Esta clase no tiene bloques para valorar.
            </div>
          )}

          {hasLoadedCompletionReview && reviewBlocks.length > 0 && (
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {reviewBlocks.map((block, index) => {
                const blockKey = getReviewBlockKey(block, index);
                const selectedRating = block.blockSuccessRating;

                return (
                  <article
                    key={blockKey}
                    className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-900"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xs font-semibold text-gray-600">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">
                            {block.title}
                          </h3>
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                            {formatLabel(
                              block.completionStatus ?? "not_completed",
                            )}
                          </span>
                        </div>

                        {block.plannedContent && (
                          <p className="mt-1 line-clamp-1 text-sm text-gray-500">
                            {block.plannedContent}
                          </p>
                        )}

                        <p className="mt-4 text-xs font-medium uppercase tracking-wide text-gray-400">
                          ¿Qué tal funcionó este bloque?
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {BLOCK_SUCCESS_RATINGS.map((rating) => {
                            const isSelected = selectedRating === rating;

                            return (
                              <button
                                key={rating}
                                type="button"
                                disabled={isCompletingLesson}
                                onClick={() =>
                                  updateReviewBlockRating(blockKey, rating)
                                }
                                className={`h-9 w-9 rounded-xl border text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                  isSelected
                                    ? "border-[#9e2727]/30 bg-[#9e2727]/10 text-[#9e2727]"
                                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                {rating}
                              </button>
                            );
                          })}
                        </div>

                        {selectedRating !== undefined && (
                          <p className="mt-2 text-xs font-medium text-[#9e2727]">
                            {getRatingLabel(selectedRating)}
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-gray-600 pt-4">
            <button
              type="button"
              disabled={isCompletingLesson}
              onClick={() => setIsCompleteModalOpen(false)}
              className="cursor-pointer rounded-xl border border-gray-500 bg-transparent px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={
                isCompletingLesson ||
                isLoadingCompletionReview ||
                !hasLoadedCompletionReview
              }
              onClick={confirmCompleteLesson}
              className="cursor-pointer rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#8d2323] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isCompletingLesson
                ? "Completando..."
                : "Guardar y completar"}
            </button>
          </div>
        </div>
      </CustomModal>
    </>
  );
}
