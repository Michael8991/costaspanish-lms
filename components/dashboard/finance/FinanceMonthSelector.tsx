"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import {
  formatFinanceMonth,
  shiftFinanceMonth,
} from "@/lib/utils/finance-format";

export default function FinanceMonthSelector({
  month,
  onMonthChange,
}: {
  month: string;
  onMonthChange: (month: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg bg-red-50 text-[#9e2727]">
          <CalendarDays size={19} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Periodo
          </p>
          <p className="text-base font-semibold text-slate-950">
            {formatFinanceMonth(month)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(shiftFinanceMonth(month, -1))}
          aria-label="Ver mes anterior"
          className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e2727]"
        >
          <ChevronLeft size={18} aria-hidden="true" />
        </button>

        <label className="sr-only" htmlFor="finance-month">
          Seleccionar mes
        </label>
        <input
          id="finance-month"
          type="month"
          value={month}
          onChange={(event) => {
            if (event.target.value) onMonthChange(event.target.value);
          }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#9e2727]"
        />

        <button
          type="button"
          onClick={() => onMonthChange(shiftFinanceMonth(month, 1))}
          aria-label="Ver mes siguiente"
          className="grid size-10 place-items-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9e2727]"
        >
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
