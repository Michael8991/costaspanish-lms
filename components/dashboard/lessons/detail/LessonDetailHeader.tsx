"use client";

import { useState } from "react";
import { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import {
  formatLabel,
  formatLessonDate,
} from "@/lib/utils/lessonDetail-helpers";
import {
  CalendarClock,
  CalendarSync,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Edit3,
  FileText,
  Trash2,
} from "lucide-react";
import CustomModal from "@/components/ui/CustomModal";
import RescheduleLessonModalContent from "./RescheduleLessonModalContent";
import DeleteLessonModalContent from "./DeleteLessonModalContent";
import { LessonStatus } from "@/lib/types/lesson";
import Link from "next/link";

interface LessonDetailHeaderProps {
  lesson: LessonDetailDTO;
  resourceIds: string[];
  totalCredits: number;
  locale: string;
}
function getDeleteActionLabel(status: LessonStatus) {
  if (status === "completed") return "Anular clase";
  if (status === "scheduled") return "Cancelar clase";
  if (status === "in_progress") return "Anular clase";
  return "Archivar";
}

function formatMinutesValue(value: number, emptyLabel = "—") {
  return value > 0 ? `${value} min` : emptyLabel;
}

export type RescheduleLessonPayload = {
  scheduledStart: string;
  scheduledEnd: string;
  reason?: string;
};

export default function LessonDetailHeader({
  lesson,
  resourceIds,
  totalCredits,
  locale,
}: LessonDetailHeaderProps) {
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdatingPreparation, setIsUpdatingPreparation] = useState(false);

  const handleDeleteLesson = async () => {
    const response = await fetch(`/api/lessons/${lesson.id}`, {
      method: "DELETE",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Error al borrar la clase");
    }

    setIsDeleteModalOpen(false);
    window.location.href = `/${locale}/dashboard/lessons`;
  };

  const handleRescheduleLesson = async (payload: RescheduleLessonPayload) => {
    const response = await fetch(`/api/lessons/${lesson.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledStart: payload.scheduledStart,
        scheduledEnd: payload.scheduledEnd,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error ?? "Error al aplazar la clase");
    }

    setIsRescheduleModalOpen(false);
    window.location.reload();
  };

  const handleTogglePreparationStatus = async () => {
    try {
      setIsUpdatingPreparation(true);

      const nextStatus =
        lesson.preparationStatus === "prepared"
          ? "needs_preparation"
          : "prepared";

      const response = await fetch(`/api/lessons/${lesson.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preparationStatus: nextStatus,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Error al actualizar la preparación");
      }

      window.location.reload();
    } finally {
      setIsUpdatingPreparation(false);
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#9e2727]/10 px-3 py-1 text-xs font-medium text-[#9e2727]">
                {formatLabel(lesson.status)}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  lesson.preparationStatus === "prepared"
                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-100"
                }`}
              >
                {lesson.preparationStatus === "prepared"
                  ? "Preparada"
                  : "Pendiente de preparar"}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {formatLabel(lesson.classType)}
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {lesson.attendees.length} alumno
                {lesson.attendees.length === 1 ? "" : "s"}
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {lesson.blocks.length} bloque
                {lesson.blocks.length === 1 ? "" : "s"}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-gray-950">{lesson.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock size={15} />
                {formatLessonDate(lesson.scheduledStart, lesson.scheduledEnd)}
              </span>

              <span className="inline-flex items-center gap-1.5">
                <FileText size={15} />
                {resourceIds.length} recurso
                {resourceIds.length === 1 ? "" : "s"}
              </span>

              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} />
                {totalCredits} crédito{totalCredits === 1 ? "" : "s"} previsto
                {totalCredits === 1 ? "" : "s"}
              </span>
            </div>

            <dl className="mt-4 grid max-w-2xl gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <dt className="text-xs text-gray-500">Duración programada</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                  {formatMinutesValue(lesson.totalEstimatedMinutes, "0 min")}
                </dd>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <dt className="text-xs text-gray-500">Real trabajada</dt>
                <dd className="mt-0.5 text-sm font-semibold text-gray-900">
                  {formatMinutesValue(lesson.totalActualMinutes)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePreparationStatus}
              disabled={isUpdatingPreparation}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                lesson.preparationStatus === "prepared"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              {lesson.preparationStatus === "prepared" ? (
                <ClipboardCheck size={15} />
              ) : (
                <Clock3 size={15} />
              )}

              {isUpdatingPreparation
                ? "Actualizando..."
                : lesson.preparationStatus === "prepared"
                  ? ""
                  : ""}
            </button>

            <div className="mx-1 hidden h-7 w-px bg-gray-200 sm:block" />

            <Link
              href={`/${locale}/dashboard/lessons/${lesson.id}/edit`}
              type="button"
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Edit3 size={15} />
              Editar
            </Link>

            <button
              type="button"
              onClick={() => setIsRescheduleModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <CalendarSync size={15} />
              Aplazar
            </button>

            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              <Trash2 size={15} />
              {getDeleteActionLabel(lesson.status)}
            </button>
          </div>
        </div>
      </section>

      <CustomModal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        title="Aplazar clase"
        maxWidth="xl"
      >
        <RescheduleLessonModalContent
          lesson={lesson}
          onClose={() => setIsRescheduleModalOpen(false)}
          onConfirm={handleRescheduleLesson}
        />
      </CustomModal>

      <CustomModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Borrar clase"
        maxWidth="lg"
      >
        <DeleteLessonModalContent
          lesson={lesson}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteLesson}
        />
      </CustomModal>
    </>
  );
}
