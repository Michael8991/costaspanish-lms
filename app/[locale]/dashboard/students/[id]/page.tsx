import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { AlertTriangle, Calendar, CreditCard, Mail, Plus } from "lucide-react";
// TODO: Esto vendrá de la base de datos usando el [id] de la URL
const mockStudent = {
  id: "1",
  name: "María García",
  email: "maria.garcia@gmail.com",
  status: "active",
};

const mockPlans = [
  {
    id: "p1",
    name: "Bono 10 Clases",
    totalCredits: 10,
    remainingCredits: 3,
    expiryDate: "15 Jun 2026",
    status: "active",
  },
  {
    id: "p2",
    name: "Bono 5 Clases",
    totalCredits: 5,
    remainingCredits: 0,
    expiryDate: "10 Feb 2026",
    status: "exhausted",
  },
];

export default async function StudentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const breadcrumbItems = [
    { label: "Students", href: `/${locale}/dashboard/students` },
    { label: mockStudent.name }, // Sin href, para que sea el texto final truncado
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      {/* 2. HEADER DEL PERFIL */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-6">
          {/* Avatar con la inicial */}
          <div className="w-20 h-20 rounded-full bg-[#9e2727]/10 border-2 border-[#9e2727]/20 flex items-center justify-center text-[#9e2727]">
            <span className="text-3xl font-bold">
              {mockStudent.name.charAt(0)}
            </span>
          </div>

          {/* Info principal */}
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-gray-900">
              {mockStudent.name}
            </h1>

            <div className="flex items-center gap-2 text-gray-500 text-sm mt-1 mb-3">
              <Mail size={14} />
              <p>{mockStudent.email}</p>
            </div>

            {/* Badge de Estado */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${
                  mockStudent.status === "active"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-50 text-gray-700 border-gray-200"
                }`}
              >
                {mockStudent.status === "active" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                )}
                {mockStudent.status === "active"
                  ? "Active Student"
                  : "Inactive Student"}
              </span>
            </div>
          </div>
        </div>

        {/* Botón de Cambiar Estado (Preparado para el Modal) */}
        <button
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors shadow-sm ${
            mockStudent.status === "active"
              ? "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              : "bg-[#9e2727] border-[#9e2727] text-white hover:bg-[#8a2222]"
          }`}
        >
          <AlertTriangle
            size={16}
            className={
              mockStudent.status === "active" ? "text-amber-500" : "text-white"
            }
          />
          {mockStudent.status === "active"
            ? "Deactivate Student"
            : "Activate Student"}
        </button>
      </section>
      {/* COLUMNA IZQUIERDA: Planes Activos (Ocupa 2/3 en escritorio) */}
      <div className="xl:col-span-2 flex flex-col gap-6 my-5">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header de la sección */}
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-[#9e2727]" />
              <h2 className="font-semibold text-gray-900">
                Active & Past Plans
              </h2>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#9e2727] text-white text-sm font-medium rounded-lg hover:bg-[#8a2222] transition-colors shadow-sm">
              <Plus size={16} />
              Add New Plan
            </button>
          </div>

          {/* Lista de Planes */}
          <div className="p-5 flex flex-col gap-4">
            {mockPlans.map((plan) => {
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
                    <p className="text-xs text-amber-600 mt-2 font-medium">
                      ⚠️ Running low on credits! Time to remind the student to
                      renew.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
