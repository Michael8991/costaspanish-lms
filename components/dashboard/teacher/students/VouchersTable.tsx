"use client";

import CustomModal from "@/components/ui/CustomModal";
import { DBPlanDoc } from "@/lib/types/student";
import { Pencil, Trash, RefreshCw, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import EditVoucherForm, { EditVoucherFormData } from "../forms/EditVoucherForm";
import RemoveVoucherForm, {
  RemoveVoucherFormData,
} from "../forms/RemoveVoucherForm";

import { FormattedPlan } from "../students/ActiveVouchersPanel";

export default function VouchersTable({
  id,
  student,
}: {
  id: string;
  student: string;
}) {
  const [vouchers, setVouchers] = useState<FormattedPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditVoucherModalOpen, setIsEditVoucherModalOpen] = useState(false);
  const [isSubmittingEditVoucher, setIsSubmittingEditVoucher] = useState(false);

  const [isRemoveVoucherModalOpen, setIsRemoveVoucherModalOpen] =
    useState(false);
  const [isSubmittingRemoveVoucher, setIsSubmittingRemoveVoucher] =
    useState(false);

  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [isSubmittingReactivate, setIsSubmittingReactivate] = useState(false);

  const [planToEdit, setPlanToEdit] = useState<FormattedPlan | null>(null);

  const handleRemoveVoucher = async (
    planId: string,
    formData: RemoveVoucherFormData,
  ) => {
    setIsSubmittingRemoveVoucher(true);
    try {
      const res = await fetch(`/api/students/${id}/plans/${planId}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData || "Error al borrar el bono.");
      }
      toast.success("Bono cancelado con exito.");
      window.location.reload();
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error("Ocurrió un error inesperado al borrar el bono.");
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
      const res = await fetch(`/api/students/${id}/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al actualizar el bono.");
      }

      toast.success("Bono actualizado con exito.");
      window.location.reload();
    } catch (error) {
      if (error instanceof Error) toast.error(error.message);
      else toast.error("Ocurrió un error inesperado al actualizar el bono.");
    } finally {
      setIsSubmittingEditVoucher(false);
    }
  };

  const handleReactivateVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planToEdit) return;
    setIsSubmittingReactivate(true);
    try {
      const res = await fetch(`/api/students/${id}/plans/${planToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Error al reactivar el bono.");
      toast.success("Bono reactivado con éxito.");
      window.location.reload();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Ocurrió un error inesperado.");
      } else {
        toast.error("Error al reactivar el bono.");
      }
    } finally {
      setIsSubmittingReactivate(false);
    }
  };

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/students/${id}/plans`);
        if (!response.ok) {
          throw new Error("Error al cargar los planes");
        }
        const data = await response.json();

        const formattedData: FormattedPlan[] = data.map((plan: DBPlanDoc) => {
          return {
            id: plan._id!.toString(),
            name: plan.name,
            billingType: plan.billingType,
            classType: plan.classType,
            totalCredits: plan.creditsTotal || 0,
            remainingCredits: plan.creditsRemaining || 0,
            // Convertimos fechas a string YYYY-MM-DD
            validFrom: plan.validFrom
              ? new Date(plan.validFrom).toISOString().split("T")[0]
              : "",
            validUntil: plan.validUntil
              ? new Date(plan.validUntil).toISOString().split("T")[0]
              : "",
            status: plan.status,
            price: plan.price || 0,
          };
        });

        // Ordenamos por fecha
        formattedData.sort(
          (a, b) =>
            new Date(b.validFrom).getTime() - new Date(a.validFrom).getTime(),
        );

        setVouchers(formattedData);
      } catch (error) {
        if (error instanceof Error) setError(error.message);
        else setError("Ocurrio un error inesperado");
      } finally {
        setIsLoading(false);
      }
    };
    fetchVoucher();
  }, [id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
            Activo
          </span>
        );
      case "exhausted":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
            Agotado
          </span>
        );
      case "expired":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
            Caducado
          </span>
        );
      case "canceled":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-500">
            Cancelado
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
          <tr>
            <th className="px-6 py-3">Plan</th>
            <th className="px-6 py-3">Tipo de bono</th>
            <th className="px-6 py-3">Modelo de clase</th>
            <th className="px-6 py-3">Créditos</th>
            <th className="px-6 py-3">Inicio</th>
            <th className="px-6 py-3">Vencimiento</th>
            <th className="px-6 py-3">Precio</th>
            <th className="px-6 py-3">Estado</th>
            <th className="px-6 py-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={9} className="px-6 py-4 text-center">
                <div className="p-8 text-center text-gray-500">
                  <p className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e2727] mx-auto mb-4"></p>
                  Loading vouchers...
                </div>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={9} className="px-6 py-8 text-center text-red-500">
                {error}
              </td>
            </tr>
          ) : vouchers.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                No hay planes registrados.
              </td>
            </tr>
          ) : (
            vouchers.map((v) => {
              const isCanceled = v.status === "canceled";

              return (
                <tr
                  key={v.id}
                  className={`transition-colors  ${
                    isCanceled
                      ? "bg-gray-50/50 opacity-60 grayscale-30"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {v.name}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {v.billingType}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {v.classType}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {v.remainingCredits} / {v.totalCredits}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(v.validFrom).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(v.validUntil).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {v.price > 0 ? (
                      <p>{v.price} €</p>
                    ) : (
                      <p className="font-light italic text-gray-400">
                        sin valor
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(v.status)}</td>
                  <td className="px-2 py-4 flex justify-center">
                    {isCanceled ? (
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 shadow-sm border border-gray-300 bg-white text-gray-600 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors duration-150 ease-in-out cursor-pointer text-xs font-medium"
                        onClick={() => {
                          setPlanToEdit(v);
                          setIsReactivateModalOpen(true);
                        }}
                      >
                        <RefreshCw size={14} /> Reactivate
                      </button>
                    ) : (
                      <>
                        <button
                          disabled={isSubmittingEditVoucher}
                          onClick={() => {
                            setPlanToEdit(v);
                            setIsEditVoucherModalOpen(true);
                          }}
                          className="p-2 shadow-sm border border-gray-200 bg-white rounded-lg hover:bg-green-600 hover:text-white transition-colors duration-150 ease-in-out cursor-pointer me-2"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          disabled={isSubmittingRemoveVoucher}
                          onClick={() => {
                            setPlanToEdit(v);
                            setIsRemoveVoucherModalOpen(true);
                          }}
                          className="p-2 shadow-sm border border-red-300 bg-red-100 text-red-600 rounded-lg hover:bg-red-500 hover:text-white transition-colors duration-150 ease-in-out cursor-pointer"
                        >
                          <Trash size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <CustomModal
        isOpen={isEditVoucherModalOpen}
        onClose={() => setIsEditVoucherModalOpen(false)}
        title="Edit Voucher"
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
        title="Remove Voucher"
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
        title="Reactivar Bono"
      >
        <div className="p-4">
          {planToEdit && (
            <div>
              <p className="text-white text-sm flex items-center">
                ¿Estás seguro de que deseas volver a activar el bono{" "}
                {planToEdit.name}?
              </p>
              <p className="text-gray-500 text-xs font-light flex gap-2 mt-2">
                <AlertCircle size={14} /> El alumno volverá a tener acceso a las
                clases restantes.
              </p>
              <form onSubmit={handleReactivateVoucher}>
                <div className="w-full flex items-center justify-end gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setIsReactivateModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReactivate}
                    className={`inline-flex justify-center rounded-md px-4 py-2 text-sm text-white transition-colors ${
                      isSubmittingReactivate
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                    }`}
                  >
                    {isSubmittingReactivate ? "Procesando..." : "Sí, Reactivar"}
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
