import type { VoucherPaymentMethod } from "@/models/StudentProfile";

export function getVoucherStatusLabel(status?: string | null): string {
  const labels: Record<string, string> = {
    active: "Activo",
    exhausted: "Agotado",
    expired: "Caducado",
    canceled: "Cancelado",
    cancelled: "Cancelado",
    archived: "Archivado",
    deleted: "Eliminado",
  };

  return status ? (labels[status] ?? "Estado desconocido") : "Estado desconocido";
}

export function getVoucherStatusClassName(status?: string | null): string {
  const classes: Record<string, string> = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    exhausted: "border-slate-200 bg-slate-100 text-slate-600",
    expired: "border-amber-200 bg-amber-50 text-amber-700",
    canceled: "border-red-200 bg-red-50 text-red-700",
    cancelled: "border-red-200 bg-red-50 text-red-700",
    archived: "border-slate-300 bg-slate-100 text-slate-600",
    deleted: "border-slate-300 bg-slate-100 text-slate-600",
  };

  return status
    ? (classes[status] ?? "border-slate-200 bg-slate-50 text-slate-600")
    : "border-slate-200 bg-slate-50 text-slate-600";
}

export function getVoucherPaymentStatusLabel(
  status?: string | null,
): string {
  const labels: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    partial: "Parcial",
    waived: "Exento",
  };

  return status ? (labels[status] ?? "Sin estado de pago") : "Sin estado de pago";
}

export function getVoucherPaymentStatusClassName(
  status?: string | null,
): string {
  const classes: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
    partial: "border-blue-200 bg-blue-50 text-blue-700",
    waived: "border-slate-200 bg-slate-100 text-slate-600",
  };

  return status
    ? (classes[status] ?? "border-slate-200 bg-slate-50 text-slate-600")
    : "border-slate-200 bg-slate-50 text-slate-600";
}

export function getPaymentMethodLabel(method: VoucherPaymentMethod) {
  return {
    cash: "Efectivo",
    bank_transfer: "Transferencia",
    bizum: "Bizum",
    card: "Tarjeta",
    other: "Otro",
    "": "Sin especificar",
  }[method];
}

export function formatBillingPeriod(
  start: string | Date | null,
  end: string | Date | null,
) {
  if (!start || !end) return "Periodo sin definir";
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${formatter.format(new Date(start))} – ${formatter.format(new Date(end))}`;
}

export function formatUnitCreditPrice(price: number | null) {
  return price === null
    ? "—"
    : `${new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price)} €/crédito`;
}
