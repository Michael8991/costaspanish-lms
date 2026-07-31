"use client";

import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import { useCourseLessons } from "@/lib/hooks/useCourseLessons";
import {
  getLessonCourseRelationBadgeClassName,
  getLessonCourseRelationLabel,
} from "@/lib/utils/lesson-course-link-visuals";
import { getLessonStatusVisual } from "@/lib/utils/lesson-status-visuals";
import { ArrowRight, CalendarDays, Clock3, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type CourseProfileLessonsSectionProps = {
  courseId: string;
  locale: string;
};

function formatLessonDateTime(lesson: LessonListDTO) {
  const start = new Date(lesson.scheduledStart);
  const end = new Date(lesson.scheduledEnd);

  try {
    const date = new Intl.DateTimeFormat("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: lesson.timezone,
    }).format(start);
    const timeFormatter = new Intl.DateTimeFormat("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: lesson.timezone,
    });

    return `${date} · ${timeFormatter.format(start)}–${timeFormatter.format(end)}`;
  } catch {
    return new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(start);
  }
}

function LessonActivityRow({
  lesson,
  locale,
}: {
  lesson: LessonListDTO;
  locale: string;
}) {
  const statusVisual = getLessonStatusVisual(lesson.status);
  const relationType = lesson.courseLink?.relationType;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusVisual.badgeClassName}`}
            >
              {statusVisual.label}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getLessonCourseRelationBadgeClassName(relationType)}`}
            >
              {getLessonCourseRelationLabel(relationType)}
            </span>
            {(lesson.status === "scheduled" ||
              lesson.status === "in_progress") && (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
                  lesson.preparationStatus === "prepared"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : "bg-amber-50 text-amber-700 ring-amber-100"
                }`}
              >
                {lesson.preparationStatus === "prepared"
                  ? "Preparada"
                  : "Por preparar"}
              </span>
            )}
          </div>

          <h3 className="mt-3 truncate font-semibold text-slate-950">
            {lesson.title}
          </h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" />
            {formatLessonDateTime(lesson)}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <UsersRound className="h-3.5 w-3.5" />
              {lesson.attendeesCount} integrante
              {lesson.attendeesCount === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {lesson.scheduledDurationMinutes} min
            </span>
            {lesson.blocksCount > 0 && (
              <span>
                {lesson.blocksCount} bloque
                {lesson.blocksCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>

        <Link
          href={`/${locale}/dashboard/lessons/${lesson.id}`}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Ver clase
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export default function CourseProfileLessonsSection({
  courseId,
  locale,
}: CourseProfileLessonsSectionProps) {
  const {
    upcomingLessons,
    historyLessons,
    isLoading,
    error,
    refetch,
  } = useCourseLessons({ courseId });
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const visibleUpcoming = showAllUpcoming
    ? upcomingLessons
    : upcomingLessons.slice(0, 5);
  const visibleHistory = showAllHistory
    ? historyLessons
    : historyLessons.slice(0, 8);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">
          Actividad del curso
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Estas son las clases reales programadas o impartidas. Pueden seguir
          el plan de la plantilla o ser clases extra, repasos o recuperaciones.
        </p>
      </div>

      {isLoading && (
        <div className="mt-5 space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-3 font-semibold hover:underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading &&
        !error &&
        upcomingLessons.length === 0 &&
        historyLessons.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
            <p className="font-medium text-slate-700">
              No hay clases asociadas a este curso todavía.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Cuando crees una clase desde este curso o asignes una clase
              existente, aparecerá aquí.
            </p>
          </div>
        )}

      {!isLoading &&
        !error &&
        (upcomingLessons.length > 0 || historyLessons.length > 0) && (
          <div className="mt-6 space-y-8">
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Próximas clases
                  </h3>
                  <p className="text-xs text-slate-500">
                    Programadas y en curso, en orden cronológico.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {upcomingLessons.length}
                </span>
              </div>
              {visibleUpcoming.length > 0 ? (
                <div className="space-y-3">
                  {visibleUpcoming.map((lesson) => (
                    <LessonActivityRow
                      key={lesson.id}
                      lesson={lesson}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No hay próximas clases programadas.
                </p>
              )}
              {upcomingLessons.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllUpcoming((current) => !current)}
                  className="mt-3 text-sm font-semibold text-[#9e2727] hover:underline"
                >
                  {showAllUpcoming ? "Ver menos" : "Ver todas las próximas"}
                </button>
              )}
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Historial</h3>
                  <p className="text-xs text-slate-500">
                    Clases pasadas, completadas, canceladas o anuladas.
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {historyLessons.length}
                </span>
              </div>
              {visibleHistory.length > 0 ? (
                <div className="space-y-3">
                  {visibleHistory.map((lesson) => (
                    <LessonActivityRow
                      key={lesson.id}
                      lesson={lesson}
                      locale={locale}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Todavía no hay clases en el historial.
                </p>
              )}
              {historyLessons.length > 8 && (
                <button
                  type="button"
                  onClick={() => setShowAllHistory((current) => !current)}
                  className="mt-3 text-sm font-semibold text-[#9e2727] hover:underline"
                >
                  {showAllHistory ? "Ver menos" : "Ver todo el historial"}
                </button>
              )}
            </div>
          </div>
        )}
    </section>
  );
}
