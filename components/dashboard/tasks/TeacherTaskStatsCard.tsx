"use client";

import {
  ArrowUpRight,
  ListChecks,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { useTeacherTaskStats } from "@/lib/hooks/useTeacherTaskStats";
import TeacherTasksModal from "./TeacherTasksModal";

const currentDateFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Madrid",
});

export default function TeacherTaskStatsCard() {
  const [isOpen, setIsOpen] = useState(false);
  const { stats, isLoading, error } = useTeacherTaskStats();
  const openTotal = stats?.open.total ?? 0;
  const completedToday = stats?.today.completed ?? 0;
  const completedYesterday = stats?.yesterday?.completed ?? 0;
  const completedDelta =
    stats?.trend?.completedDeltaVsYesterday ??
    completedToday - completedYesterday;
  const totalActionable = completedToday + openTotal;
  const progressPercentage =
    totalActionable > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round((completedToday / totalActionable) * 100),
          ),
        )
      : 0;
  const compactDate = currentDateFormatter
    .format(new Date())
    .replace(".", "");
  const completedLabel =
    totalActionable === 0
      ? "Sin tareas para hoy"
      : `${completedToday} ${
          completedToday === 1 ? "completada" : "completadas"
        } hoy`;
  const TrendIcon =
    completedDelta > 0
      ? TrendingUp
      : completedDelta < 0
        ? TrendingDown
        : Minus;
  const trendClassName =
    completedDelta > 0
      ? "text-emerald-700"
      : completedDelta < 0
        ? "text-amber-700"
        : "text-gray-500";
  const trendLabel =
    completedDelta > 0 ? `+${completedDelta}` : `${completedDelta}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir lista de tareas"
        className="group relative mb-6 block w-full max-w-sm cursor-pointer overflow-hidden rounded-3xl border border-stone-200/90 bg-gradient-to-br from-white via-white to-[#f8f1ed] p-5 text-left shadow-[0_12px_35px_rgba(48,52,63,0.07)] transition duration-200 hover:-translate-y-0.5 hover:border-[#b56a4a]/30 hover:shadow-[0_16px_40px_rgba(48,52,63,0.11)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e2727]/40 focus-visible:ring-offset-2"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -bottom-16 size-40 rounded-full bg-[#b56a4a]/8 blur-2xl"
        />

        <span className="relative flex items-start justify-between gap-4">
          <span>
            <span className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-xl border border-[#9e2727]/10 bg-[#9e2727]/8 text-[#9e2727]">
                <ListChecks className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-gray-700">
                Mi lista de tareas
              </span>
            </span>
            <span className="mt-2 block text-xs font-normal text-gray-400">
              {compactDate}
            </span>
          </span>

          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white/80 text-gray-500 shadow-sm transition group-hover:border-[#9e2727]/20 group-hover:text-[#9e2727]">
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </span>

        {isLoading ? (
          <span className="relative mt-7 block space-y-3">
            <span className="block h-12 w-20 animate-pulse rounded-lg bg-gray-100" />
            <span className="block h-4 w-32 animate-pulse rounded bg-gray-100" />
            <span className="block h-1.5 w-full animate-pulse rounded-full bg-gray-100" />
          </span>
        ) : error || !stats ? (
          <span className="relative mt-7 block">
            <span className="block text-sm font-medium text-gray-700">
              No se pudo cargar el resumen
            </span>
            <span className="mt-1 block text-xs text-gray-400">
              Abre la lista para gestionar tus tareas.
            </span>
          </span>
        ) : (
          <span className="relative mt-7 block">
            <span className="block text-5xl font-light leading-none tracking-tight text-gray-900">
              {openTotal}
            </span>
            <span className="mt-1.5 block text-sm font-normal text-gray-500">
              pendientes
            </span>

            <span className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-medium text-gray-600">
                {completedLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1 font-medium ${trendClassName}`}
              >
                <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {trendLabel} vs ayer
              </span>
            </span>

            <span
              role="progressbar"
              aria-label="Progreso de tareas completadas hoy"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercentage}
              className="mt-2.5 block h-1.5 overflow-hidden rounded-full bg-stone-200/80"
            >
              <span
                className="block h-full rounded-full bg-gradient-to-r from-[#b56a4a] to-[#9e2727] transition-[width] duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </span>

            {stats.open.highPriority > 0 && (
              <span className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200/80 bg-amber-50/80 px-3 py-1.5 text-[11px] font-medium text-amber-800">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 rounded-full bg-amber-500"
                />
                {stats.open.highPriority} alta prioridad
              </span>
            )}
          </span>
        )}
      </button>

      {isOpen && (
        <TeacherTasksModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
