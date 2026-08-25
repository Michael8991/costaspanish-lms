"use client";

import {
  Ban,
  BookOpen,
  CalendarDays,
  CircleCheck,
  CircleDot,
  ClipboardCheck,
  Clock3,
  Eye,
  Layers3,
  PlayCircle,
  UsersRound,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import { getLessonCalendarCopy } from "@/lib/utils/lesson-calendar-i18n";
import { getLessonStatusVisual } from "@/lib/utils/lesson-status-visuals";

interface LessonsListViewProps {
  locale: string;
  lessons: LessonListDTO[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

export default function LessonsListView({
  locale,
  lessons,
  isLoading,
  error,
  onRetry,
}: LessonsListViewProps) {
  const copy = getLessonCalendarCopy(locale);

  return (
    <section
      data-testid="lessons-list-view"
      aria-busy={isLoading}
      className="rounded-xl border border-gray-100/80 bg-white p-3 shadow-sm sm:p-4"
    >
      {isLoading ? (
        <div className="flex min-h-80 items-center justify-center text-sm text-gray-500">
          <span className="mr-3 h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-b-[#9e2727]" />
          {copy.loading}
        </div>
      ) : error ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-medium text-red-700">{copy.loadError}</p>
          <p className="max-w-lg text-xs text-gray-500">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {copy.retry}
          </button>
        </div>
      ) : lessons.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center text-sm text-gray-500">
          {copy.emptyList}
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl bg-gray-50/70 p-2 sm:p-3">
          {lessons.map((lesson) => (
            <LessonRow key={lesson.id} lesson={lesson} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}

function LessonRow({ lesson, locale }: { lesson: LessonListDTO; locale: string }) {
  const statusMeta = getLessonStatusMeta(lesson.status);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md">
      <div
        aria-hidden="true"
        className={`absolute left-0 top-0 h-full w-1 ${statusMeta.sideBarClassName}`}
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-gray-500 ring-1 ring-gray-200 transition group-hover:bg-[#9e2727]/10 group-hover:text-[#9e2727] group-hover:ring-[#9e2727]/20">
            <BookOpen size={19} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base text-gray-950">{lesson.title}</h3>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
                {getClassTypeLabel(lesson.classType, locale)}
              </span>
              <LessonPreparationBadge
                status={lesson.preparationStatus}
                locale={locale}
              />
            </div>

            <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <CalendarDays size={13} className="text-gray-400" aria-hidden="true" />
              {formatLessonDateTime(
                lesson.scheduledStart,
                lesson.scheduledEnd,
                locale,
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <MetricBadge
            icon={<UsersRound size={13} aria-hidden="true" />}
            label={`${lesson.attendeesCount} ${locale === "es" ? "alumno" : "student"}${lesson.attendeesCount === 1 ? "" : "s"}`}
            className="bg-blue-50 text-blue-700 ring-blue-100"
          />
          <MetricBadge
            icon={<Layers3 size={13} aria-hidden="true" />}
            label={`${lesson.blocksCount} ${locale === "es" ? "bloque" : "block"}${lesson.blocksCount === 1 ? "" : "s"}`}
            className="bg-amber-50 text-amber-700 ring-amber-100"
          />
          <LessonStatusBadge status={lesson.status} />
          <Link
            href={`/${locale}/dashboard/lessons/${lesson.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium transition hover:bg-[#9e2727] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e2727]/30"
          >
            <Eye size={13} aria-hidden="true" />
            {locale === "es" ? "Ver" : "View"}
          </Link>
        </div>
      </div>
    </article>
  );
}

function MetricBadge({
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
      <Icon size={13} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function LessonPreparationBadge({
  status,
  locale,
}: {
  status: LessonListDTO["preparationStatus"];
  locale: string;
}) {
  const isPrepared = status === "prepared";
  const Icon = isPrepared ? ClipboardCheck : Clock3;
  const copy = getLessonCalendarCopy(locale);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
        isPrepared
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-amber-50 text-amber-700 ring-amber-100"
      }`}
    >
      <Icon size={11} aria-hidden="true" />
      {isPrepared ? copy.prepared : copy.needsPreparation}
    </span>
  );
}

function getLessonStatusMeta(status: LessonListDTO["status"]) {
  const visual = getLessonStatusVisual(status);
  const icon =
    status === "scheduled"
      ? CircleDot
      : status === "in_progress"
        ? PlayCircle
        : status === "completed"
          ? CircleCheck
          : status === "canceled_by_teacher"
            ? XCircle
            : Ban;

  return { ...visual, icon };
}

function formatLessonDateTime(start: string, end: string, locale: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const resolvedLocale = locale === "es" ? "es-ES" : "en-GB";
  const date = startDate.toLocaleDateString(resolvedLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const timeFormatter = new Intl.DateTimeFormat(resolvedLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} · ${timeFormatter.format(startDate)}–${timeFormatter.format(endDate)}`;
}

function getClassTypeLabel(
  classType: LessonListDTO["classType"],
  locale: string,
) {
  if (locale !== "es") {
    if (classType === "private") return "Private";
    if (classType === "pair") return "Pair";
    if (classType === "group_regular") return "Group";
    if (classType === "semi_intensive") return "Semi-intensive";
    if (classType === "intensive") return "Intensive";
  }

  if (classType === "private") return "Privada";
  if (classType === "pair") return "Pareja";
  if (classType === "group_regular") return "Grupo regular";
  if (classType === "semi_intensive") return "Semi-intensiva";
  if (classType === "intensive") return "Intensiva";

  return classType;
}
