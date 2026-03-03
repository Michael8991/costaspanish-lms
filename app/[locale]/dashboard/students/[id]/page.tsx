import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { AlertTriangle, Mail } from "lucide-react";
// TODO: Esto vendrá de la base de datos usando el [id] de la URL
const mockStudent = {
  id: "1",
  name: "María García",
  email: "maria.garcia@gmail.com",
  status: "active",
};

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
      <div>
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
                mockStudent.status === "active"
                  ? "text-amber-500"
                  : "text-white"
              }
            />
            {mockStudent.status === "active"
              ? "Deactivate Student"
              : "Activate Student"}
          </button>
        </section>
      </div>
    </div>
  );
}
