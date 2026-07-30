import CourseTemplateForm from "@/components/dashboard/courseTemplate/CourseTemplateForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function AddTemplatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [
    { label: "Cursos", href: `/${locale}/dashboard/courses` },
    { label: "Nueva plantilla" },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl font-semibold">Crear plantilla de curso</h1>
      <p className="mt-1 text-sm text-gray-500">
        Prepara una guía reutilizable con objetivos, módulos y clases modelo.
      </p>
      <div className="flex flex-col">
        <CourseTemplateForm
          locale={locale}
          submitLabel="Crear plantilla"
          endpoint="/api/course-template"
        />
      </div>
    </div>
  );
}
