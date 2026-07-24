"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getActiveQuickFilter,
  useStudentsOverview,
} from "@/lib/hooks/useStudentsOverview";
import type {
  StudentsOverviewQuery,
  StudentsQuickFilter,
} from "@/lib/hooks/useStudentsOverview";

import StudentsFilters from "./StudentsFilters";
import StudentsTable from "./StudentsTable";
import SummaryStudentsData from "./SummaryStudentsData";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

type StudentsQueryUpdates = Partial<StudentsOverviewQuery>;

function parsePositiveInt(
  value: string | null,
  fallback: number,
  maximum = Number.MAX_SAFE_INTEGER,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(Math.trunc(parsed), maximum);
}

export default function StudentsOverview({ locale }: { locale: string }) {
  return (
    <Suspense
      fallback={
        <div className="py-8 text-center text-sm text-gray-500">
          Cargando estudiantes...
        </div>
      }
    >
      <StudentsOverviewContent locale={locale} />
    </Suspense>
  );
}

function StudentsOverviewContent({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveInt(searchParams.get("page"), 1);
  const limit = parsePositiveInt(
    searchParams.get("limit"),
    DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const search = searchParams.get("search") ?? "";
  const level = searchParams.get("level") ?? "";
  const status = searchParams.get("status") ?? "";
  const planType = searchParams.get("planType") ?? "";
  const classType = searchParams.get("classType") ?? "";
  const planHealth = searchParams.get("planHealth") ?? "";
  const [searchInput, setSearchInput] = useState(search);

  const updateStudentsQuery = useCallback(
    (
      updates: StudentsQueryUpdates,
      options?: {
        replace?: boolean;
      },
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === undefined ||
          value === "" ||
          value === "all"
        ) {
          params.delete(key);
          return;
        }

        params.set(key, String(value));
      });

      const queryString = params.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      if (options?.replace) {
        router.replace(nextUrl, { scroll: false });
      } else {
        router.push(nextUrl, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const normalizedSearchInput = searchInput.trim();

    if (normalizedSearchInput === search.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      updateStudentsQuery(
        {
          search: normalizedSearchInput,
          page: 1,
        },
        { replace: true },
      );
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [search, searchInput, updateStudentsQuery]);

  const {
    items,
    pagination,
    summary,
    isLoading,
    hasLoaded,
    error,
  } = useStudentsOverview({
    page,
    limit,
    search,
    level,
    status,
    planType,
    classType,
    planHealth,
  });

  const activeQuickFilter = getActiveQuickFilter({
    status,
    level,
    planHealth,
  });
  const hasActiveFilters = Boolean(
    searchInput.trim() ||
      level ||
      status ||
      planType ||
      classType ||
      planHealth,
  );

  function handleQuickFilterSelect(filter: StudentsQuickFilter) {
    const updates: StudentsQueryUpdates = {
      page: 1,
      status: "",
      level: "",
      planHealth: "",
    };

    if (activeQuickFilter !== filter) {
      if (filter === "active_students") {
        updates.status = "active";
      } else if (filter === "expiring_plans") {
        updates.planHealth = "expiring_soon";
      } else if (filter === "pending_level") {
        updates.level = "pending";
      } else {
        updates.planHealth = "no_active_plan";
      }
    }

    updateStudentsQuery(updates);
  }

  function handleClearFilters() {
    setSearchInput("");
    updateStudentsQuery({
      page: 1,
      search: "",
      level: "",
      status: "",
      planType: "",
      classType: "",
      planHealth: "",
    });
  }

  function handlePreviousPage() {
    if (!pagination.hasPreviousPage) return;

    updateStudentsQuery({
      page: Math.max(page - 1, 1),
    });
  }

  function handleNextPage() {
    if (!pagination.hasNextPage) return;

    updateStudentsQuery({
      page: Math.min(page + 1, pagination.totalPages),
    });
  }

  return (
    <>
      <SummaryStudentsData
        summary={summary}
        activeQuickFilter={activeQuickFilter}
        isLoading={!hasLoaded}
        onQuickFilterSelect={handleQuickFilterSelect}
      />
      <StudentsFilters
        search={searchInput}
        level={level}
        status={status}
        planType={planType}
        classType={classType}
        planHealth={planHealth}
        onSearchChange={setSearchInput}
        onLevelChange={(value) =>
          updateStudentsQuery({ level: value, page: 1 })
        }
        onStatusChange={(value) =>
          updateStudentsQuery({ status: value, page: 1 })
        }
        onPlanTypeChange={(value) =>
          updateStudentsQuery({ planType: value, page: 1 })
        }
        onClassTypeChange={(value) =>
          updateStudentsQuery({ classType: value, page: 1 })
        }
        onPlanHealthChange={(value) =>
          updateStudentsQuery({ planHealth: value, page: 1 })
        }
        onClearFilters={handleClearFilters}
      />
      <StudentsTable
        locale={locale}
        items={items}
        pagination={pagination}
        hasActiveFilters={hasActiveFilters}
        isLoading={isLoading}
        error={error}
        onPreviousPage={handlePreviousPage}
        onNextPage={handleNextPage}
      />
    </>
  );
}
