import type { CreditLedgerEntryDTO } from "@/lib/dto/credit-ledger.dto";
import type { PaymentLedgerEntryDTO } from "@/lib/dto/payment-ledger.dto";

export interface FinancePaginationDTO {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FinanceMonthlySummaryDTO {
  month: string;
  collectedAmount: number;
  earnedEstimatedAmount: number;
  consumedCredits: number;
  activePaymentEntries: number;
  activeCreditEntries: number;
}

export interface PaymentLedgerListResponseDTO {
  items: PaymentLedgerEntryDTO[];
  pagination: FinancePaginationDTO;
  summary: {
    totalAmount: number;
  };
}

export interface CreditLedgerListResponseDTO {
  items: CreditLedgerEntryDTO[];
  pagination: FinancePaginationDTO;
  summary: {
    totalCreditsConsumed: number;
    totalEstimatedRevenue: number;
  };
}
