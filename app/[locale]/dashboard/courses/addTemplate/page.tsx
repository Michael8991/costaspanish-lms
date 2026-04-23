import CourseTemplateForm from "@/components/dashboard/courseTemplate/CourseTemplateForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function AddTemplatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [
    { label: "Courses", href: `/${locale}/dashboard/courses` },
    { label: "Add Course Template" },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Creación de nuevo curso plantilla</h1>
      <div className="flex flex-col">
        <CourseTemplateForm
          locale={locale}
          submitLabel="Create template"
          endpoint="/api/course-template"
        />
      </div>
    </div>
  );
}
