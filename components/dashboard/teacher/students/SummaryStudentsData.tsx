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
    color: string;
    bg: string;
  }> = [
    {
      title: "Alumnos Activos",
      mobileTitle: "Activos",
      value: summary.activeStudents,
      filter: "active_students",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Bonos por terminar",
      mobileTitle: "Bonos pendientes",
      value: summary.expiringPlansSoon,
      filter: "expiring_plans",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Nivel Pendiente",
      mobileTitle: "Nivel pendiente",
      value: summary.pendingLevel,
      filter: "pending_level",
      icon: GraduationCap,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Sin bono activo",
      mobileTitle: "Sin bono",
      value: summary.studentsWithoutActivePlan,
      filter: "without_active_plan",
      icon: CreditCard,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-0 py-5 text-gray-800 md:px-8 md:py-8">
      <div className="mb-5 grid grid-cols-2 gap-2 md:mb-10 md:gap-4 xl:grid-cols-4">
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
              className={`group flex min-h-20 min-w-0 cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#9e2727] focus-visible:ring-offset-2 md:min-h-0 md:flex-col md:items-stretch md:gap-0 md:p-5 ${
                isActive
                  ? "border-[#9e2727] bg-red-50/50 ring-2 ring-[#9e2727]/10"
                  : "border-gray-200 bg-white hover:border-[#9e2727]/30 hover:shadow-md"
              }`}
            >
              <div className="flex shrink-0 items-start justify-between gap-3 md:w-full">
                <div className={`rounded-full p-2 md:p-3 ${stat.bg}`}>
                  <Icon
                    className={`h-5 w-5 md:h-6 md:w-6 ${stat.color}`}
                    strokeWidth={2}
                  />
                </div>
                {isActive && (
                  <span className="hidden rounded-full bg-[#9e2727] px-2 py-1 text-[11px] font-semibold text-white md:inline-flex">
                    Filtro activo
                  </span>
                )}
              </div>

              <div className="flex min-w-0 flex-col md:mt-4">
                <p className="order-2 text-xs font-medium leading-tight text-gray-500 md:order-1 md:text-sm">
                  <span className="md:hidden">{stat.mobileTitle}</span>
                  <span className="hidden md:inline">{stat.title}</span>
                </p>
                <p className="order-1 text-xl font-bold leading-tight text-gray-900 md:order-2 md:mt-1 md:text-3xl">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>

              <span
                className={`mt-4 hidden items-center gap-1 text-xs font-semibold md:inline-flex ${
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
