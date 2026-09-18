"use client";

import type { DBVoucherPaymentMethod } from "@/lib/types/student";
import { CheckCircle2, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { toCents } from "@/lib/utils/money";

import type { FormattedPlan } from "./ActiveVouchersPanel";

interface VoucherPaymentEditorProps {
  studentId: string;
  voucher: FormattedPlan;
  onCancel: () => void;
  onSaved: () => Promise<void> | void;
}

interface VoucherPaymentPatchPayload {
  amountCents: number;
  paidAt: string;
  paymentMethod: DBVoucherPaymentMethod;
  notes: string;
  idempotencyKey: string;
}

const paymentMethods: Array<{
  value: DBVoucherPaymentMethod;
  label: string;
}> = [
  { value: "", label: "Sin especificar" },
  { value: "cash", label: "Efectivo" },
  { value: "bank_transfer", label: "Transferencia" },
  { value: "bizum", label: "Bizum" },
  { value: "card", label: "Tarjeta" },
  { value: "other", label: "Otro" },
];

function getTodayDateOnly(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function getApiErrorMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const error = Reflect.get(value, "error");
  return typeof error === "string" ? error : null;
}

export default function VoucherPaymentEditor({
  studentId,
  voucher,
  onCancel,
  onSaved,
}: VoucherPaymentEditorProps) {
  const [amountPaid, setAmountPaid] = useState("");
  const [paidAt, setPaidAt] = useState(getTodayDateOnly());
  const [paymentMethod, setPaymentMethod] =
    useState<DBVoucherPaymentMethod>(voucher.paymentMethod ?? "");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const markAsPaid = () => {
    const currentAmount = Number(amountPaid);
    const suggestedAmount =
      voucher.priceTotal !== null && voucher.priceTotal !== undefined
        ? voucher.priceTotal
        : Number.isFinite(currentAmount)
          ? currentAmount
          : 0;

    const outstanding = Math.max(0, suggestedAmount - (voucher.amountPaid ?? 0));
    setAmountPaid(String(outstanding));
    setPaidAt(getTodayDateOnly());
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amountPaid);
    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      setError("El importe cobrado debe ser un número igual o mayor que cero.");
      return;
    }
    if (
      parsedAmount <= 0 || !paidAt
    ) {
      setError(
        "Los cobros pagados o parciales necesitan un importe mayor que cero y una fecha.",
      );
      return;
    }
    if (paymentNotes.length > 1000) {
      setError("Las notas de pago no pueden superar los 1000 caracteres.");
      return;
    }

    const payload: VoucherPaymentPatchPayload = {
      amountCents: toCents(parsedAmount),
      paidAt,
      paymentMethod,
      notes: paymentNotes,
      idempotencyKey,
    };

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/students/${studentId}/plans/${voucher.id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);
        throw new Error(
          getApiErrorMessage(responseBody) ?? "No se pudo guardar el cobro.",
        );
      }

      await onSaved();
      setIdempotencyKey(crypto.randomUUID());
      toast.success("Cobro guardado.");
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "No se pudo guardar el cobro.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Registrar cobro</h3>
          <p className="text-xs text-slate-600">
            Solo se actualizarán los datos económicos de este bono.
          </p>
        </div>
        <button
          type="button"
          onClick={markAsPaid}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 size={16} />
          Marcar como pagado
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-medium text-slate-700">
          Importe de este cobro
          <input
            type="number"
            min="0"
            step="0.01"
            value={amountPaid}
            onChange={(event) => setAmountPaid(event.target.value)}
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Fecha de cobro
          <input
            type="date"
            value={paidAt}
            onChange={(event) => setPaidAt(event.target.value)}
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          />
        </label>

        <label className="text-sm font-medium text-slate-700">
          Método de pago
          <select
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as DBVoucherPaymentMethod)
            }
            disabled={isSubmitting}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
          >
            {paymentMethods.map((method) => (
              <option key={method.value || "empty"} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Notas de pago
        <textarea
          value={paymentNotes}
          onChange={(event) => setPaymentNotes(event.target.value)}
          maxLength={1000}
          rows={3}
          disabled={isSubmitting}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[#9e2727] focus:ring-2 focus:ring-[#9e2727]/10"
        />
        <span className="mt-1 block text-right text-xs text-slate-500">
          {paymentNotes.length}/1000
        </span>
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-[#9e2727] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#862121] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {isSubmitting ? "Registrando..." : "Registrar cobro"}
        </button>
      </div>
    </form>
  );
}
