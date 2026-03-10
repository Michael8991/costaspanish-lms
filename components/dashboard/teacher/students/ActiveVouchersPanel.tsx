"use client";
import { DBPlanDoc } from "@/lib/types/student";
import {
  ArrowRight,
  Calendar,
  CircleAlert,
  CreditCard,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NewVoucherFormData } from "../forms";
import { toast } from "sonner";
import CustomModal from "@/components/ui/CustomModal";
import NewVoucherForm from "../forms/NewVoucherForm";

export interface FormattedPlan {
  id: string;
  name: string;
  totalCredits: number;
  remainingCredits: number;
  expiryDate: string;
  status: string;
}

interface ActivePlansPanelProps {
  studentId: string;
  studentName: string;
  activePlans: FormattedPlan[];
  locale: string;
}

export default function ActiveVouchersPanel({
  studentId,
  studentName,
  activePlans,
  locale,
}: ActivePlansPanelProps) {
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isSubmittingNewVoucher, setIsSubmittingNewVoucher] = useState(false);

  const router = useRouter();

  const hasActiveCredits = activePlans.some(
    (plan) => plan.remainingCredits! > 0 && plan.status === "active",
  );

  const handleNewVoucher = async (formData: NewVoucherFormData) => {
    try {
      setIsSubmittingNewVoucher(true);
      const res = await fetch(`/api/students/${studentId}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Error al crear el bono.");
      }

      toast.success("Nuevo bono creado con exito.");

      setIsVoucherModalOpen(false);

      router.refresh();
      window.location.reload();
    } catch (error: unknown) {
      //   console.error(error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Ocurrió un error inesperado al crear el bono.");
      }
    } finally {
      setIsSubmittingNewVoucher(false);
    }
  };
  const activeVouchersCount = activePlans.filter(
    (plan) => plan.status === "active",
  ).length;

  return (
    <div className="xl:col-span-2 flex flex-col gap-6 my-5">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header de la sección */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#9e2727]" />
            <h2 className="font-semibold text-gray-900">Active & Past Plans</h2>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              disabled={isSubmittingNewVoucher}
              onClick={() => setIsVoucherModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9e2727] text-white text-sm font-medium rounded-lg hover:bg-[#8a2222] transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} />
              Add New Voucher
            </button>
          </div>
        </div>

        {/* Lista de Planes */}
        <div className="p-5 flex flex-col gap-4">
          {activePlans.map((plan) => {
            const percentage =
              (plan.remainingCredits / plan.totalCredits) * 100;
            const isLow =
              plan.remainingCredits > 0 && plan.remainingCredits <= 2;

            return (
              <div
                key={plan.id}
                className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors bg-white shadow-sm"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {plan.name}
                      <span
                        className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full border ${
                          plan.status === "active"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <Calendar size={12} />
                      <span>Expires: {plan.expiryDate}</span>
                    </div>
                  </div>

                  <div className="text-right w-full sm:w-auto">
                    <p className="text-sm font-medium text-gray-900">
                      {plan.remainingCredits} / {plan.totalCredits} Credits
                    </p>
                    <p className="text-xs text-gray-500">Remaining</p>
                  </div>
                </div>
                {/* Barra de progreso */}
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      plan.status === "exhausted"
                        ? "bg-gray-300"
                        : isLow
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                {isLow && (
                  <p className="flex items-center gap-2 text-xs text-amber-600 mt-2 font-medium">
                    <CircleAlert size={14} /> Running low on credits! Time to
                    remind the student to renew.
                  </p>
                )}
                {/* //TODO: Enlaces reales */}
                <div className="flex w-full items-center justify-end mt-3">
                  <Link
                    href={"#"}
                    className="items-center text-[11px] font-medium text-gray-400 hover:text-[#9e2727] transition-colors flex gap-1 mt-1 border rounded-lg border-gray-300 px-2 py-1 hover:border-[#9e2727]"
                  >
                    <Pencil size={12} /> Edit Voucher
                  </Link>
                </div>
              </div>
            );
          })}
          <div className="flex w-full items-center justify-end">
            {/* //TODO: Agregar enlace real al historial de clases */}
            <Link
              href={`/${locale}/dashboard/students/${studentId}/vouchersHistory`}
              className="text-[#9e2727] text-sm flex items-center gap-2 group"
            >
              See Full Vouchers History
              <ArrowRight
                size={14}
                className="group-hover:translate-x-1 transition-all transform duration-100 ease-in"
              />
            </Link>
          </div>
        </div>
      </div>
      <CustomModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Add New Voucher"
      >
        <div className="p-4">
          <NewVoucherForm
            student={studentName}
            onSubmitForm={handleNewVoucher}
            isSubmitting={isSubmittingNewVoucher}
            onClose={() => setIsVoucherModalOpen(false)}
            activeVouchersCount={activeVouchersCount}
          />
        </div>
      </CustomModal>
    </div>
  );
}
