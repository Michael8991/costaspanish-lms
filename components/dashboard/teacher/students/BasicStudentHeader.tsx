"use client";

import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CustomModal from "@/components/ui/CustomModal";
import { DBPlanDoc } from "@/lib/types/student";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Mail,
  Phone,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

  const hasActiveCredits = student.activePlans.some(
    (plan) => plan.creditsRemaining! > 0 && plan.status === "active",
  );
  const breadcrumbItems = [
    { label: "Students", href: `/${locale}/dashboard/students` },
    { label: student.name, href: `/${locale}/dashboard/students/${id}` },
    { label: "Vouchers History" },
  ];
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
            onClick={() => setIsStatusModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium shadow-sm hover:cursor-pointer hover:bg-[#9e2727]! hover:border-[#9e2727] hover:text-white transition-colors transform duration-150 ease-in-out ${
              student.status === "active"
                ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                : "bg-[#9e2727] border-[#9e2727] text-white hover:bg-[#8a2222]"
            }`}
          >
            <AlertTriangle
              size={16}
              className={
                student.status === "active" ? "text-amber-500" : "text-white"
              }
            />
            {student.status === "active"
              ? "Deactivate Student"
              : "Activate Student"}
          </button>
          {/* //TODO: Poner enlace correcto */}
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9e2727] text-white text-sm font-medium rounded-lg hover:bg-[#8a2222] transition-colors shadow-sm cursor-pointer">
            <Plus size={16} />
            Add New Voucher
          </button>
        </div>
      </section>
      <CustomModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        title="Add New Voucher"
      >
        <div className="p-4">
          {/* Aquí irá tu formulario más adelante */}
          <p className="text-gray-600">
            Formulario para crear un nuevo bono de clases.
          </p>
        </div>
      </CustomModal>

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
          <p className="text-gray-600">
            ¿Estás seguro de que deseas cambiar el estado de {student.name}?
          </p>
        </div>
      </CustomModal>
    </div>
  );
}
