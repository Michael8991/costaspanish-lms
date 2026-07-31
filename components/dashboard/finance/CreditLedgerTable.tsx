import { BookOpenCheck, CircleAlert } from "lucide-react";

import type { CreditLedgerEntryDTO } from "@/lib/dto/credit-ledger.dto";
import type { FinancePaginationDTO } from "@/lib/dto/finance.dto";
import {
  formatCredits,
  formatCurrencyEUR,
  formatFinanceDate,
} from "@/lib/utils/finance-format";
import LedgerPagination from "@/components/dashboard/finance/LedgerPagination";

export default function CreditLedgerTable({
  items,
  pagination,
  isLoading,
  error,
  onPageChange,
}: {
  items: CreditLedgerEntryDTO[];
  pagination: FinancePaginationDTO | null;
  isLoading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">
            Clases devengadas
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Valor imputado al consumir créditos en clases completadas.
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
          <BookOpenCheck size={19} aria-hidden="true" />
        </span>
      </div>

      {isLoading ? <LedgerLoading /> : null}
      {!isLoading && error ? <LedgerError message={error} /> : null}
      {!isLoading && !error && items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-slate-500">
          No hay clases devengadas en este mes.
        </p>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Fecha</th>
                  <th className="px-5 py-3 font-medium">Alumno</th>
                  <th className="px-5 py-3 font-medium">Curso</th>
                  <th className="px-5 py-3 font-medium">Clase</th>
                  <th className="px-5 py-3 text-right font-medium">Créditos</th>
                  <th className="px-5 py-3 text-right font-medium">€/crédito</th>
                  <th className="px-5 py-3 text-right font-medium">Devengado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatFinanceDate(item.consumedAt ?? item.lessonDate)}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {item.studentNameSnapshot || "Alumno"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.courseNameSnapshot || "Sin curso"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.lessonTitleSnapshot || "Clase"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-slate-700">
                      {formatCredits(item.creditsConsumed)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right text-slate-600">
                      {formatCurrencyEUR(item.unitCreditPriceSnapshot)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-950">
                      {formatCurrencyEUR(item.estimatedRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-slate-100 md:hidden">
            {items.map((item) => (
              <article key={item.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-950">
                      {item.lessonTitleSnapshot || "Clase"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatFinanceDate(item.consumedAt ?? item.lessonDate)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold text-slate-950">
                    {formatCurrencyEUR(item.estimatedRevenue)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <MobileValue
                    label="Alumno"
                    value={item.studentNameSnapshot || "Alumno"}
                  />
                  <MobileValue
                    label="Curso"
                    value={item.courseNameSnapshot || "Sin curso"}
                  />
                  <MobileValue
                    label="Créditos"
                    value={formatCredits(item.creditsConsumed)}
                  />
                  <MobileValue
                    label="€/crédito"
                    value={formatCurrencyEUR(item.unitCreditPriceSnapshot)}
                  />
                </div>
              </article>
            ))}
          </div>

          {pagination ? (
            <LedgerPagination
              pagination={pagination}
              onPageChange={onPageChange}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function MobileValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-slate-400">{label}</p>
      <p className="mt-0.5 truncate font-medium text-slate-700">{value}</p>
    </div>
  );
}

function LedgerLoading() {
  return (
    <div className="space-y-3 p-5" aria-live="polite">
      <p className="text-sm text-slate-500">Cargando clases devengadas...</p>
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="h-12 animate-pulse rounded-lg bg-slate-100"
        />
      ))}
    </div>
  );
}

function LedgerError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 px-5 py-8 text-sm text-red-700"
    >
      <CircleAlert size={17} aria-hidden="true" />
      {message}
    </div>
  );
}
