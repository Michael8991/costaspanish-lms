"use client";

import { Search, Plus, MoreVertical, Mail } from "lucide-react";

const mockStudents = [
  {
    id: "1",
    name: "María García",
    email: "maria.garcia@gmail.com",
    level: "B2",
    status: "active",
    planType: "Bono 10 Clases",
    creditsRemaining: 4,
  },
  {
    id: "14",
    name: "John Smith",
    email: "john.smith@yahoo.com",
    level: "A1",
    status: "active",
    planType: "Suscripción Mensual",
    creditsRemaining: 8,
  },
  {
    id: "13",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "12",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "11",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "10",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "9",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "8",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "7",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "6",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "5",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
  {
    id: "4",
    name: "Sophie Martin",
    email: "sophie.m@outlook.com",
    level: "Evaluando",
    status: "exhausted",
    planType: "Bono 5 Clases",
    creditsRemaining: 0,
  },
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

export default function StudentsTable() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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

          <button className="w-full sm:w-auto bg-[#9e2727] hover:bg-[#a85d5d] text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm font-medium text-sm">
            <Plus size={18} />
            <span>Nuevo Alumno</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
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
            {mockStudents.map((student) => (
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

                <td className="px-6 py-4 text-right">
                  <button className="p-2 text-gray-400 hover:text-[#9e2727] hover:bg-red-50 rounded-lg transition-colors">
                    <MoreVertical size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
