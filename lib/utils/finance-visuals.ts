export type FinancePaymentStatus = "paid" | "partial" | "pending" | "waived";
export type FinancePaymentMethod =
  | "cash"
  | "bank_transfer"
  | "bizum"
  | "card"
  | "other"
  | "";
export type FinanceLedgerStatus = "active" | "reversed";

const paymentStatusLabels: Record<FinancePaymentStatus, string> = {
  paid: "Pagado",
  partial: "Parcial",
  pending: "Pendiente",
  waived: "Exento",
};

const paymentMethodLabels: Record<FinancePaymentMethod, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  bizum: "Bizum",
  card: "Tarjeta",
  other: "Otro",
  "": "Sin especificar",
};

const ledgerStatusLabels: Record<FinanceLedgerStatus, string> = {
  active: "Activo",
  reversed: "Revertido",
};

export function getPaymentStatusLabel(status: FinancePaymentStatus): string {
  return paymentStatusLabels[status];
}

export function getPaymentMethodLabel(method: FinancePaymentMethod): string {
  return paymentMethodLabels[method];
}

export function getLedgerStatusLabel(status: FinanceLedgerStatus): string {
  return ledgerStatusLabels[status];
}
