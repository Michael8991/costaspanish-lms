"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { useLesson } from "@/context/LessonContext";
import { getLessonPeriodLabel, type LessonCalendarView } from "@/lib/utils/lesson-calendar";
import { getLessonCalendarCopy } from "@/lib/utils/lesson-calendar-i18n";

const VIEWS: LessonCalendarView[] = ["day", "week", "month", "list"];

export default function LessonsToolbar() {
  const {
    locale,
    viewMode,
    selectedDate,
    setViewMode,
    goPrevious,
    goNext,
    goToday,
  } = useLesson();
  const copy = getLessonCalendarCopy(locale);
  const periodLabel = getLessonPeriodLabel(viewMode, selectedDate, locale);

  return (
    <div className="mb-4 rounded-xl border border-gray-100/80 bg-white p-3 shadow-sm md:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            <button
              type="button"
              onClick={goPrevious}
              aria-label={copy.previous[viewMode]}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-gray-500 outline-none transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[#9e2727]/30"
            >
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3 text-sm font-medium text-gray-700 outline-none transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:ring-2 focus-visible:ring-[#9e2727]/30"
            >
              <CalendarDays size={15} aria-hidden="true" />
              {copy.today}
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label={copy.next[viewMode]}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-gray-500 outline-none transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-[#9e2727]/30"
            >
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>

          <h2
            aria-live="polite"
            className="min-w-0 text-base font-semibold text-gray-900 sm:text-lg"
          >
            {periodLabel}
          </h2>
        </div>

        <div className="flex min-w-0 flex-col gap-2 min-[430px]:flex-row min-[430px]:items-center xl:justify-end">
          <div
            role="tablist"
            aria-label={locale === "es" ? "Vista de lecciones" : "Lessons view"}
            className="grid min-w-0 flex-1 grid-cols-4 rounded-xl bg-gray-100 p-1 min-[430px]:flex-none"
          >
            {VIEWS.map((view) => (
              <button
                key={view}
                id={`lessons-view-${view}`}
                type="button"
                role="tab"
                aria-selected={viewMode === view}
                aria-controls="lessons-view-panel"
                tabIndex={viewMode === view ? 0 : -1}
                onClick={() => setViewMode(view)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                    return;
                  }

                  event.preventDefault();
                  const direction = event.key === "ArrowRight" ? 1 : -1;
                  const currentIndex = VIEWS.indexOf(view);
                  const nextIndex =
                    (currentIndex + direction + VIEWS.length) % VIEWS.length;
                  const nextView = VIEWS[nextIndex];
                  setViewMode(nextView);
                  document.getElementById(`lessons-view-${nextView}`)?.focus();
                }}
                className={`cursor-pointer rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#9e2727]/30 sm:px-3 ${
                  viewMode === view
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {copy.views[view]}
              </button>
            ))}
          </div>

          <Link
            href={`/${locale}/dashboard/lessons/add`}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#9e2727] px-3.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#8d2323] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e2727]/35 focus-visible:ring-offset-2"
          >
            <Plus size={16} aria-hidden="true" />
            <span className="hidden sm:inline">{copy.newLesson}</span>
            <span className="sm:hidden">{copy.newLessonShort}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
