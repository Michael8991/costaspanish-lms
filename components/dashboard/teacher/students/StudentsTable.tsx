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
      const menuHeight = 300;
      const menuWidth = 220;
      const spaceBelow = window.innerHeight - rect.bottom;
      const preferredTop =
        spaceBelow > menuHeight ? rect.bottom + 4 : rect.top - menuHeight - 4;

      setMenuPosition({
        top: Math.min(
          Math.max(8, preferredTop),
          Math.max(8, window.innerHeight - menuHeight - 8),
        ),
        left: Math.min(
          Math.max(8, rect.right - menuWidth),
          Math.max(8, window.innerWidth - menuWidth - 8),
        ),
      });
      setIsOpenQO(studentId);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest("[data-student-menu-trigger]") &&
        !target.closest(".menu-dropdown")
      ) {
        setIsOpenQO(null);
        setMenuPosition(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpenQO(null);
        setMenuPosition(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col items-stretch justify-between gap-3 border-b border-gray-200 bg-gray-50/50 p-4 md:flex-row md:items-center md:gap-4 md:p-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Estudiantes
            <span className="md:hidden"> ({pagination.total})</span>
          </h2>
          {isLoading && students.length > 0 && (
            <span className="text-xs italic text-gray-400">
              Actualizando...
            </span>
          )}
        </div>

        <Link
          href={`/${locale}/dashboard/students/newStudent`}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#9e2727] px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#a85d5d] md:w-auto"
        >
          <Plus size={18} />
          <span>Nuevo Alumno</span>
        </Link>
      </div>

      <div
        data-testid="student-table-body"
        aria-busy={isLoading ? "true" : "false"}
        className={`transition-opacity ${
          isLoading && students.length > 0 ? "opacity-60" : "opacity-100"
        }`}
      >
        {isLoading && students.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-[#9e2727]"></p>
            Cargando estudiantes...
          </div>
        )}

        {error && (
          <div className="flex w-full items-center justify-center gap-2 py-4 text-red-500">
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
        <div className="md:overflow-x-auto">
          <table className="block w-full border-collapse text-left md:table">
            <thead className="hidden md:table-header-group">
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Alumno</th>
                <th className="px-6 py-4 font-medium">Nivel</th>
                <th className="px-6 py-4 font-medium">Estado del Alumno</th>
                <th className="px-6 py-4 font-medium">Planes Activos</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="block divide-y divide-gray-200 md:table-row-group">
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
                    data-testid="student-row"
                    className="group block transition-colors hover:bg-gray-50/50 md:table-row"
                  >
                    <td className="block p-4 md:hidden">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-bold text-gray-600">
                          {student.name.charAt(0)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-gray-900">
                            {student.name}
                          </p>
                          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-sm text-gray-500">
                            <Mail className="shrink-0" size={13} aria-hidden="true" />
                            <span className="truncate">{student.email}</span>
                          </div>

                          <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getLevelBadge(student.level)}`}
                            >
                              {student.level}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                student.status === "active"
                                  ? "border-green-100 bg-green-50 text-green-700"
                                  : "border-gray-200 bg-gray-100 text-gray-600"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  student.status === "active"
                                    ? "bg-green-500"
                                    : "bg-gray-400"
                                }`}
                              />
                              {student.status === "active" ? "Activo" : "Inactivo"}
                            </span>
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                                student.activePlansCount > 0
                                  ? "border-blue-100 bg-blue-50 text-blue-700"
                                  : "border-red-100 bg-red-50 text-red-700"
                              }`}
                            >
                              {student.activePlansCount > 0
                                ? "Bono activo"
                                : "Sin bono"}
                            </span>
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col items-center gap-1 min-[360px]:flex-row">
                          <Link
                            href={withLocale(
                              `/dashboard/students/${student.id}/vouchersHistory`,
                            )}
                            aria-label={`Ver bonos de ${student.name}`}
                            className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 outline-none transition hover:border-[#9e2727] hover:bg-red-50 hover:text-[#9e2727] focus-visible:ring-2 focus-visible:ring-[#9e2727] focus-visible:ring-offset-2"
                          >
                            <CreditCard size={19} aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            data-student-menu-trigger
                            aria-label={`Más acciones para ${student.name}`}
                            aria-haspopup="menu"
                            aria-expanded={isOpenQO === student.id}
                            aria-controls="student-actions-menu"
                            onClick={(event) =>
                              toggleQuickOptionsMenu(student.id, event)
                            }
                            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-gray-500 outline-none transition hover:bg-red-50 hover:text-[#9e2727] focus-visible:ring-2 focus-visible:ring-[#9e2727] focus-visible:ring-offset-2"
                          >
                            <MoreVertical size={20} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </td>

                    <td className="hidden px-6 py-4 md:table-cell">
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

                    <td className="hidden px-6 py-4 md:table-cell">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getLevelBadge(student.level)}`}
                      >
                        {student.level}
                      </span>
                    </td>

                    <td className="hidden px-6 py-4 md:table-cell">
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

                    <td className="hidden min-w-70 px-6 py-4 md:table-cell">
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

                    <td className="hidden px-6 py-4 text-right md:table-cell">
                      <button
                        type="button"
                        data-student-menu-trigger
                        aria-label={`Más acciones para ${student.name}`}
                        aria-haspopup="menu"
                        aria-expanded={isOpenQO === student.id}
                        aria-controls="student-actions-menu"
                        onClick={(e) => toggleQuickOptionsMenu(student.id, e)}
                        className="menu-button cursor-pointer rounded-lg p-2 text-gray-400 outline-none transition-colors hover:bg-red-50 hover:text-[#9e2727] focus-visible:ring-2 focus-visible:ring-[#9e2727] focus-visible:ring-offset-2"
                      >
                        <MoreVertical size={20} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {!error && (!isLoading || students.length > 0) && (
        <div className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50/50 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
          <p className="text-sm text-gray-500">
            Mostrando {rangeStart}–{rangeEnd} de {pagination.total} estudiantes
          </p>

          {pagination.totalPages > 1 && (
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1 md:flex md:w-auto md:gap-2">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={!pagination.hasPreviousPage || isLoading}
                className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 md:px-3"
              >
                Anterior
              </button>

              <span className="px-1 text-center text-xs font-medium text-gray-600 md:px-2 md:text-sm">
                Página {pagination.page} de {pagination.totalPages}
              </span>

              <button
                type="button"
                onClick={onNextPage}
                disabled={!pagination.hasNextPage || isLoading}
                className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 md:px-3"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {isOpenQO && menuPosition && (
        <div
          id="student-actions-menu"
          role="menu"
          aria-label="Acciones del estudiante"
          className="menu-dropdown fixed z-9999 flex max-h-[calc(100vh-1rem)] w-[min(13.75rem,calc(100vw-1rem))] flex-col gap-3 overflow-y-auto rounded-lg bg-[#9e2727] px-4 py-4 shadow-xl"
          style={{ top: menuPosition.top, left: menuPosition.left }}
        >
          {quickOptionsMenu.map((object) => {
            const Icon = object.icon;
            return (
              <Link
                key={object.label}
                role="menuitem"
                onClick={() => {
                  setIsOpenQO(null);
                  setMenuPosition(null);
                }}
                href={withLocale(object.href(isOpenQO))}
                className="flex items-center rounded-lg px-4 py-2 text-white outline-none transition-all duration-200 hover:bg-[#a85d5d] focus-visible:ring-2 focus-visible:ring-white"
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
