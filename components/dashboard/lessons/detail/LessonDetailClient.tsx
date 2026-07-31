"use client";

import { useLessonDetail } from "@/lib/hooks/useLessonDetail";
import LessonDetailHeader from "./LessonDetailHeader";
import { getTotalResources } from "@/lib/utils/lessonDetail-helpers";
import LessonDetailLayout from "./LessonDetailLayout";
import Link from "next/link";

interface LessonDetailClientProps {
  locale: string;
  lessonId: string;
}

export default function LessonDetailClient({
  locale,
  lessonId,
}: LessonDetailClientProps) {
  const { lesson, isLoading, error } = useLessonDetail(lessonId);

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

  return (
    <div className="space-y-6 mt-4">
      <LessonDetailHeader
        locale={locale}
        lesson={lesson}
        resourceIds={resourceIds}
        totalCredits={totalCredits}
      />
      {lesson.courseId && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                Curso asociado
              </p>
              <h2 className="mt-1 text-base font-semibold text-gray-900">
                {lesson.courseName || "Curso"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {lesson.courseLink?.relationType === "course_free_lesson"
                  ? "Clase libre del curso"
                  : "Clase asociada al curso"}{" "}
                · {lesson.classType} · {lesson.attendees.length} integrante
                {lesson.attendees.length === 1 ? "" : "s"}
              </p>
              {lesson.attendees.some((attendee) => attendee.studentName) && (
                <p className="mt-1 text-xs text-gray-500">
                  {lesson.attendees
                    .map((attendee) => attendee.studentName)
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            <Link
              href={`/${locale}/dashboard/courses/${lesson.courseId}`}
              className="inline-flex rounded-xl border border-[#9e2727]/20 bg-[#9e2727]/5 px-3 py-2 text-sm font-medium text-[#9e2727] transition hover:bg-[#9e2727]/10"
            >
              Ver curso
            </Link>
          </div>
        </section>
      )}
      <LessonDetailLayout lesson={lesson} resourceIds={resourceIds} />
    </div>
  );
}
