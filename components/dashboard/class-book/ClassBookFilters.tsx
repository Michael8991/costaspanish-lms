"use client";

import { formatFinanceMonth } from "@/lib/utils/finance-format";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

export interface ClassBookCourseOption {
  id: string;
  name: string;
}

interface ClassBookFiltersProps {
  month: string;
  courseId: string;
  status: string;
  courses: ClassBookCourseOption[];
  coursesLoading: boolean;
  coursesError: boolean;
  disabled: boolean;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onCourseChange: (courseId: string) => void;
  onStatusChange: (status: string) => void;
}

export default function ClassBookFilters({
  month,
  courseId,
  status,
  courses,
  coursesLoading,
  coursesError,
  disabled,
  onPreviousMonth,
  onNextMonth,
  onCourseChange,
  onStatusChange,
}: ClassBookFiltersProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="min-w-60 flex-1">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mes
          </span>
          <div className="flex h-11 items-center justify-between rounded-xl border border-slate-300 bg-white">
            <button
              type="button"
              aria-label="Mes anterior"
              onClick={onPreviousMonth}
              disabled={disabled}
              className="grid h-full w-11 place-items-center rounded-l-xl text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-semibold text-slate-900">
              {formatFinanceMonth(month)}
            </span>
            <button
              type="button"
              aria-label="Mes siguiente"
              onClick={onNextMonth}
              disabled={disabled}
              className="grid h-full w-11 place-items-center rounded-r-xl text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <label className="min-w-64 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Curso
          <select
            value={courseId}
            onChange={(event) => onCourseChange(event.target.value)}
            disabled={disabled || coursesLoading}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium normal-case text-slate-800 outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">
              {coursesLoading
                ? "Cargando cursos..."
                : coursesError
                  ? "Cursos no disponibles"
                  : "Todos los cursos"}
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
          {coursesError && (
            <span className="mt-1 block text-xs font-normal normal-case text-red-600">
              No se pudo cargar la lista de cursos.
            </span>
          )}
        </label>

        <label className="min-w-56 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Estado
          <span className="relative mt-1.5 block">
            <Filter
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={status}
              onChange={(event) => onStatusChange(event.target.value)}
              disabled={disabled}
              className="h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm font-medium normal-case text-slate-800 outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
            >
              <option value="">Todos los estados</option>
              <option value="scheduled">Planificadas</option>
              <option value="in_progress">En curso</option>
              <option value="completed">Completadas</option>
              <option value="canceled_by_teacher">Canceladas</option>
              <option value="voided">Anuladas</option>
            </select>
          </span>
        </label>
      </div>
    </section>
  );
}
