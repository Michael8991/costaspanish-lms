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
    value: number;
    filter: StudentsQuickFilter;
    icon: typeof Users;
    color: string;
    bg: string;
  }> = [
    {
      title: "Alumnos Activos",
      value: summary.activeStudents,
      filter: "active_students",
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "Bonos por terminar",
      value: summary.expiringPlansSoon,
      filter: "expiring_plans",
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "Nivel Pendiente",
      value: summary.pendingLevel,
      filter: "pending_level",
      icon: GraduationCap,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      title: "Sin bono activo",
      value: summary.studentsWithoutActivePlan,
      filter: "without_active_plan",
      icon: CreditCard,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-gray-800 md:px-8">
      <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isActive = activeQuickFilter === stat.filter;

          return (
            <button
              type="button"
              key={stat.title}
              aria-pressed={isActive}
              onClick={() => onQuickFilterSelect(stat.filter)}
              className={`group flex cursor-pointer flex-col rounded-xl border p-5 text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#9e2727] focus-visible:ring-offset-2 ${
                isActive
                  ? "border-[#9e2727] bg-red-50/50 ring-2 ring-[#9e2727]/10"
                  : "border-gray-200 bg-white hover:border-[#9e2727]/30 hover:shadow-md"
              }`}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className={`rounded-full p-3 ${stat.bg}`}>
                  <Icon className={stat.color} size={24} strokeWidth={2} />
                </div>
                {isActive && (
                  <span className="rounded-full bg-[#9e2727] px-2 py-1 text-[11px] font-semibold text-white">
                    Filtro activo
                  </span>
                )}
              </div>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="mt-1 text-3xl font-bold text-gray-900">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>

              <span
                className={`mt-4 inline-flex items-center gap-1 text-xs font-semibold ${
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
