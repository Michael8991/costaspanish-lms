import type {
  PaymentLedgerPaymentMethod,
  PaymentLedgerPaymentStatus,
  PaymentLedgerSource,
  PaymentLedgerStatus,
} from "@/models/PaymentLedgerEntry";

export interface PaymentLedgerEntryDTO {
  id: string;
  teacherId: string;
  studentId: string;
  studentNameSnapshot: string;
  courseId: string | null;
  courseNameSnapshot: string;
  voucherId: string;
  voucherNameSnapshot: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  amount: number;
  currency: "EUR";
  paymentStatusSnapshot: PaymentLedgerPaymentStatus;
  paymentMethod: PaymentLedgerPaymentMethod;
  paidAt: string | null;
  source: PaymentLedgerSource;
  status: PaymentLedgerStatus;
  notes: string;
  createdAt: string | null;
  updatedAt: string | null;
}
