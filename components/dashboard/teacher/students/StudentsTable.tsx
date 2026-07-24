"use client";

import type {
  StudentListDTO,
  StudentListPagination,
} from "@/lib/dto/student.dto";
import {
  Plus,
  MoreVertical,
  Mail,
  LucideIcon,
  FileUser,
  CreditCard,
  UserRoundPen,
  Send,
  CalendarPlus,
  AlertCircle,
  BrushCleaning,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QuickOptionsMenu = {
  label: string;
  href: (id: string) => string;
  icon: LucideIcon;
};

const quickOptionsMenu: QuickOptionsMenu[] = [
  {
    label: "Profile details",
    href: (id) => `/dashboard/students/${id}`,
    icon: FileUser,
  },
  {
    label: "View Vouchers",
    href: (id) => `/dashboard/students/${id}/vouchersHistory`,
    icon: CreditCard,
  },
  {
    label: "New Lesson",
    href: () => `/dashboard/lessons/add`,
    icon: CalendarPlus,
  },
  {
    label: "Edit Student",
    href: (id) => `/dashboard/students/${id}/editStudent`,
    icon: UserRoundPen,
  },
  {
    label: "Send email",
    href: (id) => `/dashboard/students/${id}?action=email`,
    icon: Send,
  },
];

const getLevelBadge = (level: string) => {
  if (level === "Evaluando")
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (["A1", "A2"].includes(level))
    return "bg-green-100 text-green-700 border-green-200";
  if (["B1", "B2"].includes(level))
    return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-purple-100 text-purple-700 border-purple-200";
};

type StudentTableRow = {
  id: string;
  name: string;
  email: string;
  level: string;
  status: "active" | "inactive";
  activePlansCount: number;
  highlightedPlanName: string;
  highlightedPlanCreditsRemaining: number;
  highlightedPlanCreditsTotal: number;
};

interface StudentsTableProps {
  locale: string;
  items: StudentListDTO[];
  pagination: StudentListPagination;
  hasActiveFilters: boolean;
  isLoading: boolean;
  error: string | null;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

export default function StudentsTable({
  locale,
  items,
  pagination,
  hasActiveFilters,
  isLoading,
  error,
  onPreviousPage,
  onNextPage,
}: StudentsTableProps) {
  const withLocale = (path: string) =>
    `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
  const students = useMemo<StudentTableRow[]>(() => {
    return items.map((student) => {
      const activePlans = student.activePlans.filter(
        (plan) => plan.status === "active",
      );
      const highlightedPlan =
        [...activePlans].sort(
          (a, b) => (b.creditsRemaining ?? 0) - (a.creditsRemaining ?? 0),
        )[0] ?? null;

      return {
        id: student.id,
        name: student.fullName,
        email: student.contactEmail,
        level: student.level,
        status: student.status,
        activePlansCount: activePlans.length,
        highlightedPlanName: highlightedPlan?.name ?? "Sin planes activos",
        highlightedPlanCreditsRemaining: highlightedPlan?.creditsRemaining ?? 0,
        highlightedPlanCreditsTotal: highlightedPlan?.creditsTotal ?? 0,
      };
    });
  }, [items]);
  const rangeStart =
    pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const [isOpenQO, setIsOpenQO] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const toggleQuickOptionsMenu = (
    studentId: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (isOpenQO === studentId) {
      setIsOpenQO(null);
      setMenuPosition(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      const menuHeight = 260;
      const menuWidth = 220;
      const spaceBelow = window.innerHeight - rect.bottom;

      setMenuPosition({
        top:
          spaceBelow > menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4,
        left: rect.right - menuWidth,
      });
      setIsOpenQO(studentId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest(".menu-button") &&
        !target.closest(".menu-dropdown")
      ) {
        setIsOpenQO(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">Students</h2>
          {isLoading && students.length > 0 && (
            <span className="text-xs italic text-gray-400">
              Actualizando...
            </span>
          )}
        </div>

        <Link
          href={`/${locale}/dashboard/students/newStudent`}
          className="w-full sm:w-auto bg-[#9e2727] hover:bg-[#a85d5d] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm font-medium text-sm"
        >
          <Plus size={18} />
          <span>Nuevo Alumno</span>
        </Link>
      </div>

      {isLoading && students.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e2727] mx-auto mb-4"></p>
          Cargando estudiantes...
        </div>
      )}

      {error && (
        <div className="w-full flex items-center justify-center py-4 gap-2 text-red-500">
          <AlertCircle size={16} />
          No se pudieron cargar los estudiantes.
        </div>
      )}

      {!isLoading && !error && students.length <= 0 && (
        <div className="flex items-center justify-center py-5 gap-2 text-green-900">
          {hasActiveFilters
            ? "No hay estudiantes que coincidan con los filtros."
            : "No hay estudiantes todavía."}
          <BrushCleaning size={16} />
        </div>
      )}

      {!error && students.length > 0 && (
        <div
          className={`overflow-x-auto transition-opacity ${
            isLoading ? "opacity-60" : "opacity-100"
          }`}
        >
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Alumno</th>
                <th className="px-6 py-4 font-medium">Nivel</th>
                <th className="px-6 py-4 font-medium">Estado del Alumno</th>
                <th className="px-6 py-4 font-medium">Planes Activos</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => {
                const progressPercentage =
                  student.highlightedPlanCreditsTotal > 0
                    ? Math.min(
                        100,
                        Math.max(
                          0,
                          (student.highlightedPlanCreditsRemaining /
                            student.highlightedPlanCreditsTotal) *
                            100,
                        ),
                      )
                    : 0;

                return (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Mail size={12} />
                            <span>{student.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getLevelBadge(student.level)}`}
                      >
                        {student.level}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
                          student.status === "active"
                            ? "bg-green-50 text-green-700 border-green-100"
                            : "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            student.status === "active"
                              ? "bg-green-500"
                              : "bg-gray-400"
                          }`}
                        ></span>
                        {student.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </td>

                    <td className="px-6 py-4 min-w-70">
                      {student.activePlansCount > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                              {student.activePlansCount}{" "}
                              {student.activePlansCount === 1
                                ? "plan activo"
                                : "planes activos"}
                            </span>
                          </div>

                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 w-75">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {student.highlightedPlanName}
                              </p>
                              <span className="text-xs truncate text-gray-500 whitespace-nowrap">
                                {student.highlightedPlanCreditsRemaining}/
                                {student.highlightedPlanCreditsTotal}
                              </span>
                            </div>

                            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#9e2727] rounded-full transition-all"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Sin planes activos
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => toggleQuickOptionsMenu(student.id, e)}
                        className="menu-button p-2 text-gray-400 hover:text-[#9e2727] hover:bg-red-50 rounded-lg transition-colors hover:cursor-pointer"
                      >
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!error && (!isLoading || students.length > 0) && (
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {rangeStart}–{rangeEnd} de {pagination.total} estudiantes
          </p>

          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={!pagination.hasPreviousPage || isLoading}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>

              <span className="px-2 text-sm font-medium text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={onNextPage}
                disabled={!pagination.hasNextPage || isLoading}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {isOpenQO && menuPosition && (
        <div
          className="menu-dropdown fixed z-9999 py-4 px-4 min-w-55 flex flex-col rounded-lg bg-[#9e2727] gap-3 shadow-xl"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {quickOptionsMenu.map((object, index) => {
            const Icon = object.icon;
            return (
              <Link
                key={index}
                onClick={() => {
                  setIsOpenQO(null);
                  setMenuPosition(null);
                }}
                href={withLocale(object.href(isOpenQO))}
                className="flex items-center hover:bg-[#a85d5d] py-2 px-4 rounded-lg text-white transition-all duration-200"
              >
                <Icon size={18} className="me-2" />
                {object.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
