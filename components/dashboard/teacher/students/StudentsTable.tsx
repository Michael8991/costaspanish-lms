"use client";

import { DBStudent, TableStudent } from "@/lib/types/student";
import {
  Search,
  Plus,
  MoreVertical,
  Mail,
  LucideIcon,
  FileUser,
  CreditCard,
  UserRoundPen,
  Send,
  CalendarPlus,
  AlertCircle,
  BrushCleaning,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type QuickOptionsMenu = {
  label: string;
  href: (id: string) => string;
  icon: LucideIcon;
};
const quickOptionsMenu: QuickOptionsMenu[] = [
  {
    label: "Profile details",
    href: (id) => `/dashboard/students/${id}`,
    icon: FileUser,
  },
  {
    label: "View Vouchers",
    href: (id) => `/dashboard/students/${id}/vouchersHistory`,
    icon: CreditCard,
  },
  {
    label: "New Lesson",
    href: (id) => `/dashboard/students/${id}/lessons/newLesson`,
    icon: CalendarPlus,
  },
  {
    label: "Edit Student",
    href: (id) => `/dashboard/students/${id}/editStudent`,
    icon: UserRoundPen,
  },
  {
    label: "Send email",
    href: (id) => `/dashboard/students/${id}?action=email`,
    icon: Send,
  },
  //TODO:send email and whatsapp
];

const getLevelBadge = (level: string) => {
  if (level === "Evaluando")
    return "bg-amber-100 text-amber-700 border-amber-200";
  if (["A1", "A2"].includes(level))
    return "bg-green-100 text-green-700 border-green-200";
  if (["B1", "B2"].includes(level))
    return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-purple-100 text-purple-700 border-purple-200";
};

export default function StudentsTable({ locale }: { locale: string }) {
  const withLocale = (path: string) =>
    `/${locale}${path.startsWith("/") ? path : `/${path}`}`;

  const [students, setStudents] = useState<TableStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/students");
        if (!response.ok) {
          throw new Error("Error al cargar los alumnos");
        }
        const data = await response.json();

        const formattedData: TableStudent[] = data.items.map(
          (student: DBStudent) => {
            const currentPlan =
              student.activePlans && student.activePlans.length > 0
                ? student.activePlans[0]
                : null;

            return {
              id: student._id,
              name: student.fullName,
              email: student.contactEmail,
              level: student.level,
              status: student.isActive ? "active" : "exhausted",
              planType: currentPlan ? currentPlan.name : "Sin plan",
              creditsRemaining:
                currentPlan && currentPlan.creditsRemaining
                  ? currentPlan.creditsRemaining
                  : 0,
            };
          },
        );

        setStudents(formattedData);
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
    fetchStudent();
  }, []);

  const [isOpenQO, setIsOpenQO] = useState<string | null>(null);
  const toggleQuickOptionsMenu = (studentId: string) => {
    setIsOpenQO((prev) => (prev === studentId ? null : studentId));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        !target.closest(".menu-button") &&
        !target.closest(".menu-dropdown")
      ) {
        setIsOpenQO(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
        <h2 className="font-semibold text-gray-800 text-lg">Students</h2>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar alumno..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9e2727] focus:border-transparent transition-shadow"
            />
          </div>

          <Link
            href={`/${locale}/dashboard/students/newStudent`}
            className="w-full sm:w-auto bg-[#9e2727] hover:bg-[#a85d5d] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm font-medium text-sm"
          >
            <Plus size={18} />
            <span>Nuevo Alumno</span>
          </Link>
        </div>
      </div>

      {isLoading && (
        <div className="p-8 text-center text-gray-500">
          <p className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9e2727] mx-auto mb-4"></p>
          Loading students...
        </div>
      )}

      {error && (
        <div className="w-full flex items-center justify-center py-4 gap-2 text-red-500">
          <AlertCircle size={16} />
          Ocurrio un error {error}
        </div>
      )}

      {!isLoading && !error && students.length <= 0 && (
        <div className="flex items-center justify-center py-5 gap-2 text-green-900">
          No hay alumnos registrados
          <BrushCleaning size={16} />
        </div>
      )}

      {/* Tabla de alumnos */}
      {!isLoading && !error && students.length > 0 && (
        <div className="overflow-y-visible">
          <table className="w-full text-left border-collapse ">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">Alumno</th>
                <th className="px-6 py-4 font-medium">Nivel</th>
                <th className="px-6 py-4 font-medium">Plan Actual</th>
                <th className="px-6 py-4 font-medium">Clases Restantes</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student, index) => {
                const isLastRows =
                  students.length > 4 && index >= students.length - 2;
                return (
                  <tr
                    key={student.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-sm">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.name}
                          </p>
                          <div className="flex items-center gap-1 text-gray-500 text-sm">
                            <Mail size={12} />
                            <span>{student.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full border ${getLevelBadge(student.level)}`}
                      >
                        {student.level}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.planType}
                    </td>

                    <td className="px-6 py-4">
                      {student.creditsRemaining > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-medium border border-green-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          {student.creditsRemaining} clases
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium border border-red-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Agotado
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right relative">
                      <button
                        onClick={() => toggleQuickOptionsMenu(student.id)}
                        className={`menu-button p-2 text-gray-400 hover:text-[#9e2727] hover:bg-red-50 rounded-lg transition-colors hover:cursor-pointer`}
                      >
                        <MoreVertical size={20} />
                      </button>
                      <div
                        className={`menu-dropdown py-4 px-4 absolute right-0 mt-3 min-w-55 z-50 flex flex-col rounded-lg bg-[#9e2727] gap-3 origin-top-right shadow-xl transform transition-all duration-200 ease-in-out -translate-x-5 justify-center
                                ${isLastRows ? "bottom-10 origin-bottom-right" : "top-12 origin-top-right"}
                                ${isOpenQO === student.id ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}`}
                      >
                        {quickOptionsMenu.map((object, index) => {
                          const Icon = object.icon;
                          return (
                            <Link
                              key={index}
                              onClick={() => setIsOpenQO(null)}
                              href={withLocale(object.href(student.id))}
                              className="flex items-center hover:bg-[#a85d5d] py-2 px-4 rounded-lg text-white transform transition-all duration-200 ease-in-out"
                            >
                              <Icon size={18} className="me-2" />
                              {object.label}
                            </Link>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
