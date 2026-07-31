"use client";

import type { PaymentLedgerListResponseDTO } from "@/lib/dto/finance.dto";
import { useFinanceRequest } from "@/lib/hooks/useFinanceRequest";
import { FINANCE_MONTH_PATTERN } from "@/lib/utils/finance-format";

export function usePaymentLedger(month: string | null, page: number) {
  const url =
    month && FINANCE_MONTH_PATTERN.test(month)
      ? `/api/finance/payment-ledger?month=${encodeURIComponent(month)}&status=active&page=${page}&limit=20`
      : null;
  const request = useFinanceRequest<PaymentLedgerListResponseDTO>(
    url,
    "No se pudieron cargar los cobros.",
  );

  return {
    items: request.data?.items ?? [],
    pagination: request.data?.pagination ?? null,
    isLoading: request.isLoading,
    error: request.error,
  };
}
