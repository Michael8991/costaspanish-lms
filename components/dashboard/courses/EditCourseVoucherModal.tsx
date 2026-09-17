"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

import CustomModal from "@/components/ui/CustomModal";
import type {
  CourseMemberDTO,
  CourseProfileDetailDTO,
} from "@/lib/dto/course-profile.dto";
import type { StudentPlanListDTO } from "@/lib/dto/student.dto";
import { formatUnitCreditPrice } from "@/lib/utils/voucher-visuals";

interface EditCourseVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseProfileDetailDTO;
  member: CourseMemberDTO | null;
  onSaved: (voucher: StudentPlanListDTO) => void;
}

function dateOnly(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

export default function EditCourseVoucherModal({
  isOpen,
  onClose,
  course,
  member,
  onSaved,
}: EditCourseVoucherModalProps) {
  const [voucher, setVoucher] = useState<StudentPlanListDTO | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [priceTotal, setPriceTotal] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !member?.billing.lastVoucherId) return;

    const controller = new AbortController();
    const loadVoucher = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(
          `/api/course/${course.id}/members/${member.studentId}/vouchers/${member.billing.lastVoucherId}`,
          { signal: controller.signal },
        );
        const data = (await response.json().catch(() => null)) as {
          item?: StudentPlanListDTO;
          error?: string;
        } | null;

        if (!response.ok || !data?.item) {
          throw new Error(data?.error ?? "No se pudo cargar el bono.");
        }

        const item = data.item;
        setVoucher(item);
        setPeriodStart(dateOnly(item.billingPeriodStart));
        setPeriodEnd(dateOnly(item.billingPeriodEnd));
        setPriceTotal(item.priceTotal?.toString() ?? "");
        setInternalNotes(item.internalNotes);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") {
          return;
        }
        setError(
          loadError instanceof Error
            ? loadError.message
            : "No se pudo cargar el bono.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void loadVoucher();
    return () => controller.abort();
  }, [course.id, isOpen, member]);

  const saveVoucher = async () => {
    if (!member?.billing.lastVoucherId || !voucher) return;

    try {
      setIsSaving(true);
      setError(null);
      const response = await fetch(
        `/api/course/${course.id}/members/${member.studentId}/vouchers/${member.billing.lastVoucherId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billingPeriodStart: periodStart || null,
            billingPeriodEnd: periodEnd || null,
            priceTotal: priceTotal === "" ? undefined : Number(priceTotal),
            internalNotes,
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        item?: StudentPlanListDTO;
        error?: string;
      } | null;

      if (!response.ok || !data?.item) {
        throw new Error(data?.error ?? "No se pudo guardar el bono.");
      }

      onSaved(data.item);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No se pudo guardar el bono.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => {
        if (!isSaving) onClose();
      }}
      title="Editar último bono"
      maxWidth="3xl"
    >
      <div className="space-y-4 text-slate-900">
        <p className="text-sm text-slate-300">
          Editar estos datos no consume créditos ni modifica clases ya completadas.
        </p>

        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-slate-300">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Cargando bono…
          </p>
        )}

        {voucher && !isLoading && (
          <div className="max-h-[68vh] space-y-4 overflow-y-auto rounded-2xl bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Periodo inicio
                <input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Periodo fin
                <input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Créditos totales
                <input readOnly value={voucher.creditsTotal} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Créditos restantes
                <input readOnly value={voucher.creditsRemaining} className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2" />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Precio total
                <input type="number" min="0" step="0.01" value={priceTotal} onChange={(event) => setPriceTotal(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
                <span className="mt-1 block text-xs text-slate-400">
                  {formatUnitCreditPrice(
                    priceTotal && voucher.creditsTotal > 0
                      ? Number(priceTotal) / voucher.creditsTotal
                      : null,
                  )}
                </span>
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Notas internas
              <textarea value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} rows={3} maxLength={2000} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" />
            </label>
          </div>
        )}

        {error && <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-600 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="rounded-xl border border-slate-500 px-4 py-2 text-sm text-white">Cancelar</button>
          <button type="button" onClick={() => void saveVoucher()} disabled={!voucher || isLoading || isSaving} className="inline-flex items-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
            {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isSaving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </CustomModal>
  );
}
