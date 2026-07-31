import { CircleAlert, ReceiptText } from "lucide-react";

import type { PaymentLedgerEntryDTO } from "@/lib/dto/payment-ledger.dto";
import type { FinancePaginationDTO } from "@/lib/dto/finance.dto";
import {
  formatCurrencyEUR,
  formatFinanceDate,
} from "@/lib/utils/finance-format";
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "@/lib/utils/finance-visuals";
import LedgerPagination from "@/components/dashboard/finance/LedgerPagination";

export default function PaymentLedgerTable({
  items,
  pagination,
  isLoading,
  error,
  onPageChange,
}: {
  items: PaymentLedgerEntryDTO[];
  pagination: FinancePaginationDTO | null;
  isLoading: boolean;
  error: string | null;
  onPageChange: (page: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Cobros</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Dinero registrado por bonos pagados o parciales.
          </p>
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
          <ReceiptText size={19} aria-hidden="true" />
        </span>
      </div>

      {isLoading ? <LedgerLoading label="Cargando cobros..." /> : null}
      {!isLoading && error ? <LedgerError message={error} /> : null}
      {!isLoading && !error && items.length === 0 ? (
        <LedgerEmpty message="No hay cobros registrados en este mes." />
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Fecha de pago</th>
                  <th className="px-5 py-3 font-medium">Alumno</th>
                  <th className="px-5 py-3 font-medium">Curso</th>
                  <th className="px-5 py-3 font-medium">Bono</th>
                  <th className="px-5 py-3 font-medium">Método</th>
                  <th className="px-5 py-3 font-medium">Estado</th>
                  <th className="px-5 py-3 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {formatFinanceDate(item.paidAt)}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {item.studentNameSnapshot || "Alumno"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.courseNameSnapshot || "Sin curso"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {item.voucherNameSnapshot || "Sin nombre"}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {getPaymentMethodLabel(item.paymentMethod)}
                    </td>
                    <td className="px-5 py-4">
                      <PaymentStatusBadge status={item.paymentStatusSnapshot} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-950">
                      {formatCurrencyEUR(item.amount)}
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
                  <div>
                    <p className="font-medium text-slate-950">
                      {item.studentNameSnapshot || "Alumno"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatFinanceDate(item.paidAt)}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-950">
                    {formatCurrencyEUR(item.amount)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <MobileValue
                    label="Curso"
                    value={item.courseNameSnapshot || "Sin curso"}
                  />
                  <MobileValue
                    label="Bono"
                    value={item.voucherNameSnapshot || "Sin nombre"}
                  />
                  <MobileValue
                    label="Método"
                    value={getPaymentMethodLabel(item.paymentMethod)}
                  />
                  <div>
                    <p className="text-slate-400">Estado</p>
                    <div className="mt-1">
                      <PaymentStatusBadge
                        status={item.paymentStatusSnapshot}
                      />
                    </div>
                  </div>
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

function PaymentStatusBadge({
  status,
}: {
  status: PaymentLedgerEntryDTO["paymentStatusSnapshot"];
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        status === "paid"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700"
      }`}
    >
      {getPaymentStatusLabel(status)}
    </span>
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

function LedgerLoading({ label }: { label: string }) {
  return (
    <div className="space-y-3 p-5" aria-live="polite">
      <p className="text-sm text-slate-500">{label}</p>
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

function LedgerEmpty({ message }: { message: string }) {
  return <p className="px-5 py-10 text-center text-sm text-slate-500">{message}</p>;
}
