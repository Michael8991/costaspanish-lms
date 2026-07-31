"use client";

import type { ClassBookResponseDTO } from "@/lib/dto/class-book.dto";
import { shiftFinanceMonth } from "@/lib/utils/finance-format";
import { AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import ClassBookEmptyState from "./ClassBookEmptyState";
import ClassBookFilters, {
  type ClassBookCourseOption,
} from "./ClassBookFilters";
import ClassBookMobileCards from "./ClassBookMobileCards";
import ClassBookSummaryCards from "./ClassBookSummaryCards";
import ClassBookTable from "./ClassBookTable";

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const supportedStatuses = new Set([
  "scheduled",
  "in_progress",
  "completed",
  "canceled_by_teacher",
  "voided",
]);

function getCurrentClassBookMonth(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : now.toISOString().slice(0, 7);
}

function parsePositiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function isClassBookResponse(value: unknown): value is ClassBookResponseDTO {
  if (!value || typeof value !== "object") return false;
  return (
    typeof Reflect.get(value, "month") === "string" &&
    Array.isArray(Reflect.get(value, "rows")) &&
    Boolean(Reflect.get(value, "summary"))
  );
}

function parseCourseOptions(value: unknown): ClassBookCourseOption[] {
  if (!value || typeof value !== "object") return [];
  const items = Reflect.get(value, "items");
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = Reflect.get(item, "id");
    const name = Reflect.get(item, "name");
    if (typeof id !== "string" || typeof name !== "string") return [];
    return [{ id, name }];
  });
}

function getApiError(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const error = Reflect.get(value, "error");
  return typeof error === "string" ? error : null;
}

export default function ClassBookPageClient({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawMonth = searchParams.get("month");
  const month = rawMonth && monthPattern.test(rawMonth)
    ? rawMonth
    : getCurrentClassBookMonth();
  const courseId = searchParams.get("courseId") ?? "";
  const rawStatus = searchParams.get("status") ?? "";
  const status = supportedStatuses.has(rawStatus) ? rawStatus : "";
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const limit = 50;
  const studentId = searchParams.get("studentId") ?? "";

  const [data, setData] = useState<ClassBookResponseDTO | null>(null);
  const [courses, setCourses] = useState<ClassBookCourseOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>, replace = false) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      const href = `${pathname}?${next.toString()}`;
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (!rawMonth || !monthPattern.test(rawMonth)) {
      updateSearchParams({ month, page: null }, true);
    }
  }, [month, rawMonth, updateSearchParams]);

  useEffect(() => {
    const controller = new AbortController();
    const loadCourses = async () => {
      setCoursesLoading(true);
      setCoursesError(false);
      try {
        const response = await fetch("/api/course?status=active&limit=100", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("No se pudo cargar la lista de cursos.");
        }
        const responseBody: unknown = await response.json();
        setCourses(parseCourseOptions(responseBody));
      } catch (caughtError: unknown) {
        if (
          !(caughtError instanceof DOMException) ||
          caughtError.name !== "AbortError"
        ) {
          setCourses([]);
          setCoursesError(true);
        }
      } finally {
        if (!controller.signal.aborted) setCoursesLoading(false);
      }
    };
    void loadCourses();
    return () => controller.abort();
  }, []);

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams({
      month,
      page: String(page),
      limit: String(limit),
    });
    if (courseId) params.set("courseId", courseId);
    if (studentId) params.set("studentId", studentId);
    if (status) params.set("status", status);
    return params.toString();
  }, [courseId, month, page, status, studentId]);

  useEffect(() => {
    const controller = new AbortController();
    const loadClassBook = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/class-book?${apiQuery}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const responseBody: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            getApiError(responseBody) ??
              "No se pudo cargar el libro de clases.",
          );
        }
        if (!isClassBookResponse(responseBody)) {
          throw new Error("No se pudo cargar el libro de clases.");
        }
        setData(responseBody);
      } catch (caughtError: unknown) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }
        setData(null);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "No se pudo cargar el libro de clases.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };
    void loadClassBook();
    return () => controller.abort();
  }, [apiQuery, retryKey]);

  const rows = data?.rows ?? [];
  const pagination = data?.pagination;
  const canGoPrevious = page > 1;
  const canGoNext = Boolean(pagination && page < pagination.totalPages);

  return (
    <div className="space-y-5">
      <ClassBookFilters
        month={month}
        courseId={courseId}
        status={status}
        courses={courses}
        coursesLoading={coursesLoading}
        coursesError={coursesError}
        disabled={isLoading}
        onPreviousMonth={() =>
          updateSearchParams({
            month: shiftFinanceMonth(month, -1),
            page: null,
          })
        }
        onNextMonth={() =>
          updateSearchParams({
            month: shiftFinanceMonth(month, 1),
            page: null,
          })
        }
        onCourseChange={(nextCourseId) =>
          updateSearchParams({ courseId: nextCourseId || null, page: null })
        }
        onStatusChange={(nextStatus) =>
          updateSearchParams({ status: nextStatus || null, page: null })
        }
      />

      <ClassBookSummaryCards
        summary={data?.summary ?? null}
        isLoading={isLoading}
      />

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center"
        >
          <AlertCircle className="mx-auto text-red-600" size={24} />
          <p className="mt-2 font-semibold text-red-800">
            No se pudo cargar el libro de clases.
          </p>
          {error !== "No se pudo cargar el libro de clases." && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
          <button
            type="button"
            onClick={() => setRetryKey((current) => current + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
          >
            <RefreshCw size={15} /> Reintentar
          </button>
        </div>
      ) : (
        <>
          <ClassBookTable rows={rows} locale={locale} isLoading={isLoading} />
          <ClassBookMobileCards
            rows={rows}
            locale={locale}
            isLoading={isLoading}
          />

          {!isLoading && rows.length === 0 && (
            <ClassBookEmptyState hasCourseFilter={Boolean(courseId)} />
          )}

          {!isLoading && pagination && pagination.total > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
              <p>
                Mostrando {rows.length} de {pagination.total} clases
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updateSearchParams({ page: String(page - 1) })
                  }
                  disabled={!canGoPrevious}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} /> Anterior
                </button>
                <span className="min-w-20 text-center text-xs">
                  Página {page} de {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    updateSearchParams({ page: String(page + 1) })
                  }
                  disabled={!canGoNext}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TODO: Export class book to Excel/CSV. */}
      {/* TODO: Add inline edit for notes and attendance. */}
      {/* TODO: Add grouping by week/course/student. */}
      {/* TODO: Add configurable columns. */}
      {/* TODO: Add quick filters for pending preparation and no-shows. */}
    </div>
  );
}
