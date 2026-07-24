"use client";

import { useCallback, useEffect, useState } from "react";

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

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

interface StudentsOverviewApiError {
  error?: string;
}

type StudentsOverviewQuery = {
  page: number;
  limit: number;
  search: string;
  level: string;
  status: string;
  planType: string;
  classType: string;
  planHealth: string;
};

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
  search: string;
  level: string;
  status: string;
  planType: string;
  classType: string;
  planHealth: string;
  hasActiveFilters: boolean;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  setSearch: (value: string) => void;
  setLevel: (value: string) => void;
  setStatus: (value: string) => void;
  setPlanType: (value: string) => void;
  setClassType: (value: string) => void;
  setPlanHealth: (value: string) => void;
  clearFilters: () => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
}

export function useStudentsOverview(): UseStudentsOverviewResult {
  const [items, setItems] = useState<StudentListDTO[]>([]);
  const [pagination, setPagination] =
    useState<StudentListPagination>(INITIAL_PAGINATION);
  const [summary, setSummary] =
    useState<StudentListSummary>(INITIAL_SUMMARY);
  const [page, setPage] = useState(1);
  const [search, setSearchValue] = useState("");
  const [level, setLevelValue] = useState("");
  const [status, setStatusValue] = useState("");
  const [planType, setPlanTypeValue] = useState("");
  const [classType, setClassTypeValue] = useState("");
  const [planHealth, setPlanHealthValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const hasActiveFilters = Boolean(
    search.trim() || level || status || planType || classType || planHealth,
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadStudents() {
      try {
        setIsLoading(true);
        setError(null);

        const params = buildStudentsParams({
          page,
          limit: DEFAULT_LIMIT,
          search: debouncedSearch,
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
    debouncedSearch,
    level,
    page,
    planHealth,
    planType,
    status,
  ]);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setLevel = useCallback((value: string) => {
    setLevelValue(value);
    setPage(1);
  }, []);

  const setStatus = useCallback((value: string) => {
    setStatusValue(value);
    setPage(1);
  }, []);

  const setPlanType = useCallback((value: string) => {
    setPlanTypeValue(value);
    setPage(1);
  }, []);

  const setClassType = useCallback((value: string) => {
    setClassTypeValue(value);
    setPage(1);
  }, []);

  const setPlanHealth = useCallback((value: string) => {
    setPlanHealthValue(value);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchValue("");
    setLevelValue("");
    setStatusValue("");
    setPlanTypeValue("");
    setClassTypeValue("");
    setPlanHealthValue("");
    setPage(1);
  }, []);

  const goToPreviousPage = useCallback(() => {
    if (!pagination.hasPreviousPage) return;
    setPage((currentPage) => Math.max(1, currentPage - 1));
  }, [pagination.hasPreviousPage]);

  const goToNextPage = useCallback(() => {
    if (!pagination.hasNextPage) return;
    setPage((currentPage) =>
      Math.min(pagination.totalPages, currentPage + 1),
    );
  }, [pagination.hasNextPage, pagination.totalPages]);

  return {
    items,
    pagination,
    summary,
    search,
    level,
    status,
    planType,
    classType,
    planHealth,
    hasActiveFilters,
    isLoading,
    hasLoaded,
    error,
    setSearch,
    setLevel,
    setStatus,
    setPlanType,
    setClassType,
    setPlanHealth,
    clearFilters,
    goToPreviousPage,
    goToNextPage,
  };
}
