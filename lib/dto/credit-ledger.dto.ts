import type {
  CreditLedgerSource,
  CreditLedgerStatus,
} from "@/models/CreditLedgerEntry";

export interface CreditLedgerEntryDTO {
  id: string;
  teacherId: string;
  lessonId: string;
  lessonTitleSnapshot: string;
  lessonDate: string | null;
  courseId: string | null;
  courseNameSnapshot: string;
  studentId: string;
  studentNameSnapshot: string;
  voucherId: string | null;
  voucherNameSnapshot: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  creditsConsumed: number;
  voucherTotalCreditsSnapshot: number | null;
  voucherPriceSnapshot: number | null;
  unitCreditPriceSnapshot: number;
  estimatedRevenue: number;
  consumedAt: string | null;
  source: CreditLedgerSource;
  status: CreditLedgerStatus;
  settlementReason: string;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
}
