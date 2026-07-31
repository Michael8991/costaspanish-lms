"use client";

import { useLessonDetail } from "@/lib/hooks/useLessonDetail";
import AssignLessonToCourseModal from "@/components/dashboard/lessons/AssignLessonToCourseModal";
import LessonDetailHeader from "./LessonDetailHeader";
import { getTotalResources } from "@/lib/utils/lessonDetail-helpers";
import LessonDetailLayout from "./LessonDetailLayout";
import Link from "next/link";
import { useState } from "react";
import type { LessonDetailDTO } from "@/lib/dto/lesson.dto";
import { getLessonCourseRelationLabel } from "@/lib/utils/lesson-course-link-visuals";

interface LessonDetailClientProps {
  locale: string;
  lessonId: string;
}

export default function LessonDetailClient({
  locale,
  lessonId,
}: LessonDetailClientProps) {
  const { lesson, isLoading, error, updateLesson } =
    useLessonDetail(lessonId);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState("");

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Cargando lección...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Lección no encontrada.
      </div>
    );
  }

  const resourceIds = getTotalResources(lesson.blocks);
  const totalCredits = lesson.attendees.reduce(
    (total, attendee) => total + (attendee.creditsToConsume ?? 0),
    0,
  );

  async function unlinkCourse() {
    if (!lesson) return;

    const confirmed = window.confirm(
      "Esto quitará la asociación con el curso. No se modificarán créditos, asistencia ni bonos.",
    );
    if (!confirmed) return;

    try {
      setIsUnlinking(true);
      setUnlinkError("");
      const response = await fetch(`/api/lessons/${lessonId}/course-link`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | { item?: LessonDetailDTO; error?: string }
        | null;

      if (!response.ok || !data?.item) {
        throw new Error(data?.error || "No se pudo desvincular el curso.");
      }

      updateLesson({
        ...lesson,
        courseId: data.item.courseId,
        courseName: data.item.courseName,
        courseTemplateId: data.item.courseTemplateId,
        courseTemplateVersion: data.item.courseTemplateVersion,
        courseLink: data.item.courseLink,
        policySnapshot: data.item.policySnapshot,
      });
    } catch (unlinkCourseError) {
      setUnlinkError(
        unlinkCourseError instanceof Error
          ? unlinkCourseError.message
          : "No se pudo desvincular el curso.",
      );
    } finally {
      setIsUnlinking(false);
    }
  }

  return (
    <div className="space-y-6 mt-4">
      <LessonDetailHeader
        locale={locale}
        lesson={lesson}
        resourceIds={resourceIds}
        totalCredits={totalCredits}
      />
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Curso asociado
            </p>
            {lesson.courseId ? (
              <>
                <h2 className="mt-1 text-base font-semibold text-gray-900">
                  {lesson.courseName || "Curso"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {getLessonCourseRelationLabel(
                    lesson.courseLink?.relationType,
                  )}{" "}
                  · {lesson.classType} · {lesson.attendees.length} integrante
                  {lesson.attendees.length === 1 ? "" : "s"}
                </p>
                {lesson.courseTemplateVersion && (
                  <p className="mt-1 text-xs text-gray-500">
                    Plantilla v{lesson.courseTemplateVersion}
                    {lesson.courseTemplateId
                      ? ` · ${lesson.courseTemplateId}`
                      : ""}
                  </p>
                )}
                {lesson.courseLink?.sourceTemplateLesson && (
                  <p className="mt-1 text-xs text-gray-500">
                    {lesson.courseLink.sourceTemplateLesson.moduleTitle ||
                      `Módulo ${lesson.courseLink.sourceTemplateLesson.moduleOrder + 1}`}
                    {" · "}
                    {lesson.courseLink.sourceTemplateLesson.lessonTitle ||
                      `Clase ${lesson.courseLink.sourceTemplateLesson.lessonOrder + 1}`}
                  </p>
                )}
                {lesson.courseLink?.linkedAt && (
                  <p className="mt-1 text-xs text-gray-500">
                    Vinculada el{" "}
                    {new Intl.DateTimeFormat("es-ES", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(lesson.courseLink.linkedAt))}
                  </p>
                )}
                {lesson.courseLink?.notes && (
                  <p className="mt-2 max-w-2xl text-sm text-gray-600">
                    {lesson.courseLink.notes}
                  </p>
                )}
                {lesson.attendees.some((attendee) => attendee.studentName) && (
                  <p className="mt-2 text-xs text-gray-500">
                    {lesson.attendees
                      .map((attendee) => attendee.studentName)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-gray-600">
                Clase libre sin curso asociado.
              </p>
            )}
            {unlinkError && (
              <p className="mt-3 text-sm text-red-600">{unlinkError}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {lesson.courseId && (
              <Link
                href={`/${locale}/dashboard/courses/${lesson.courseId}`}
                className="inline-flex rounded-xl border border-[#9e2727]/20 bg-[#9e2727]/5 px-3 py-2 text-sm font-medium text-[#9e2727] transition hover:bg-[#9e2727]/10"
              >
                Ver curso
              </Link>
            )}
            <button
              type="button"
              onClick={() => setIsCourseModalOpen(true)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              {lesson.courseId ? "Cambiar curso" : "Asignar a curso"}
            </button>
            {lesson.courseId && (
              <button
                type="button"
                onClick={() => void unlinkCourse()}
                disabled={isUnlinking}
                className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50"
              >
                {isUnlinking ? "Desvinculando..." : "Desvincular"}
              </button>
            )}
          </div>
        </div>
      </section>

      {isCourseModalOpen && (
        <AssignLessonToCourseModal
          isOpen
          onClose={() => setIsCourseModalOpen(false)}
          lesson={lesson}
          locale={locale}
          onAssigned={(assignedLesson) =>
            updateLesson({
              ...lesson,
              courseId: assignedLesson.courseId,
              courseName: assignedLesson.courseName,
              courseTemplateId: assignedLesson.courseTemplateId,
              courseTemplateVersion: assignedLesson.courseTemplateVersion,
              courseLink: assignedLesson.courseLink,
              policySnapshot: assignedLesson.policySnapshot,
            })
          }
        />
      )}
      <LessonDetailLayout lesson={lesson} resourceIds={resourceIds} />
    </div>
  );
}
