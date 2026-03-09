"use client";

import { DBPlanDoc } from "@/lib/types/student";
import { PlanDoc } from "@/models/StudentProfile";
import { Pencil, Trash } from "lucide-react";
import { useEffect, useState } from "react";

export default function VouchersTable({ id }: { id: string }) {
  const [vouchers, setVouchers] = useState<PlanDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVoucher = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/students/${id}/plans`);
        if (!response.ok) {
          throw new Error("Error al cargar los alumnos");
        }
        const data = await response.json();

        const formattedData: PlanDoc[] = data.map((plan: DBPlanDoc) => {
          return {
            ...plan,
            _id: plan._id,
            name: plan.name,
            billingType: plan.billingType,
            classType: plan.classType,
            creditsTotal: plan.creditsTotal,
            creditsRemaining: plan.creditsRemaining,
            validFrom: plan.validFrom,
            validUntil: plan.validUntil,
            status: plan.status,
          };
        });
        setVouchers(formattedData);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("Ocurrio un error inesperado");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchVoucher();
  }, [id]);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {!isLoading && vouchers.length === 0}
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600 font-medium border-b">
          <tr>
            <th className="px-6 py-3">Plan</th>
            <th className="px-6 py-3">Créditos</th>
            <th className="px-6 py-3">Inicio</th>
            <th className="px-6 py-3">Vencimiento</th>
            <th className="px-6 py-3">Estado</th>
            <th className="px-6 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center">
                <div className="p-8 text-center text-gray-500">
                  <p className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e2727] mx-auto mb-4"></p>
                  Loading vouchers...
                </div>
              </td>
            </tr>
          ) : vouchers.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                No hay planes registrados.
              </td>
            </tr>
          ) : (
            vouchers
              .filter((v) => v._id)
              .map((v) => {
                return (
                  <tr
                    key={v._id.toString()}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {v.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {v.creditsRemaining} / {v.creditsTotal}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(v.validFrom).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(v.validUntil).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          v.creditsRemaining! <= 0
                            ? "bg-gray-100 text-gray-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {v.status === "active" ? "Finalizado" : "Activo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      <button className="p-2 shadow-sm border border-gray-200 rounded-lg hover:bg-green-600 hover:text-white transition-colors duration-150 ease-in-out cursor-pointer">
                        <Pencil size={16} />
                      </button>
                      <button className="p-2 shadow-sm border border-red-300 bg-red-300 rounded-lg hover:bg-red-500 hover:text-white transition-colors duration-150 ease-in-out cursor-pointer">
                        <Trash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
          )}
        </tbody>
      </table>
    </div>
  );
}
