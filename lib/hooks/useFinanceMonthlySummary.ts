"use client";

import type { FinanceMonthlySummaryDTO } from "@/lib/dto/finance.dto";
import { FINANCE_MONTH_PATTERN } from "@/lib/utils/finance-format";
import { useFinanceRequest } from "@/lib/hooks/useFinanceRequest";

export function useFinanceMonthlySummary(month: string | null) {
  const url =
    month && FINANCE_MONTH_PATTERN.test(month)
      ? `/api/finance/monthly-summary?month=${encodeURIComponent(month)}`
      : null;
  const request = useFinanceRequest<FinanceMonthlySummaryDTO>(
    url,
    "No se pudo cargar el resumen económico.",
  );

  return {
    summary: request.data,
    isLoading: request.isLoading,
    error: request.error,
  };
}
