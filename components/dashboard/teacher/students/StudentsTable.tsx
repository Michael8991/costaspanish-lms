"use client";

import type {
  StudentListDTO,
  StudentListPagination,
} from "@/lib/dto/student.dto";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import {
  Plus,
  Mail,
  FileUser,
  CreditCard,
  UserRoundPen,
  Send,
  CalendarPlus,
  AlertCircle,
  BrushCleaning,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

type StudentActionDefinition = {
  label: string;
  href: (id: string) => string;
  icon: NonNullable<ActionMenuItem["icon"]>;
};

const studentActionDefinitions: StudentActionDefinition[] = [
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
  if (level === "Evaluando") return "bg-amber-50 text-amber-700";
  if (["A1", "A2"].includes(level)) return "bg-green-50 text-green-700";
  if (["B1", "B2"].includes(level)) return "bg-blue-50 text-blue-700";
  return "bg-purple-50 text-purple-700";
};

const getAvatarPalette = (name: string) => {
  const initial = name.trim().charAt(0).toLocaleUpperCase("es-ES");

  return initial >= "A" && initial <= "M"
    ? "bg-blue-50 text-blue-700"
    : "bg-purple-50 text-purple-700";
};

type VoucherProgress = {
  label: string;
  accessibleLabel: string;
  colorClass: string;
};

function getVoucherProgressLabel(student: StudentTableRow): VoucherProgress {
  if (!student.hasHighlightedVoucher) {
    return {
      label: "Sin bono",
      accessibleLabel: "Sin bono activo",
      colorClass: "bg-red-50 text-red-700",
    };
  }

  const remaining = student.highlightedPlanCreditsRemaining;
  const total = student.highlightedPlanCreditsTotal;
  const hasValidCredits =
    Number.isFinite(remaining) &&
    Number.isFinite(total) &&
    remaining >= 0 &&
    total > 0 &&
    remaining <= total;

  if (!hasValidCredits) {
    return {
      label: "Saldo no disponible",
      accessibleLabel: "Saldo del bono no disponible",
      colorClass: "bg-gray-100 text-gray-600",
    };
  }

  const unit = total === 1 ? "crédito" : "créditos";
  const remainingUnit =
    remaining === 1 ? "crédito restante" : "créditos restantes";
  const colorClass =
    remaining === 0
      ? "bg-red-50 text-red-700"
      : remaining === 1
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return {
    label: `${remaining}/${total} ${unit}`,
    accessibleLabel: `${remaining} ${remainingUnit} de un bono de ${total} ${unit}`,
    colorClass,
  };
}

type StudentTableRow = {
  id: string;
  name: string;
  email: string;
  level: string;
  status: "active" | "inactive";
  activePlansCount: number;
  hasHighlightedVoucher: boolean;
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
        )[0] ??
        student.activePlans.find(
          (plan) =>
            plan.status === "exhausted" && plan.creditsRemaining === 0,
        ) ??
        null;

      return {
        id: student.id,
        name: student.fullName,
        email: student.contactEmail,
        level: student.level,
        status: student.status,
        activePlansCount: activePlans.length,
        hasHighlightedVoucher: highlightedPlan !== null,
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

  return (
    <div className="rounded-xl bg-white shadow-[0_2px_12px_-3px_rgba(15,23,42,0.10)]">
      <div className="flex flex-col items-stretch justify-between gap-3 p-5 md:flex-row md:items-center md:gap-4 md:px-6 md:py-5">
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
                <tr className="bg-gray-50/70 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-4 font-medium">Alumno</th>
                  <th className="px-6 py-4 font-medium">Nivel</th>
                  <th className="px-6 py-4 font-medium">Estado del Alumno</th>
                  <th className="px-6 py-4 font-medium">Planes Activos</th>
                  <th className="px-6 py-4 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="block divide-y divide-gray-100 md:table-row-group">
                {students.map((student) => {
                  const avatarPalette = getAvatarPalette(student.name);
                  const voucherProgress = getVoucherProgressLabel(student);
                  const actionItems: ActionMenuItem[] =
                    studentActionDefinitions.map((action) => ({
                      label: action.label,
                      icon: action.icon,
                      href: withLocale(action.href(student.id)),
                    }));
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
                      <td className="block p-5 md:hidden">
                        <div className="flex min-w-0 items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarPalette}`}
                          >
                            {student.name.charAt(0)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {student.name}
                            </p>
                            <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-gray-500">
                              <Mail
                                className="shrink-0"
                                size={13}
                                aria-hidden="true"
                              />
                              <span className="truncate">{student.email}</span>
                            </div>

                            <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getLevelBadge(student.level)}`}
                              >
                                {student.level}
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                                  student.status === "active"
                                    ? "bg-green-50 text-green-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    student.status === "active"
                                      ? "bg-green-500"
                                      : "bg-gray-400"
                                  }`}
                                />
                                {student.status === "active"
                                  ? "Activo"
                                  : "Inactivo"}
                              </span>
                              <span
                                aria-label={voucherProgress.accessibleLabel}
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${voucherProgress.colorClass}`}
                              >
                                {voucherProgress.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-center gap-1 min-[360px]:flex-row">
                            <ActionMenu
                              items={actionItems}
                              triggerLabel={`Más acciones para ${student.name}`}
                              menuLabel={`Acciones para ${student.name}`}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="hidden px-6 py-4 md:table-cell">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarPalette}`}
                          >
                            {student.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {student.name}
                            </p>
                            <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-gray-500">
                              <Mail
                                className="shrink-0"
                                size={12}
                                aria-hidden="true"
                              />
                              <span className="truncate">{student.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="hidden px-6 py-4 md:table-cell">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${getLevelBadge(student.level)}`}
                        >
                          {student.level}
                        </span>
                      </td>

                      <td className="hidden px-6 py-4 md:table-cell">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            student.status === "active"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
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
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                                {student.activePlansCount}{" "}
                                {student.activePlansCount === 1
                                  ? "plan activo"
                                  : "planes activos"}
                              </span>
                            </div>

                            <div className="w-75 rounded-lg bg-gray-50/80 p-3">
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
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[11px] font-medium text-red-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Sin planes activos
                          </span>
                        )}
                      </td>

                      <td className="hidden px-6 py-4 text-right md:table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <ActionMenu
                            items={actionItems}
                            triggerLabel={`Más acciones para ${student.name}`}
                            menuLabel={`Acciones para ${student.name}`}
                          />
                        </div>
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
        <div className="flex flex-col gap-3 bg-gray-50/50 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
          <p className="text-sm text-gray-500">
            Mostrando {rangeStart}–{rangeEnd} de {pagination.total} estudiantes
          </p>

          {pagination.totalPages > 1 && (
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-1 md:flex md:w-auto md:gap-2">
              <button
                type="button"
                onClick={onPreviousPage}
                disabled={!pagination.hasPreviousPage || isLoading}
                className="rounded-lg bg-white px-2 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 md:px-3"
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
                className="rounded-lg bg-white px-2 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 md:px-3"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
