"use client";

import useSWR from "swr";

import type { TeacherTaskStatsDTO } from "@/lib/dto/teacher-task.dto";

const TEACHER_TASK_STATS_ENDPOINT = "/api/teacher-tasks/stats";

async function fetchTeacherTaskStats(url: string) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    throw new Error(
      data?.error ?? "No se pudieron cargar las estadísticas de tareas.",
    );
  }

  return (await response.json()) as TeacherTaskStatsDTO;
}

export function useTeacherTaskStats() {
  const { data, error, isLoading, mutate } = useSWR<TeacherTaskStatsDTO>(
    TEACHER_TASK_STATS_ENDPOINT,
    fetchTeacherTaskStats,
    {
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    },
  );

  return {
    stats: data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch: mutate,
  };
}
