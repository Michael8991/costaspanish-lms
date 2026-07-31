"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle, WalletCards } from "lucide-react";

import CustomModal from "@/components/ui/CustomModal";
import type { CourseProfileDetailDTO } from "@/lib/dto/course-profile.dto";
import type { CourseVoucherPreviewDTO } from "@/lib/dto/course-voucher.dto";
import type {
  PlanPaymentStatus,
  VoucherPaymentMethod,
} from "@/models/StudentProfile";

interface CreateCourseVouchersModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: CourseProfileDetailDTO;
  initialStudentIds?: string[];
  onGenerated: (course: CourseProfileDetailDTO) => void;
}

type TextValuesByStudent = Record<string, string>;
type PaymentStatusByStudent = Record<string, PlanPaymentStatus>;
type PaymentMethodByStudent = Record<string, VoucherPaymentMethod>;

const WEEKDAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const FREQUENCY_LABELS: Record<
  CourseProfileDetailDTO["policies"]["schedulingDefaults"]["frequency"],
  string
> = {
  once: "Una vez",
  weekly: "Semanal",
  twice_weekly: "Dos veces por semana",
  custom: "Personalizada",
};

const CLASS_TYPE_LABELS: Record<CourseProfileDetailDTO["classType"], string> = {
  private: "Privada",
  pair: "Pareja",
  group_regular: "Grupo regular",
  semi_intensive: "Semi-intensiva",
  intensive: "Intensiva",
};

const WARNING_LABELS: Record<string, string> = {
  member_paused: "Integrante pausado",
  member_left: "El integrante dejó el curso",
  no_preferred_weekdays_manual_credits_required:
    "Introduce los créditos manualmente",
  existing_voucher_for_period: "Ya existe un bono para este periodo",
  missing_price: "Precio pendiente",
  first_voucher: "Primer bono",
  renewing_existing_cycle: "Renovación del ciclo",
};

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function toNumberRecord(values: TextValuesByStudent) {
  return Object.fromEntries(
    Object.entries(values).flatMap(([studentId, value]) => {
      if (!value.trim()) return [];
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? [[studentId, numberValue]] : [];
    }),
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 2,
  }).format(value);
}

