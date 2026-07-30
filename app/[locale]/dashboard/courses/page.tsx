import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CoursesTable from "@/components/dashboard/courses/CoursesTable";

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [{ label: "Courses" }];
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-gray-800 md:px-8">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-semibold text-slate-950">Cursos</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cursos reales asignados a alumnos y plantillas reutilizables.
        </p>
      </div>
      <div className="flex flex-col">
        <CoursesTable locale={locale} />
      </div>
    </div>
  );
}
