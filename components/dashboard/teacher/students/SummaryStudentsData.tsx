import { AlertCircle, GraduationCap, Users } from "lucide-react";

import type { StudentListSummary } from "@/lib/dto/student.dto";

interface SummaryStudentsDataProps {
  summary: StudentListSummary;
  isLoading: boolean;
}

export default function SummaryStudentsData({
  summary,
  isLoading,
}: SummaryStudentsDataProps) {
  const stats = [
    {
      title: "Alumnos Activos",
      value: summary.activeStudents,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Bonos que terminarán pronto",
      value: summary.expiringPlansSoon,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    {
      title: "Nivel Pendiente",
      value: summary.pendingLevel,
      icon: GraduationCap,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-gray-800 md:px-8">
      <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className={`flex items-center gap-5 rounded-xl border bg-white p-6 shadow-sm ${stat.border}`}
            >
              <div className={`rounded-full p-4 ${stat.bg}`}>
                <Icon className={stat.color} size={28} strokeWidth={2} />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-gray-500">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoading ? "—" : stat.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
