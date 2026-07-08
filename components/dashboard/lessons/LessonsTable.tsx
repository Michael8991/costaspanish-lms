"use client";

import { useLesson } from "@/context/LessonContext";
import { LessonListDTO } from "@/lib/dto/lesson.dto";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import {
  btnBaseStyles,
  btnVariants,
} from "@/components/ui/buttons/CustomizedButtons";

export default function LessonsTable() {
  const { viewMode, selectedDate, goPrevious, goNext, goToday } = useLesson();

  const [isLoading, setIsLoading] = useState(false);
  const [lessons, setLessons] = useState<LessonListDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchLessons = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          view: viewMode,
          date: selectedDate.toISOString(),
        });

        const response = await fetch(`/api/lessons?${params.toString()}`, {
          cache: "no-store",
        });

        const rawText = await response.text();

        console.log("Lessons API raw response:", rawText);

        let data = null;

        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error(
            "La API no está devolviendo JSON. Revisa la pestaña Network o la terminal de Next.",
          );
        }

        if (!response.ok) {
          console.error("Lessons API error:", data);
          throw new Error(data?.error ?? "Error al cargar lecciones");
        }

        setLessons(data.items ?? []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Error desconocido";

        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLessons();

    return () => {
      controller.abort();
    };
  }, [viewMode, selectedDate]);

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Lecciones programadas
          </h2>
          <p className="text-xs text-gray-500">
            Vista actual: {getViewModeLabel(viewMode)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrevious}
            className={`${btnBaseStyles} ${btnVariants.secondary}`}
          >
            <ChevronLeft size={15} />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <button
            type="button"
            onClick={goToday}
            className={`${btnBaseStyles} ${btnVariants.secondary}`}
          >
            <CalendarDays size={15} />
            <span>Hoy</span>
          </button>

          <button
            type="button"
            onClick={goNext}
            className={`${btnBaseStyles} ${btnVariants.secondary}`}
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} />
        ) : lessons.length === 0 ? (
          <EmptyState viewMode={viewMode} />
        ) : viewMode === "day" ? (
          <DayLessonsView lessons={lessons} />
        ) : viewMode === "week" ? (
          <WeekLessonsView lessons={lessons} />
        ) : (
          <MonthLessonsView lessons={lessons} />
        )}
      </div>
    </section>
  );
}

function getViewModeLabel(viewMode: "day" | "week" | "month") {
  if (viewMode === "day") return "Día";
  if (viewMode === "week") return "Semana";
  return "Mes";
}

function LoadingState() {
  return (
    <div className="flex min-h-80 w-full items-center justify-center">
      <div className="p-8 text-center text-gray-500">
        <p className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#9e2727]" />
        Cargando lecciones...
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="flex min-h-80 w-full items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium text-red-600">
          No se pudieron cargar las lecciones.
        </p>
        <p className="mt-1 text-xs text-gray-500">{error}</p>
      </div>
    </div>
  );
}

function EmptyState({ viewMode }: { viewMode: "day" | "week" | "month" }) {
  return (
    <div className="flex min-h-80 w-full items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-gray-700">
          No hay lecciones programadas.
        </p>
        <p className="text-sm text-gray-400">
          No hay lecciones para esta vista de{" "}
          {getViewModeLabel(viewMode).toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

function DayLessonsView({ lessons }: { lessons: LessonListDTO[] }) {
  return (
    <div className="flex flex-col gap-3">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}

function WeekLessonsView({ lessons }: { lessons: LessonListDTO[] }) {
  return (
    <div className="flex flex-col gap-3">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}

function MonthLessonsView({ lessons }: { lessons: LessonListDTO[] }) {
  return (
    <div className="flex flex-col gap-3">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}

function LessonRow({ lesson }: { lesson: LessonListDTO }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-gray-900">
          {lesson.title}
        </span>

        <span className="text-xs text-gray-500">
          {formatLessonDateTime(lesson.scheduledStart, lesson.scheduledEnd)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
          {lesson.attendeesCount} alumno{lesson.attendeesCount === 1 ? "" : "s"}
        </span>

        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
          {lesson.blocksCount} bloque{lesson.blocksCount === 1 ? "" : "s"}
        </span>

        <LessonStatusBadge status={lesson.status} />
      </div>
    </div>
  );
}

function LessonStatusBadge({ status }: { status: LessonListDTO["status"] }) {
  const label =
    status === "scheduled"
      ? "Programada"
      : status === "in_progress"
        ? "En curso"
        : status === "completed"
          ? "Completada"
          : status === "canceled_by_teacher"
            ? "Cancelada"
            : "Anulada";

  return (
    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
      {label}
    </span>
  );
}

function formatLessonDateTime(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const date = startDate.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const startTime = startDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const endTime = endDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} · ${startTime} - ${endTime}`;
}
