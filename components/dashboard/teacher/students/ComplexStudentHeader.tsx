"use client";

import CustomModal from "@/components/ui/CustomModal";
import { DBAcademicLevel } from "@/lib/types/student";
import { Archive, Mail, Pencil, Phone, RefreshCw } from "lucide-react";
import Link from "next/link";
import DeactiveStudentForm, {
  DeactiveStudentFormData,
} from "../forms/DeactiveStudentForm";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
interface studentProps {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  goals: string[];
  country: string;
  timezone: string;
  level: DBAcademicLevel;
  internalNotes?: string;
  nativeLanguage?: string;
}

export default function ComplexStudentHeader({
  student,
}: {
  student: studentProps;
}) {
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isSubmittingStatus, setIsSubmittingStatus] = useState(false);

  const router = useRouter();

  const handleToggleStatus = async (formData: DeactiveStudentFormData) => {
    try {
      setIsSubmittingStatus(true);

      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        cache: "no-store",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Error del servidor");

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
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
      <div className="flex flex-wrap items-center gap-6 max-md:justify-center ">
        {/* Avatar con la inicial */}
        <div className="w-20 h-20 rounded-full bg-[#9e2727]/10 border-2 border-[#9e2727]/20 flex items-center justify-center text-[#9e2727]">
          <span className="text-3xl font-bold">{student.name.charAt(0)}</span>
        </div>

        {/* Info principal */}
        <div className="flex flex-col max-md:items-center">
          <div className="flex flex-wrap gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
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

          <div className="flex items-center gap-2 text-gray-500 italic text-xs mb-3">
            <p>
              {student.country ? student.country : ""}, {student.timezone}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-gray-500 text-sm mt-1 mb-3 max-md:justify-center">
            <p className="py-1 px-2 bg-orange-200 rounded-lg text-black text-xs">
              {student.nativeLanguage}
            </p>
            <p className="py-1 px-2 bg-blue-200 rounded-lg text-black text-xs">
              {student.level}
            </p>
            {student.goals.map((goal, index) => (
              <p
                key={index}
                className="py-1 px-2 bg-gray-200 rounded-lg text-black text-xs"
              >
                {goal}
              </p>
            ))}
          </div>
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
                        ? "border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-700 hover:bg-red-50"
                        : "border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50"
                    }
                `}
        >
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
        <Link
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm bg-white border-gray-300 text-gray-700 hover:bg-green-800! hover:border-green-900 hover:text-white transform duration-150 ease-in-out`}
          href={"#"}
        >
          <Pencil size={16} />
          Edit Student
        </Link>
      </div>
      <div className="absolute z-0">
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
    </section>
  );
}
