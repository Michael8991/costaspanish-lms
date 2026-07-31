"use client";

import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseCourseLessonsArgs = {
  courseId: string;
};

type CourseLessonsResponse = {
  items?: LessonListDTO[];
  error?: string;
};

const UPCOMING_MARGIN_MS = 2 * 60 * 60 * 1000;

export function useCourseLessons({ courseId }: UseCourseLessonsArgs) {
  const [items, setItems] = useState<LessonListDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referenceTime] = useState(() => Date.now());

  const refetch = useCallback(async () => {
    if (!courseId) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({
        courseId,
        scope: "all",
      });
      const response = await fetch(`/api/lessons?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | CourseLessonsResponse
        | null;

      if (!response.ok) {
        throw new Error(
          data?.error || "No se pudo cargar la actividad del curso.",
        );
      }

      setItems(data?.items ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "No se pudo cargar la actividad del curso.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const { upcomingLessons, historyLessons } = useMemo(() => {
    const upcomingThreshold = referenceTime - UPCOMING_MARGIN_MS;
    const upcoming: LessonListDTO[] = [];
    const history: LessonListDTO[] = [];

    items.forEach((lesson) => {
      const scheduledTime = new Date(lesson.scheduledStart).getTime();
      const hasUpcomingStatus =
        lesson.status === "scheduled" || lesson.status === "in_progress";

      if (
        hasUpcomingStatus &&
        Number.isFinite(scheduledTime) &&
        scheduledTime >= upcomingThreshold
      ) {
        upcoming.push(lesson);
      } else {
        history.push(lesson);
      }
    });

    upcoming.sort(
      (first, second) =>
        new Date(first.scheduledStart).getTime() -
        new Date(second.scheduledStart).getTime(),
    );
    history.sort(
      (first, second) =>
        new Date(second.scheduledStart).getTime() -
        new Date(first.scheduledStart).getTime(),
    );

    return {
      upcomingLessons: upcoming,
      historyLessons: history,
    };
  }, [items, referenceTime]);

  return {
    items,
    upcomingLessons,
    historyLessons,
    isLoading,
    error,
    refetch,
  };
}
