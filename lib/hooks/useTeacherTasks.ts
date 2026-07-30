"use client";

import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import type {
  TeacherTaskDTO,
  TeacherTaskPriority,
  TeacherTasksResponseDTO,
} from "@/lib/dto/teacher-task.dto";
import type {
  CreateTeacherTaskInput,
  UpdateTeacherTaskInput,
} from "@/lib/validators/teacher-task.schema";

const TEACHER_TASKS_ENDPOINT =
  "/api/teacher-tasks?status=all_visible";
const TEACHER_TASK_STATS_ENDPOINT = "/api/teacher-tasks/stats";

type TeacherTaskMutationResponse = {
  item?: TeacherTaskDTO;
  error?: string;
};

async function readApiError(response: Response) {
  const data = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;

  return data?.error ?? "No se pudo completar la operación.";
}

async function fetchTeacherTasks(url: string) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as TeacherTasksResponseDTO;
}

export function useTeacherTasks() {
  const { mutate: mutateCache } = useSWRConfig();
  const { data, error: fetchError, isLoading, mutate } =
    useSWR<TeacherTasksResponseDTO>(
      TEACHER_TASKS_ENDPOINT,
      fetchTeacherTasks,
      {
        revalidateOnFocus: true,
        dedupingInterval: 2000,
      },
    );
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runMutation = useCallback(
    async (
      path: string,
      method: "POST" | "PATCH" | "DELETE",
      payload?: CreateTeacherTaskInput | UpdateTeacherTaskInput,
    ) => {
      setIsMutating(true);
      setMutationError(null);

      try {
        const response = await fetch(path, {
          method,
          headers: payload
            ? { "Content-Type": "application/json" }
            : undefined,
          body: payload ? JSON.stringify(payload) : undefined,
        });

        if (!response.ok) {
          throw new Error(await readApiError(response));
        }

        const result = (await response.json()) as
          | TeacherTaskMutationResponse
          | { ok: true };

        await Promise.all([
          mutate(),
          mutateCache(TEACHER_TASK_STATS_ENDPOINT),
        ]);
        return result;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo completar la operación.";

        setMutationError(message);
        throw error;
      } finally {
        setIsMutating(false);
      }
    },
    [mutate, mutateCache],
  );

  const createTask = useCallback(
    async (payload: CreateTeacherTaskInput) => {
      const result = await runMutation(
        "/api/teacher-tasks",
        "POST",
        payload,
      );

      return "item" in result ? result.item : undefined;
    },
    [runMutation],
  );

  const updateTask = useCallback(
    async (id: string, payload: UpdateTeacherTaskInput) => {
      const result = await runMutation(
        `/api/teacher-tasks/${id}`,
        "PATCH",
        payload,
      );

      return "item" in result ? result.item : undefined;
    },
    [runMutation],
  );

  const completeTask = useCallback(
    (id: string) => updateTask(id, { status: "completed" }),
    [updateTask],
  );

  const reopenTask = useCallback(
    (id: string) => updateTask(id, { status: "open" }),
    [updateTask],
  );

  const changePriority = useCallback(
    (id: string, priority: TeacherTaskPriority) =>
      updateTask(id, { priority }),
    [updateTask],
  );

  const deleteTask = useCallback(
    (id: string) =>
      runMutation(`/api/teacher-tasks/${id}`, "DELETE"),
    [runMutation],
  );

  const refresh = useCallback(async () => {
    setMutationError(null);
    const [tasksResponse] = await Promise.all([
      mutate(),
      mutateCache(TEACHER_TASK_STATS_ENDPOINT),
    ]);

    return tasksResponse;
  }, [mutate, mutateCache]);

  return {
    tasks: data?.items ?? [],
    summary: data?.summary ?? {
      open: 0,
      completed: 0,
      highPriorityOpen: 0,
    },
    createTask,
    updateTask,
    completeTask,
    reopenTask,
    changePriority,
    deleteTask,
    refresh,
    isLoading,
    isMutating,
    error:
      mutationError ??
      (fetchError instanceof Error ? fetchError.message : null),
  };
}
