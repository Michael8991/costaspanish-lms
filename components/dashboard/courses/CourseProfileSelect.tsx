"use client";

import type { CourseProfileListItemDTO } from "@/lib/dto/course-profile.dto";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const CLASS_TYPE_LABELS: Record<string, string> = {
  private: "Privada",
  pair: "Pareja",
  group_regular: "Grupo regular",
  semi_intensive: "Semi-intensivo",
  intensive: "Intensivo",
};

type CourseProfileSelectProps = {
  value: string;
  onChange: (
    courseId: string,
    course?: CourseProfileListItemDTO,
  ) => void;
  onAvailabilityChange?: (hasActiveCourses: boolean) => void;
  locale: string;
  disabled?: boolean;
};

type CourseListResponse = {
  items?: CourseProfileListItemDTO[];
  error?: string;
};

export default function CourseProfileSelect({
  value,
  onChange,
  onAvailabilityChange,
  locale,
  disabled = false,
}: CourseProfileSelectProps) {
  const [courses, setCourses] = useState<CourseProfileListItemDTO[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const onChangeRef = useRef(onChange);
  const onAvailabilityChangeRef = useRef(onAvailabilityChange);

  useEffect(() => {
    onChangeRef.current = onChange;
    onAvailabilityChangeRef.current = onAvailabilityChange;
  }, [onAvailabilityChange, onChange]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadCourses() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch("/api/course?status=active&limit=100", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => null)) as
          | CourseListResponse
          | null;

        if (!response.ok) {
          throw new Error(data?.error || "No se pudieron cargar los cursos.");
        }

        const activeCourses = data?.items ?? [];
        setCourses(activeCourses);
        onAvailabilityChangeRef.current?.(activeCourses.length > 0);
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudieron cargar los cursos.",
        );
        onAvailabilityChangeRef.current?.(false);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    void loadCourses();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (isLoading || courses.length === 0) return;

    const selectedCourse = courses.find((course) => course.id === value);
    if (selectedCourse) {
      onChangeRef.current(selectedCourse.id, selectedCourse);
      return;
    }

    const firstSelectableCourse = courses.find(
      (course) => course.activeMembersCount > 0,
    );
    if (!value && !disabled && firstSelectableCourse) {
      onChangeRef.current(firstSelectableCourse.id, firstSelectableCourse);
    }
  }, [courses, disabled, isLoading, value]);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("es");
    if (!normalizedSearch) return courses;

    return courses.filter((course) =>
      [course.name, course.internalName, ...course.studentNames]
        .join(" ")
        .toLocaleLowerCase("es")
        .includes(normalizedSearch),
    );
  }, [courses, search]);

  const selectedCourse = courses.find((course) => course.id === value);

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Curso activo
        </label>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por curso o alumno"
          disabled={disabled || isLoading || courses.length === 0}
          className="mb-2 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10 disabled:bg-gray-50"
        />
        <select
          value={value}
          disabled={disabled || isLoading || courses.length === 0}
          onChange={(event) => {
            const course = courses.find(
              (candidate) => candidate.id === event.target.value,
            );
            onChange(event.target.value, course);
          }}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10 disabled:bg-gray-50"
        >
          <option value="">
            {isLoading
              ? "Cargando cursos..."
              : courses.length === 0
                ? "No hay cursos activos"
                : "Selecciona un curso"}
          </option>
          {filteredCourses.map((course) => (
            <option
              key={course.id}
              value={course.id}
              disabled={course.activeMembersCount === 0}
            >
              {course.name} · {CLASS_TYPE_LABELS[course.classType] ?? course.classType} ·{" "}
              {course.activeMembersCount} integrantes
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!isLoading && courses.length === 0 && !error && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
          <p>No hay cursos activos.</p>
          <Link
            href={`/${locale}/dashboard/courses`}
            className="mt-1 inline-flex font-medium text-[#9e2727] hover:underline"
          >
            Crear curso desde plantilla
          </Link>
        </div>
      )}

      {!isLoading &&
        courses.length > 0 &&
        courses.every((course) => course.activeMembersCount === 0) && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Los cursos activos todavía no tienen integrantes activos.
          </p>
        )}

      {selectedCourse && (
        <p className="text-xs text-gray-500">
          {selectedCourse.studentNames.join(", ") || "Sin integrantes activos"} ·{" "}
          {selectedCourse.policySummary.durationMinutes} min ·{" "}
          {selectedCourse.policySummary.creditsPerLesson} crédito
          {selectedCourse.policySummary.creditsPerLesson === 1 ? "" : "s"} por
          clase
        </p>
      )}
    </div>
  );
}
