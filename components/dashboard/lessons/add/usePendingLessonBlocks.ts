"use client";

import { useCallback, useEffect, useState } from "react";
import type { LessonBlockType } from "@/lib/types/lesson";

export type PendingLessonBlock = {
  sourceLessonId: string;
  sourceLessonTitle: string;
  sourceLessonDate: string;
  sourceCourseId?: string;
  sourceStudentIds: string[];
  sourceAttendees: {
    studentId: string;
    studentName?: string;
    studentEmail?: string;
  }[];
  sourceBlockId?: string;
  reason: "carry_over" | "not_completed";
  block: {
    lineageId?: string;
    title: string;
    type: LessonBlockType;
    categories?: LessonBlockType[];
    cefrLevels: string[];
    skills: string[];
    tags: string[];
    resources: string[];
    plannedContent: string;
    estimatedMinutes?: number;
    plannedObjectives: string[];
    nextStepSuggestion?: string;
    completionStatus: string;
    carryOverToNextLesson: boolean;
  };
};

interface UsePendingLessonBlocksInput {
  courseId?: string;
  studentIds: string[];
  excludeLessonId?: string;
  referenceDate?: string;
  enabled: boolean;
}

type PendingBlocksApiResponse = {
  items?: PendingLessonBlock[];
  meta?: PendingBlocksMeta;
  error?: string;
};

export type PendingBlocksMeta = {
  total: number;
  previousLessonPendingCount: number;
};

const emptyMeta: PendingBlocksMeta = {
  total: 0,
  previousLessonPendingCount: 0,
};

export function usePendingLessonBlocks({
  courseId,
  studentIds,
  excludeLessonId,
  referenceDate,
  enabled,
}: UsePendingLessonBlocksInput) {
  const [items, setItems] = useState<PendingLessonBlock[]>([]);
  const [meta, setMeta] = useState<PendingBlocksMeta>(emptyMeta);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);
  const studentIdsKey = Array.from(new Set(studentIds)).sort().join(",");

  const refetch = useCallback(() => {
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const normalizedStudentIds = studentIdsKey
      ? studentIdsKey.split(",")
      : [];

    if (!enabled || (!courseId && normalizedStudentIds.length === 0)) {
      setItems([]);
      setMeta(emptyMeta);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const fetchPendingBlocks = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch("/api/lessons/pending-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: courseId || undefined,
            studentIds: normalizedStudentIds,
            excludeLessonId,
            referenceDate: referenceDate || undefined,
          }),
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | PendingBlocksApiResponse
          | null;

        if (!response.ok) {
          throw new Error(
            data?.error ?? "Error al buscar bloques pendientes",
          );
        }

        setItems(data?.items ?? []);
        setMeta(data?.meta ?? emptyMeta);
      } catch (error) {
        if (controller.signal.aborted) return;

        setItems([]);
        setMeta(emptyMeta);
        setError(error instanceof Error ? error.message : "Error desconocido");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchPendingBlocks();

    return () => controller.abort();
  }, [
    courseId,
    enabled,
    excludeLessonId,
    referenceDate,
    requestVersion,
    studentIdsKey,
  ]);

  return { items, meta, isLoading, error, refetch };
}
