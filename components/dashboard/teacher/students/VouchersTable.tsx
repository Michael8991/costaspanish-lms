"use client";

import CustomModal from "@/components/ui/CustomModal";
import { DBPlanDoc } from "@/lib/types/student";
import { formatCurrencyEUR, formatFinanceDate } from "@/lib/utils/finance-format";
import {
  getPaymentMethodLabel,
  getVoucherPaymentStatusClassName,
  getVoucherPaymentStatusLabel,
  getVoucherStatusClassName,
  getVoucherStatusLabel,
} from "@/lib/utils/voucher-visuals";
import {
  AlertCircle,
  Pencil,
  RefreshCw,
  Trash,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import EditVoucherForm, { EditVoucherFormData } from "../forms/EditVoucherForm";
import RemoveVoucherForm from "../forms/RemoveVoucherForm";
import { FormattedPlan } from "./ActiveVouchersPanel";
import VoucherPaymentEditor from "./VoucherPaymentEditor";

function resolveVoucherStatus(plan: DBPlanDoc): string {
  if (typeof plan.status === "string" && plan.status.trim()) {
    return plan.status;
  }
  if ((plan.creditsRemaining ?? 0) <= 0) return "exhausted";
  if (plan.validUntil) {
    const validUntil = new Date(plan.validUntil);
    if (!Number.isNaN(validUntil.getTime()) && validUntil < new Date()) {
      return "expired";
    }
  }
  return "active";
}

function toDateOnly(value?: Date | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString().split("T")[0];
}

function getApiErrorMessage(value: unknown, fallback: string): string {
  if (value && typeof value === "object") {
    const error = Reflect.get(value, "error");
    if (typeof error === "string") return error;
  }
  return fallback;
}

export default function VouchersTable({
  id,
  student,
}: {
  id: string;
  student: string;
}) {
  const router = useRouter();
  const [vouchers, setVouchers] = useState<FormattedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPaymentEditorId, setOpenPaymentEditorId] = useState<string | null>(
    null,
  );

  const [isEditVoucherModalOpen, setIsEditVoucherModalOpen] = useState(false);
  const [isSubmittingEditVoucher, setIsSubmittingEditVoucher] = useState(false);
  const [isRemoveVoucherModalOpen, setIsRemoveVoucherModalOpen] =
    useState(false);
  const [isSubmittingRemoveVoucher, setIsSubmittingRemoveVoucher] =
    useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [isSubmittingReactivate, setIsSubmittingReactivate] = useState(false);
  const [planToEdit, setPlanToEdit] = useState<FormattedPlan | null>(null);

  const loadVouchers = useCallback(
    async (showLoading: boolean) => {
      try {
        if (showLoading) setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/students/${id}/plans`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("Error al cargar los bonos.");
        }

        const responseBody: unknown = await response.json();
        if (!Array.isArray(responseBody)) {
          throw new Error("La respuesta de bonos no tiene un formato válido.");
        }

        const formattedData: FormattedPlan[] = responseBody.map((item) => {
          const plan = item as DBPlanDoc;
          return {
            id: plan._id?.toString() ?? "",
            name: plan.name,
            billingType: plan.billingType,
            classType: plan.classType,
            totalCredits: plan.creditsTotal ?? 0,
            remainingCredits: plan.creditsRemaining ?? 0,
            validFrom: toDateOnly(plan.validFrom) ?? "",
            validUntil: toDateOnly(plan.validUntil) ?? "",
            status: resolveVoucherStatus(plan),
            paymentStatus: plan.paymentStatus ?? "pending",
            price: plan.priceTotal ?? plan.price ?? 0,
            priceTotal: plan.priceTotal ?? plan.price ?? null,
            amountPaid: plan.amountPaid ?? 0,
            paidAt: toDateOnly(plan.paidAt),
            paymentMethod: plan.paymentMethod ?? "",
            paymentNotes: plan.paymentNotes ?? "",
            billingPeriodStart: toDateOnly(plan.billingPeriodStart),
            billingPeriodEnd: toDateOnly(plan.billingPeriodEnd),
          };
        });

        formattedData.sort(
          (a, b) =>
            new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
        );
        setVouchers(formattedData);
      } catch (caughtError: unknown) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Ocurrió un error inesperado.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    void loadVouchers(true);
  }, [loadVouchers]);

  const refreshAfterMutation = async () => {
    await loadVouchers(false);
    router.refresh();
  };

  const handlePaymentSaved = async () => {
    await refreshAfterMutation();
    setOpenPaymentEditorId(null);
  };

  const handleRemoveVoucher = async (planId: string) => {
    setIsSubmittingRemoveVoucher(true);
    try {
      const response = await fetch(`/api/students/${id}/plans/${planId}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);
        throw new Error(
          getApiErrorMessage(responseBody, "Error al cancelar el bono."),
        );
      }

      toast.success("Bono cancelado con éxito.");
      setIsRemoveVoucherModalOpen(false);
      setPlanToEdit(null);
      await refreshAfterMutation();
    } catch (caughtError: unknown) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Ocurrió un error inesperado al cancelar el bono.",
      );
    } finally {
      setIsSubmittingRemoveVoucher(false);
    }
  };

  const handleEditVoucher = async (
    planId: string,
    formData: EditVoucherFormData,
  ) => {
    setIsSubmittingEditVoucher(true);
    try {
      const response = await fetch(`/api/students/${id}/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      });

      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);
        throw new Error(
          getApiErrorMessage(responseBody, "Error al actualizar el bono."),
        );
      }

      toast.success("Bono actualizado con éxito.");
      setIsEditVoucherModalOpen(false);
      setPlanToEdit(null);
      await refreshAfterMutation();
    } catch (caughtError: unknown) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Ocurrió un error inesperado al actualizar el bono.",
      );
    } finally {
      setIsSubmittingEditVoucher(false);
    }
  };

  const handleReactivateVoucher = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!planToEdit) return;

    setIsSubmittingReactivate(true);
    try {
      const response = await fetch(
        `/api/students/${id}/plans/${planToEdit.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "active" }),
          cache: "no-store",
        },
      );
      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);
        throw new Error(
          getApiErrorMessage(responseBody, "Error al reactivar el bono."),
        );
      }

      toast.success("Bono reactivado con éxito.");
      setIsReactivateModalOpen(false);
      setPlanToEdit(null);
      await refreshAfterMutation();
    } catch (caughtError: unknown) {
      toast.error(
        caughtError instanceof Error
          ? caughtError.message
          : "Error al reactivar el bono.",
      );
    } finally {
      setIsSubmittingReactivate(false);
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1180px] text-left text-sm">
          <thead className="border-b bg-gray-50 font-medium text-gray-600">
            <tr>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Tipo de bono</th>
              <th className="px-5 py-3">Modelo de clase</th>
              <th className="px-5 py-3">Créditos</th>
              <th className="px-5 py-3">Inicio</th>
              <th className="px-5 py-3">Vencimiento</th>
              <th className="px-5 py-3">Resumen económico</th>
              <th className="px-5 py-3">Estados</th>
              <th className="px-5 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-6 py-4 text-center">
                  <div className="p-8 text-center text-gray-500">
                    <span className="mx-auto mb-4 block h-8 w-8 animate-spin rounded-full border-b-2 border-[#9e2727]" />
                    Cargando bonos...
                  </div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : vouchers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                  No hay bonos registrados.
                </td>
              </tr>
            ) : (
              vouchers.map((voucher) => {
                const isCanceled = ["canceled", "cancelled"].includes(
                  voucher.status,
                );
                const paymentStatus = voucher.paymentStatus ?? "pending";
                const isPaymentEditorOpen =
                  openPaymentEditorId === voucher.id;

                return (
                  <Fragment key={voucher.id}>
                    <tr
                      className={
                        isCanceled ? "bg-gray-50/70" : "hover:bg-gray-50"
                      }
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {voucher.name}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {voucher.billingType}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {voucher.classType}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {voucher.remainingCredits} / {voucher.totalCredits}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {formatFinanceDate(voucher.validFrom)}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {formatFinanceDate(voucher.validUntil)}
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        <dl className="space-y-1 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-gray-500">Precio</dt>
                            <dd className="font-medium text-gray-900">
                              {formatCurrencyEUR(
                                voucher.priceTotal ?? voucher.price,
                              )}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-gray-500">Cobrado</dt>
                            <dd className="font-medium text-gray-900">
                              {formatCurrencyEUR(voucher.amountPaid ?? 0)}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-gray-500">Fecha</dt>
                            <dd>{formatFinanceDate(voucher.paidAt)}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-gray-500">Método</dt>
                            <dd>
                              {getPaymentMethodLabel(
                                voucher.paymentMethod ?? "",
                              )}
                            </dd>
                          </div>
                        </dl>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getVoucherStatusClassName(voucher.status)}`}
                          >
                            {getVoucherStatusLabel(voucher.status)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getVoucherPaymentStatusClassName(paymentStatus)}`}
                          >
                            {getVoucherPaymentStatusLabel(paymentStatus)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenPaymentEditorId((currentId) =>
                                currentId === voucher.id ? null : voucher.id,
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-600 hover:text-white"
                          >
                            <WalletCards size={14} />
                            {paymentStatus === "pending"
                              ? "Registrar cobro"
                              : "Editar cobro"}
                          </button>

                          {isCanceled ? (
                            <button
                              type="button"
                              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-600 shadow-sm transition hover:border-blue-600 hover:bg-blue-600 hover:text-white"
                              onClick={() => {
                                setOpenPaymentEditorId(null);
                                setPlanToEdit(voucher);
                                setIsReactivateModalOpen(true);
                              }}
                            >
                              <RefreshCw size={14} /> Reactivar
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                aria-label={`Editar ${voucher.name}`}
                                disabled={isSubmittingEditVoucher}
                                onClick={() => {
                                  setOpenPaymentEditorId(null);
                                  setPlanToEdit(voucher);
                                  setIsEditVoucherModalOpen(true);
                                }}
                                className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Cancelar ${voucher.name}`}
                                disabled={isSubmittingRemoveVoucher}
                                onClick={() => {
                                  setOpenPaymentEditorId(null);
                                  setPlanToEdit(voucher);
                                  setIsRemoveVoucherModalOpen(true);
                                }}
                                className="rounded-lg border border-red-300 bg-red-100 p-2 text-red-600 shadow-sm transition hover:bg-red-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isPaymentEditorOpen && (
                      <tr>
                        <td colSpan={9} className="bg-slate-50 px-5 py-4">
                          <VoucherPaymentEditor
                            studentId={id}
                            voucher={voucher}
                            onCancel={() => setOpenPaymentEditorId(null)}
                            onSaved={handlePaymentSaved}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CustomModal
        isOpen={isEditVoucherModalOpen}
        onClose={() => setIsEditVoucherModalOpen(false)}
        title="Editar bono"
      >
        <div className="p-4">
          {planToEdit && (
            <EditVoucherForm
              student={student}
              plan={planToEdit}
              onSubmitForm={handleEditVoucher}
              isSubmitting={isSubmittingEditVoucher}
              onClose={() => setIsEditVoucherModalOpen(false)}
            />
          )}
        </div>
      </CustomModal>

      <CustomModal
        isOpen={isRemoveVoucherModalOpen}
        onClose={() => setIsRemoveVoucherModalOpen(false)}
        title="Cancelar bono"
      >
        <div className="p-4">
          {planToEdit && (
            <RemoveVoucherForm
              student={student}
              plan={planToEdit}
              onSubmitForm={handleRemoveVoucher}
              isSubmitting={isSubmittingRemoveVoucher}
              onClose={() => setIsRemoveVoucherModalOpen(false)}
            />
          )}
        </div>
      </CustomModal>

      <CustomModal
        isOpen={isReactivateModalOpen}
        onClose={() => setIsReactivateModalOpen(false)}
        title="Reactivar bono"
      >
        <div className="p-4">
          {planToEdit && (
            <div>
              <p className="flex text-sm text-white">
                ¿Estás seguro de que deseas volver a activar el bono {planToEdit.name}?
              </p>
              <p className="mt-2 flex gap-2 text-xs font-light text-gray-500">
                <AlertCircle size={14} /> El alumno volverá a tener acceso a las
                clases restantes.
              </p>
              <form onSubmit={handleReactivateVoucher}>
                <div className="mt-5 flex w-full items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReactivateModalOpen(false)}
                    className="cursor-pointer rounded-md bg-gray-100 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReactivate}
                    className={`inline-flex justify-center rounded-md px-4 py-2 text-sm text-white transition-colors ${
                      isSubmittingReactivate
                        ? "cursor-not-allowed bg-blue-400"
                        : "cursor-pointer bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {isSubmittingReactivate ? "Procesando..." : "Sí, reactivar"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </CustomModal>
    </div>
  );
}
