"use client";

import {
  AlertCircle,
  ArrowRight,
  CreditCard,
  GraduationCap,
  Users,
} from "lucide-react";

import type { StudentListSummary } from "@/lib/dto/student.dto";
import type { StudentsQuickFilter } from "@/lib/hooks/useStudentsOverview";

interface SummaryStudentsDataProps {
  summary: StudentListSummary;
  activeQuickFilter: StudentsQuickFilter | null;
  isLoading: boolean;
  onQuickFilterSelect: (filter: StudentsQuickFilter) => void;
}

export default function SummaryStudentsData({
  summary,
  activeQuickFilter,
  isLoading,
  onQuickFilterSelect,
}: SummaryStudentsDataProps) {
  const stats: Array<{
    title: string;
    mobileTitle: string;
    value: number;
    filter: StudentsQuickFilter;
    icon: typeof Users;
  }> = [
    {
      title: "Alumnos Activos",
      mobileTitle: "Activos",
      value: summary.activeStudents,
      filter: "active_students",
      icon: Users,
    },
    {
      title: "Bonos por terminar",
      mobileTitle: "Bonos pendientes",
      value: summary.expiringPlansSoon,
      filter: "expiring_plans",
      icon: AlertCircle,
    },
    {
      title: "Nivel Pendiente",
      mobileTitle: "Nivel pendiente",
      value: summary.pendingLevel,
      filter: "pending_level",
      icon: GraduationCap,
    },
    {
      title: "Sin bono activo",
      mobileTitle: "Sin bono",
      value: summary.studentsWithoutActivePlan,
      filter: "without_active_plan",
      icon: CreditCard,
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl py-6 text-gray-800 md:py-8">
      <div className="mb-6 grid grid-cols-2 gap-3 md:mb-10 md:gap-5 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isActive = activeQuickFilter === stat.filter;

          return (
            <button
              type="button"
              key={stat.title}
              aria-pressed={isActive}
              aria-label={`${stat.title}: ${isLoading ? "cargando" : stat.value}`}
              onClick={() => onQuickFilterSelect(stat.filter)}
              className={`group flex min-h-28 min-w-0 cursor-pointer flex-col items-start justify-between gap-3 rounded-xl bg-white p-5 text-left shadow-[0_2px_12px_-3px_rgba(15,23,42,0.10)] outline-none transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-8px_rgba(15,23,42,0.16)] focus-visible:ring-2 focus-visible:ring-[#9e2727]/30 focus-visible:ring-offset-2 ${
                isActive
                  ? "ring-2 ring-[#9e2727]/25"
                  : ""
              }`}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className="rounded-lg bg-[#9e2727]/10 p-2.5">
                  <Icon
                    className="h-5 w-5 text-[#9e2727]"
                    strokeWidth={2}
                  />
                </div>
                {isActive && (
                  <span className="hidden rounded-full bg-[#9e2727] px-2 py-1 text-[11px] font-semibold text-white md:inline-flex">
                    Filtro activo
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                <p className="order-2 mt-1 text-sm font-medium leading-tight text-gray-500 md:order-1 md:mt-0">
                  <span className="md:hidden">{stat.mobileTitle}</span>
                  <span className="hidden md:inline">{stat.title}</span>
                </p>
                <p className="order-1 text-3xl font-semibold leading-none tracking-tight text-gray-900 md:order-2 md:mt-2">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>

              <span
                className={`mt-1 hidden items-center gap-1 text-xs font-medium md:inline-flex ${
                  isActive ? "text-[#9e2727]" : "text-gray-500"
                }`}
              >
                {isActive ? "Quitar filtro" : "Ver alumnos"}
                <ArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
