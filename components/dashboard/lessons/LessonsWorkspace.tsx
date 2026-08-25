"use client";

import { useMemo } from "react";

import LessonsCalendar from "@/components/dashboard/lessons/calendar/LessonsCalendar";
import LessonsListView from "@/components/dashboard/lessons/LessonsListView";
import LessonsToolbar from "@/components/dashboard/lessons/LessonsToolbar";
import { useLesson } from "@/context/LessonContext";
import { useLessons } from "@/lib/hooks/useLessons";
import { getLessonVisibleRange } from "@/lib/utils/lesson-calendar";

export default function LessonsWorkspace() {
  const { locale, viewMode, selectedDate, selectedDateValue } = useLesson();
  const visibleRange = useMemo(
    () => getLessonVisibleRange(viewMode, selectedDate),
    [selectedDate, viewMode],
  );
  const { items, isLoading, error, refetch } = useLessons({
    view: viewMode,
    dateValue: selectedDateValue,
    range: visibleRange,
  });

  return (
    <div className="min-w-0">
      <LessonsToolbar />
      <div
        id="lessons-view-panel"
        role="tabpanel"
        aria-labelledby={`lessons-view-${viewMode}`}
        className="min-w-0 outline-none"
      >
        {viewMode === "list" ? (
          <LessonsListView
            locale={locale}
            lessons={items}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
          />
        ) : (
          <LessonsCalendar
            lessons={items}
            isLoading={isLoading}
            error={error}
            onRetry={refetch}
          />
        )}
      </div>
    </div>
  );
}
