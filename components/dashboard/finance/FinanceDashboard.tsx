"use client";

import { Info, LoaderCircle } from "lucide-react";
import {
  Suspense,
  useCallback,
  useEffect,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import CreditLedgerTable from "@/components/dashboard/finance/CreditLedgerTable";
import FinanceMonthSelector from "@/components/dashboard/finance/FinanceMonthSelector";
import FinanceSummaryCards from "@/components/dashboard/finance/FinanceSummaryCards";
import PaymentLedgerTable from "@/components/dashboard/finance/PaymentLedgerTable";
import { useCreditLedger } from "@/lib/hooks/useCreditLedger";
import { useFinanceMonthlySummary } from "@/lib/hooks/useFinanceMonthlySummary";
import { usePaymentLedger } from "@/lib/hooks/usePaymentLedger";
import {
  FINANCE_MONTH_PATTERN,
  getCurrentFinanceMonth,
} from "@/lib/utils/finance-format";

const LEDGER_LIMIT = 20;

function parsePage(value: string | null): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export default function FinanceDashboard() {
  return (
    <Suspense fallback={<FinanceDashboardLoading />}>
      <FinanceDashboardContent />
    </Suspense>
  );
}

function FinanceDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMonth = getCurrentFinanceMonth();
  const rawMonth = searchParams.get("month");
  const month =
    rawMonth === null
      ? currentMonth
      : FINANCE_MONTH_PATTERN.test(rawMonth)
        ? rawMonth
        : null;
  const visibleMonth = month ?? currentMonth;
  const paymentPage = parsePage(searchParams.get("paymentPage"));
  const creditPage = parsePage(searchParams.get("creditPage"));

  const updateQuery = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, String(value));
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (rawMonth !== null && FINANCE_MONTH_PATTERN.test(rawMonth)) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("month", currentMonth);
    params.delete("paymentPage");
    params.delete("creditPage");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [currentMonth, pathname, rawMonth, router, searchParams]);

  const summary = useFinanceMonthlySummary(month);
  const payments = usePaymentLedger(month, paymentPage);
  const credits = useCreditLedger(month, creditPage);

  return (
    <div className="space-y-6">
      <FinanceMonthSelector
        month={visibleMonth}
        onMonthChange={(nextMonth) =>
          updateQuery({
            month: nextMonth,
            paymentPage: null,
            creditPage: null,
          })
        }
      />

      <FinanceSummaryCards
        summary={summary.summary}
        isLoading={summary.isLoading}
        error={summary.error}
      />

      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-sm text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">Cobrado</span> es el dinero que ha
          entrado por bonos pagados. <span className="font-semibold">Devengado</span>{" "}
          es el valor de las clases ya dadas y descontadas de esos bonos.
        </p>
      </div>

      <div className="space-y-6">
        <PaymentLedgerTable
          items={payments.items}
          pagination={payments.pagination}
          isLoading={payments.isLoading}
          error={payments.error}
          onPageChange={(page) => updateQuery({ paymentPage: page })}
        />
        <CreditLedgerTable
          items={credits.items}
          pagination={credits.pagination}
          isLoading={credits.isLoading}
          error={credits.error}
          onPageChange={(page) => updateQuery({ creditPage: page })}
        />
      </div>

      <p className="text-center text-xs text-slate-400">
        Se muestran hasta {LEDGER_LIMIT} movimientos por página y sección.
      </p>
    </div>
  );
}

function FinanceDashboardLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500">
      <LoaderCircle size={19} className="animate-spin" aria-hidden="true" />
      Cargando economía...
    </div>
  );
}
