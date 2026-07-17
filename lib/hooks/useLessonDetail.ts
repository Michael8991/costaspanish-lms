"use client";

import { useCallback, useEffect, useState } from "react";
import { LessonDetailDTO } from "@/lib/dto/lesson.dto";

type UseLessonDetailResult = {
  lesson: LessonDetailDTO | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

type LessonDetailApiResponse = {
  item?: LessonDetailDTO;
  error?: string;
};

export function useLessonDetail(
  lessonId: string | null | undefined,
): UseLessonDetailResult {
  const [lesson, setLesson] = useState<LessonDetailDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/lessons/${lessonId}`, {
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as
        | LessonDetailApiResponse
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "Error al cargar la lección.");
      }

      setLesson(data?.item ?? null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";

      setError(message);
      setLesson(null);
    } finally {
      setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  return {
    lesson,
    isLoading,
    error,
    refetch: fetchLesson,
  };
}