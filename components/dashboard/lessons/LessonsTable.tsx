"use client";

import { useLesson } from "@/context/LessonContext";
import { LessonListDTO } from "@/lib/dto/lesson.dto";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Ban,
  XCircle,
  CircleCheck,
  PlayCircle,
  CircleDot,
  Eye,
  Layers3,
  UsersRound,
  BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  btnBaseStyles,
  btnVariants,
} from "@/components/ui/buttons/CustomizedButtons";
import Link from "next/link";

interface LessonTableProps {
  locale: string;
}

export default function LessonsTable({ locale }: LessonTableProps) {
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
          <DayLessonsView lessons={lessons} locale={locale} />
        ) : viewMode === "week" ? (
          <WeekLessonsView lessons={lessons} locale={locale} />
        ) : (
          <MonthLessonsView lessons={lessons} locale={locale} />
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

function DayLessonsView({
  lessons,
  locale,
}: {
  lessons: LessonListDTO[];
  locale: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-gray-50/70 p-3">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} locale={locale} />
      ))}
    </div>
  );
}

function WeekLessonsView({
  lessons,
  locale,
}: {
  lessons: LessonListDTO[];
  locale: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-gray-50/70 p-3">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} locale={locale} />
      ))}
    </div>
  );
}

function MonthLessonsView({
  lessons,
  locale,
}: {
  lessons: LessonListDTO[];
  locale: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-gray-50/70 p-3">
      {lessons.map((lesson) => (
        <LessonRow key={lesson.id} lesson={lesson} locale={locale} />
      ))}
    </div>
  );
}

function LessonRow({
  lesson,
  locale,
}: {
  lesson: LessonListDTO;
  locale: string;
}) {
  const statusMeta = getLessonStatusMeta(lesson.status);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
      <div
        className={`absolute left-0 top-0 h-full w-1 ${statusMeta.sideBarClassName}`}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-500 ring-1 ring-gray-200 transition group-hover:bg-[#9e2727]/10 group-hover:text-[#9e2727] group-hover:ring-[#9e2727]/20">
            <BookOpen size={19} />
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="truncate text-md text-gray-950">{lesson.title}</h3>

              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {getClassTypeLabel(lesson.classType)}
              </span>
            </div>

            <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <CalendarDays size={13} className="text-gray-400" />
              {formatLessonDateTime(lesson.scheduledStart, lesson.scheduledEnd)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <LessonMetricBadge
            icon={<UsersRound size={13} />}
            label={`${lesson.attendeesCount} alumno${
              lesson.attendeesCount === 1 ? "" : "s"
            }`}
            className="bg-blue-50 text-blue-700 ring-blue-100"
          />

          <LessonMetricBadge
            icon={<Layers3 size={13} />}
            label={`${lesson.blocksCount} bloque${
              lesson.blocksCount === 1 ? "" : "s"
            }`}
            className="bg-amber-50 text-amber-700 ring-amber-100"
          />

          <LessonStatusBadge status={lesson.status} />

          <Link
            href={`/${locale}/dashboard/lessons/${lesson.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200  px-3 py-1.5 text-xs font-medium  transition hover:bg-[#9e2727] hover:text-white"
          >
            <Eye size={13} />
            Ver
          </Link>
        </div>
      </div>
    </article>
  );
}
function LessonMetricBadge({
  icon,
  label,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${className}`}
    >
      {icon}
      {label}
    </span>
  );
}
function LessonStatusBadge({ status }: { status: LessonListDTO["status"] }) {
  const meta = getLessonStatusMeta(status);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${meta.badgeClassName}`}
    >
      <Icon size={13} />
      {meta.label}
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
function getLessonStatusMeta(status: LessonListDTO["status"]) {
  if (status === "scheduled") {
    return {
      label: "Programada",
      icon: CircleDot,
      badgeClassName: "bg-blue-50 text-blue-700 ring-blue-100",
      sideBarClassName: "bg-blue-500",
    };
  }

  if (status === "in_progress") {
    return {
      label: "En curso",
      icon: PlayCircle,
      badgeClassName: "bg-amber-50 text-amber-700 ring-amber-100",
      sideBarClassName: "bg-amber-500",
    };
  }

  if (status === "completed") {
    return {
      label: "Completada",
      icon: CircleCheck,
      badgeClassName: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      sideBarClassName: "bg-emerald-500",
    };
  }

  if (status === "canceled_by_teacher") {
    return {
      label: "Cancelada",
      icon: XCircle,
      badgeClassName: "bg-red-50 text-red-700 ring-red-100",
      sideBarClassName: "bg-red-500",
    };
  }

  return {
    label: "Anulada",
    icon: Ban,
    badgeClassName: "bg-gray-100 text-gray-700 ring-gray-200",
    sideBarClassName: "bg-gray-400",
  };
}

function getClassTypeLabel(classType: LessonListDTO["classType"]) {
  if (classType === "private") return "Privada";
  if (classType === "pair") return "Pareja";
  if (classType === "group_regular") return "Grupo regular";
  if (classType === "semi_intensive") return "Semi-intensiva";
  if (classType === "intensive") return "Intensiva";

  return classType;
}
