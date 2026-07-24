"use client";

import { useEffect, useState } from "react";

import type {
  StudentListDTO,
  StudentListPagination,
  StudentListResponse,
  StudentListSummary,
} from "@/lib/dto/student.dto";

const DEFAULT_LIMIT = 10;

const INITIAL_PAGINATION: StudentListPagination = {
  page: 1,
  limit: DEFAULT_LIMIT,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

const INITIAL_SUMMARY: StudentListSummary = {
  activeStudents: 0,
  expiringPlansSoon: 0,
  pendingLevel: 0,
  studentsWithoutActivePlan: 0,
};

interface StudentsOverviewApiError {
  error?: string;
}

export interface StudentsOverviewQuery {
  page: number;
  limit: number;
  search: string;
  level: string;
  status: string;
  planType: string;
  classType: string;
  planHealth: string;
}

export type StudentsQuickFilter =
  | "active_students"
  | "expiring_plans"
  | "pending_level"
  | "without_active_plan";

export function getActiveQuickFilter({
  status,
  level,
  planHealth,
}: Pick<
  StudentsOverviewQuery,
  "status" | "level" | "planHealth"
>): StudentsQuickFilter | null {
  if (status === "active" && !level && !planHealth) {
    return "active_students";
  }

  if (!status && !level && planHealth === "expiring_soon") {
    return "expiring_plans";
  }

  if (!status && level === "pending" && !planHealth) {
    return "pending_level";
  }

  if (!status && !level && planHealth === "no_active_plan") {
    return "without_active_plan";
  }

  return null;
}

function buildStudentsParams(query: StudentsOverviewQuery): URLSearchParams {
  const params = new URLSearchParams();

  params.set("page", String(query.page));
  params.set("limit", String(query.limit));

  if (query.search.trim()) params.set("search", query.search.trim());
  if (query.level) params.set("level", query.level);
  if (query.status) params.set("status", query.status);
  if (query.planType) params.set("planType", query.planType);
  if (query.classType) params.set("classType", query.classType);
  if (query.planHealth) params.set("planHealth", query.planHealth);

  return params;
}

export interface UseStudentsOverviewResult {
  items: StudentListDTO[];
  pagination: StudentListPagination;
  summary: StudentListSummary;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
}

export function useStudentsOverview({
  page,
  limit,
  search,
  level,
  status,
  planType,
  classType,
  planHealth,
}: StudentsOverviewQuery): UseStudentsOverviewResult {
  const [items, setItems] = useState<StudentListDTO[]>([]);
  const [pagination, setPagination] =
    useState<StudentListPagination>(INITIAL_PAGINATION);
  const [summary, setSummary] =
    useState<StudentListSummary>(INITIAL_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStudents() {
      try {
        setIsLoading(true);
        setError(null);

        const params = buildStudentsParams({
          page,
          limit,
          search,
          level,
          status,
          planType,
          classType,
          planHealth,
        });

        const response = await fetch(`/api/students?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json()) as
          | StudentListResponse
          | StudentsOverviewApiError;

        if (!response.ok || !("items" in data)) {
          const apiError = "error" in data ? data.error : undefined;

          throw new Error(
            apiError ?? "No se pudieron cargar los estudiantes.",
          );
        }

        setItems(data.items);
        setPagination(data.pagination);
        setSummary(data.summary);
        setHasLoaded(true);
      } catch (requestError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "No se pudieron cargar los estudiantes.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadStudents();

    return () => controller.abort();
  }, [
    classType,
    level,
    limit,
    page,
    planHealth,
    planType,
    search,
    status,
  ]);

  return {
    items,
    pagination,
    summary,
    isLoading,
    hasLoaded,
    error,
  };
}