export default function CreateCourseVouchersModal({
  isOpen,
  onClose,
  course,
  initialStudentIds,
  onGenerated,
}: CreateCourseVouchersModalProps) {
  const activeMembers = useMemo(
    () => course.members.filter((member) => member.status === "active"),
    [course.members],
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState("");
  const [manualCredits, setManualCredits] =
    useState<TextValuesByStudent>({});
  const [prices, setPrices] = useState<TextValuesByStudent>({});
  const [paymentStatuses, setPaymentStatuses] =
    useState<PaymentStatusByStudent>({});
  const [paymentNotes, setPaymentNotes] =
    useState<TextValuesByStudent>({});
  const [amountsPaid, setAmountsPaid] = useState<TextValuesByStudent>({});
  const [paymentMethods, setPaymentMethods] =
    useState<PaymentMethodByStudent>({});
  const [internalNotes, setInternalNotes] =
    useState<TextValuesByStudent>({});
  const [paidDates, setPaidDates] = useState<TextValuesByStudent>({});
  const [applyPrice, setApplyPrice] = useState("");
  const [preview, setPreview] = useState<CourseVoucherPreviewDTO | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const initialSelection = initialStudentIds?.length
      ? activeMembers
          .filter((member) => initialStudentIds.includes(member.studentId))
          .map((member) => member.studentId)
      : activeMembers.map((member) => member.studentId);
    const defaultStatuses = Object.fromEntries(
      activeMembers.map((member) => [member.studentId, "pending" as const]),
    );

    setSelectedStudentIds(initialSelection);
    setSelectedStartDate("");
    setManualCredits({});
    setPrices({});
    setPaymentStatuses(defaultStatuses);
    setPaymentNotes({});
    setAmountsPaid({});
    setPaymentMethods({});
    setInternalNotes({});
    setPaidDates({});
    setApplyPrice("");
    setPreview(null);
    setError(null);
  }, [activeMembers, isOpen, course.id, initialStudentIds]);

  useEffect(() => {
    if (!isOpen || selectedStudentIds.length === 0) {
      setPreview(null);
      setIsLoadingPreview(false);
      return;
    }

    const controller = new AbortController();
    setIsLoadingPreview(true);
    const timeoutId = window.setTimeout(async () => {
      try {
        setError(null);
        const response = await fetch(
          `/api/course/${course.id}/vouchers/preview`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              memberStudentIds: selectedStudentIds,
              selectedStartDate: selectedStartDate || undefined,
              manualCreditsByStudent: toNumberRecord(manualCredits),
              priceByStudent: toNumberRecord(prices),
              paymentStatusByStudent: paymentStatuses,
              amountPaidByStudent: toNumberRecord(amountsPaid),
              paidAtByStudent: paidDates,
              paymentMethodByStudent: paymentMethods,
              paymentNotesByStudent: paymentNotes,
              internalNotesByStudent: internalNotes,
            }),
          },
        );
        const data = (await response.json().catch(() => null)) as
          | (CourseVoucherPreviewDTO & { error?: string })
          | null;

        if (!response.ok || !data?.items) {
          throw new Error(data?.error ?? "No se pudo calcular el preview.");
        }

        setPreview(data);
      } catch (previewError) {
        if (previewError instanceof DOMException && previewError.name === "AbortError") {
          return;
        }
        setPreview(null);
        setError(
          previewError instanceof Error
            ? previewError.message
            : "No se pudo calcular el preview.",
        );
      } finally {
        if (!controller.signal.aborted) setIsLoadingPreview(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    course.id,
    isOpen,
    manualCredits,
    amountsPaid,
    internalNotes,
    paidDates,
    paymentNotes,
    paymentMethods,
    paymentStatuses,
    prices,
    selectedStartDate,
    selectedStudentIds,
  ]);

  const updatePaymentStatus = (
    studentId: string,
    status: PlanPaymentStatus,
  ) => {
    setPaymentStatuses((current) => ({ ...current, [studentId]: status }));
    if (status === "paid" && !paidDates[studentId]) {
      setPaidDates((current) => ({
        ...current,
        [studentId]: todayDateOnly(),
      }));
    }
  };

  const applyPriceToSelected = () => {
    if (!applyPrice.trim()) return;
    setPrices((current) => ({
      ...current,
      ...Object.fromEntries(
        selectedStudentIds.map((studentId) => [studentId, applyPrice]),
      ),
    }));
  };

  const generateVouchers = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      const response = await fetch(
        `/api/course/${course.id}/vouchers/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberStudentIds: selectedStudentIds,
            selectedStartDate: selectedStartDate || undefined,
            manualCreditsByStudent: toNumberRecord(manualCredits),
            priceByStudent: toNumberRecord(prices),
            paymentStatusByStudent: paymentStatuses,
            amountPaidByStudent: toNumberRecord(amountsPaid),
            paidAtByStudent: paidDates,
            paymentMethodByStudent: paymentMethods,
            paymentNotesByStudent: paymentNotes,
            internalNotesByStudent: internalNotes,
            allowDuplicatePeriod: false,
          }),
        },
      );
      const data = (await response.json().catch(() => null)) as {
        course?: CourseProfileDetailDTO;
        error?: string;
      } | null;

      if (!response.ok || !data?.course) {
        throw new Error(data?.error ?? "No se pudieron generar los bonos.");
      }

      onGenerated(data.course);
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "No se pudieron generar los bonos.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const hasBlockingPreview =
    !preview ||
    preview.items.some(
      (item) =>
        item.creditsTotal <= 0 ||
        item.memberStatus !== "active" ||
        item.warnings.includes("existing_voucher_for_period"),
    );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => {
        if (!isGenerating) onClose();
      }}
      title="Crear bonos del curso"
      maxWidth="5xl"
    >
      <div className="max-h-[78vh] space-y-5 overflow-y-auto pr-1 text-slate-900">
        <section className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{course.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                Cada alumno tendrá su propio ciclo individual de facturación.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {formatNumber(course.policies.creditPolicy.creditsPerLesson)} cr. por clase
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
              {CLASS_TYPE_LABELS[course.classType]}
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
              {FREQUENCY_LABELS[course.policies.schedulingDefaults.frequency]}
            </span>
            <span className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-slate-200">
              {course.policies.schedulingDefaults.preferredWeekdays.length
                ? course.policies.schedulingDefaults.preferredWeekdays
                    .map((day) => WEEKDAY_LABELS[day])
                    .join(", ")
                : "Sin días preferidos"}
            </span>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Integrantes activos</h3>
            <button
              type="button"
              onClick={() =>
                setSelectedStudentIds(
                  selectedStudentIds.length === activeMembers.length
                    ? []
                    : activeMembers.map((member) => member.studentId),
                )
              }
              className="text-xs font-medium text-[#9e2727]"
            >
              {selectedStudentIds.length === activeMembers.length
                ? "Quitar todos"
                : "Seleccionar todos"}
            </button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {activeMembers.map((member) => (
              <label
                key={member.studentId}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <input
                  type="checkbox"
                  checked={selectedStudentIds.includes(member.studentId)}
                  onChange={(event) =>
                    setSelectedStudentIds((current) =>
                      event.target.checked
                        ? [...current, member.studentId]
                        : current.filter((id) => id !== member.studentId),
                    )
                  }
                  className="mt-1 accent-[#9e2727]"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {member.studentName}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {member.billing.nextBillingDate
                      ? `Próximo ciclo: ${formatDate(member.billing.nextBillingDate)}`
                      : "Primer bono pendiente"}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Fecha global para primeros bonos (opcional)
            <input
              type="date"
              value={selectedStartDate}
              onChange={(event) => setSelectedStartDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="text-sm font-medium text-slate-700">
            Aplicar precio a seleccionados
            <div className="mt-1.5 flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={applyPrice}
                onChange={(event) => setApplyPrice(event.target.value)}
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2"
                placeholder="0,00"
              />
              <button
                type="button"
                onClick={applyPriceToSelected}
                className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold"
              >
                Aplicar
              </button>
            </div>
          </div>
        </section>

        {preview && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <WalletCards className="h-4 w-4 text-[#9e2727]" />
              <h3 className="text-sm font-semibold">Vista previa</h3>
            </div>
            {preview.items.map((item) => (
              <article
                key={item.studentId}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.studentName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(item.periodStart)} – {formatDate(item.periodEnd)}
                      {` · Renueva ${formatDate(item.nextBillingDate)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatNumber(item.creditsTotal)} créditos
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.classOccurrencesCount} clases estimadas
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs font-medium text-slate-600">
                    Créditos
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={manualCredits[item.studentId] ?? ""}
                      onChange={(event) =>
                        setManualCredits((current) => ({
                          ...current,
                          [item.studentId]: event.target.value,
                        }))
                      }
                      placeholder={formatNumber(item.creditsTotal)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Precio total
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={prices[item.studentId] ?? ""}
                      onChange={(event) =>
                        setPrices((current) => ({
                          ...current,
                          [item.studentId]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                    <span className="mt-1 block text-[11px] text-slate-400">
                      {item.unitCreditPrice === null
                        ? "—"
                        : `${formatNumber(item.unitCreditPrice)} €/crédito`}
                    </span>
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Estado de pago
                    <select
                      value={paymentStatuses[item.studentId] ?? "pending"}
                      onChange={(event) =>
                        updatePaymentStatus(
                          item.studentId,
                          event.target.value as PlanPaymentStatus,
                        )
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagado</option>
                      <option value="partial">Parcial</option>
                      <option value="waived">Exento</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Fecha de pago
                    <input
                      type="date"
                      disabled={
                        !["paid", "partial"].includes(
                          paymentStatuses[item.studentId] ?? "pending",
                        )
                      }
                      value={paidDates[item.studentId] ?? ""}
                      onChange={(event) =>
                        setPaidDates((current) => ({
                          ...current,
                          [item.studentId]: event.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm disabled:bg-slate-100"
                    />
                  </label>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-slate-600">
                    Importe pagado
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amountsPaid[item.studentId] ?? ""}
                      onChange={(event) =>
                        setAmountsPaid((current) => ({
                          ...current,
                          [item.studentId]: event.target.value,
                        }))
                      }
                      placeholder={formatNumber(item.amountPaid)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Método de pago
                    <select
                      value={paymentMethods[item.studentId] ?? ""}
                      onChange={(event) =>
                        setPaymentMethods((current) => ({
                          ...current,
                          [item.studentId]: event.target.value as VoucherPaymentMethod,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
                    >
                      <option value="">Sin especificar</option>
                      <option value="cash">Efectivo</option>
                      <option value="bank_transfer">Transferencia</option>
                      <option value="bizum">Bizum</option>
                      <option value="card">Tarjeta</option>
                      <option value="other">Otro</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Notas de pago
                    <input
                      value={paymentNotes[item.studentId] ?? ""}
                      onChange={(event) =>
                        setPaymentNotes((current) => ({
                          ...current,
                          [item.studentId]: event.target.value,
                        }))
                      }
                      maxLength={1000}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Notas internas
                    <input
                      value={internalNotes[item.studentId] ?? ""}
                      onChange={(event) =>
                        setInternalNotes((current) => ({
                          ...current,
                          [item.studentId]: event.target.value,
                        }))
                      }
                      maxLength={2000}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {item.warnings.map((warning) => (
                    <span
                      key={warning}
                      className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                        warning === "existing_voucher_for_period" ||
                        warning === "no_preferred_weekdays_manual_credits_required"
                          ? "bg-red-50 text-red-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {WARNING_LABELS[warning] ?? warning}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        {isLoadingPreview && (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Recalculando periodos y créditos…
          </p>
        )}
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 py-3 backdrop-blur sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void generateVouchers()}
            disabled={
              isGenerating ||
              isLoadingPreview ||
              selectedStudentIds.length === 0 ||
              hasBlockingPreview
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#9e2727] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isGenerating && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {isGenerating ? "Generando…" : "Generar bonos"}
          </button>
        </footer>
      </div>
    </CustomModal>
  );
}
