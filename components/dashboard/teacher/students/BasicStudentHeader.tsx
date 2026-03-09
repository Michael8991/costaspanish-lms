"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CustomModal from "@/components/ui/CustomModal";
import { DBPlanDoc } from "@/lib/types/student";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Mail,
  Phone,
  Plus,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import DeactiveStudentForm, {
  DeactiveStudentFormData,
} from "../forms/DeactiveStudentForm";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface StudentProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  activePlans: DBPlanDoc[];
}

export default function BasicStudentHeader({
  locale,
  id,
  student,
}: {
  locale: string;
  id: string;
  student: StudentProps;
}) {
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const router = useRouter();

  const hasActiveCredits = student.activePlans.some(
    (plan) => plan.creditsRemaining! > 0 && plan.status === "active",
  );

  const breadcrumbItems = [
    { label: "Students", href: `/${locale}/dashboard/students` },
    { label: student.name, href: `/${locale}/dashboard/students/${id}` },
    { label: "Vouchers History" },
  ];

  const handleToggleStatus = async (formData: DeactiveStudentFormData) => {
    try {
      setIsSubmittingStatus(true);

      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Error en la respuesta del servidor");
      }

      toast.success(
        formData.isActive
          ? "Estudiante activado correctamente"
          : "Estudiante desactivado correctamente",
      );

      setIsStatusModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Error interno cambiando el estado del estudiante");
    } finally {
      setIsSubmittingStatus(false);
    }
  };
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <div className="flex items-center justify-end">
        <Link
          href={`/${locale}/dashboard/students/${id}`}
          className="flex items-center gap-2 text-sm group border rounded-lg px-2 py-1 border-gray-400 hover:bg-[#9e2727] hover:text-white transition-all transform duration-150 ease-in-out hover:border-[#9e2727]"
        >
          <ArrowLeft
            size={12}
            className="group-hover:-translate-x-1 transition-all transform duration-150 ease-in-out"
          />
          Back
        </Link>
      </div>
      {/* 2. HEADER DEL PERFIL */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
        <div className="flex flex-wrap items-center gap-6 max-md:justify-center ">
          {/* Avatar con la inicial */}
          <div className="w-20 h-20 rounded-full bg-[#9e2727]/10 border-2 border-[#9e2727]/20 flex items-center justify-center text-[#9e2727]">
            <span className="text-3xl font-bold">{student.name.charAt(0)}</span>
          </div>

          {/* Info principal */}
          <div className="flex flex-col max-md:items-center">
            <div className="flex flex-wrap gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {student.name}
              </h1>
              {/* Badge de Estado */}
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
                    student.status === "active"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  {student.status === "active" && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                  )}
                  {student.status === "active"
                    ? "Active Student"
                    : "Inactive Student"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mt-1 mb-1 max-md:justify-center">
              <div className="flex items-center gap-2">
                <Mail size={14} />
                <p>{student.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="" size={14} />
                <p>{student.phone}</p>
              </div>
            </div>
            {!hasActiveCredits ? (
              <div className="w-full items-center">
                <p className="flex items-center gap-2 text-orange-700 text-sm">
                  <AlertCircle size={16} /> No hay planes activos
                </p>
              </div>
            ) : (
              ""
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-end gap-4 max-md:mx-auto">
          {/* Botón de Cambiar Estado (Preparado para el Modal) */}
          <button
            onClick={() => {
              if (student.status === "active") {
                setIsStatusModalOpen(true);
              } else {
                handleToggleStatus({ isActive: true });
              }
            }}
            disabled={isSubmittingStatus}
            className={`
    group flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-sm font-medium shadow-sm transition-all duration-200 bg-white
    ${isSubmittingStatus ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
    ${
      student.status === "active"
        ? "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50" // Hover Rojo (Archivar)
        : "border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50" // Hover Verde (Reactivar)
    }
  `}
          >
            {/* Icono dinámico: Si está cargando, damos vueltas. Si no, mostramos Archivo o Flechas */}
            {isSubmittingStatus ? (
              <RefreshCw size={14} className="animate-spin text-gray-400" />
            ) : student.status === "active" ? (
              <Archive
                size={14}
                className="transition-transform group-hover:scale-110"
              />
            ) : (
              <RefreshCw
                size={14}
                className="transition-transform group-hover:rotate-180"
              />
            )}

            {/* Texto dinámico */}
            {isSubmittingStatus && student.status !== "active"
              ? "Activating..."
              : student.status === "active"
                ? "Archive Student"
                : "Reactivate Student"}
          </button>
          {/* //TODO: Poner enlace correcto */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9e2727] text-white text-sm font-medium rounded-lg hover:bg-[#8a2222] transition-colors shadow-sm cursor-pointer">
            <Plus size={16} />
            Add New Voucher
          </button>
        </div>
      </section>

      {/* Modals */}
      <CustomModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Add New Voucher"
      >
        <div className="p-4">
          {/* //TODO: Formulario */}
          <p className="text-gray-600">
            Formulario para crear un nuevo bono de clases.
          </p>
        </div>
      </CustomModal>

      {/* Modal de cambio de estado de estudiante */}
      <CustomModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={
          student.status === "active"
            ? "Deactivate Student"
            : "Activate Student"
        }
      >
        <div className="p-4">
          <DeactiveStudentForm
            student={student.name}
            onSubmitForm={handleToggleStatus}
            isSubmitting={isSubmittingStatus}
            onClose={() => setIsStatusModalOpen(false)}
          />
        </div>
      </CustomModal>
    </div>
  );
}
