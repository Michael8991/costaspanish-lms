import { ChevronLeft, ChevronRight } from "lucide-react";

import type { FinancePaginationDTO } from "@/lib/dto/finance.dto";

export default function LedgerPagination({
  pagination,
  onPageChange,
}: {
  pagination: FinancePaginationDTO;
  onPageChange: (page: number) => void;
}) {
  if (pagination.totalPages <= 1) return null;

  const rangeStart =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.limit + 1;
  const rangeEnd = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        {rangeStart}–{rangeEnd} de {pagination.total} movimientos
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => onPageChange(pagination.page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft size={16} aria-hidden="true" />
          Anterior
        </button>
        <span className="px-2 text-xs font-medium text-slate-500">
          {pagination.page} / {pagination.totalPages}
        </span>
        <button
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => onPageChange(pagination.page + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
