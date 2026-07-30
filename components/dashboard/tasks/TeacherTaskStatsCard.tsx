"use client";

import { AlertTriangle, CheckCircle2, ListTodo } from "lucide-react";

import { useTeacherTaskStats } from "@/lib/hooks/useTeacherTaskStats";

export default function TeacherTaskStatsCard() {
  const { stats, isLoading, error, refetch } = useTeacherTaskStats();

  return (
    <section className="mb-6 max-w-sm rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-[#9e2727]/10 text-[#9e2727]">
            <ListTodo className="h-4 w-4" />
          </span>
          <h2 className="text-sm font-semibold text-gray-900">Tareas</h2>
        </div>

        {stats && stats.open.highPriority > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
            <AlertTriangle className="h-3 w-3" />
            {stats.open.highPriority} alta prioridad
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <div className="h-6 w-36 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-44 animate-pulse rounded bg-gray-100" />
        </div>
      ) : error || !stats ? (
        <div className="mt-4">
          <p className="text-sm text-gray-500">
            No se pudo cargar el resumen de tareas.
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="mt-2 cursor-pointer text-xs font-medium text-[#9e2727] underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            {stats.today.completed} completadas hoy
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {stats.today.created} nuevas · {stats.open.total} pendientes
          </p>
        </div>
      )}
    </section>
  );
}
