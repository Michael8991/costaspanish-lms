"use client";

import { useCallback, useEffect, useState } from "react";

import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import type {
  LessonCalendarRange,
  LessonCalendarView,
} from "@/lib/utils/lesson-calendar";

type LessonsRangeResponse = {
  items?: LessonListDTO[];
  error?: string;
};

interface UseLessonsArgs {
  view: LessonCalendarView;
  dateValue: string;
  range: LessonCalendarRange;
}

export function useLessons({ view, dateValue, range }: UseLessonsArgs) {
  const [items, setItems] = useState<LessonListDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => setReloadKey((current) => current + 1), []);
  const rangeStart = range.start.toISOString();
  const rangeEnd = range.end.toISOString();

  useEffect(() => {
    const controller = new AbortController();

    async function loadLessons() {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          view: view === "list" ? "week" : view,
          date: dateValue,
          start: rangeStart,
          end: rangeEnd,
        });
        const response = await fetch(`/api/lessons?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | LessonsRangeResponse
          | null;

        if (!response.ok) {
          throw new Error(data?.error ?? "No se pudieron cargar las lecciones.");
        }

        const nextItems = [...(data?.items ?? [])].sort(
          (first, second) =>
            new Date(first.scheduledStart).getTime() -
            new Date(second.scheduledStart).getTime(),
        );
        setItems(nextItems);
      } catch (requestError) {
        if (controller.signal.aborted) return;

        setItems([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar las lecciones.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadLessons();

    return () => controller.abort();
  }, [dateValue, rangeEnd, rangeStart, reloadKey, view]);

  return { items, isLoading, error, refetch };
}
