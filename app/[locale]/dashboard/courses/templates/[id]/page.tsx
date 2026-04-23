import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { OnProgressPage } from "@/components/ui/onProgressPage/OnProgressPage";
import { Types } from "mongoose";
import { notFound } from "next/navigation";

export default async function CourseTemplateDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    notFound();
  }
  const breadcrumbItems = [
    { label: "Courses", href: `/${locale}/dashboard/courses` },
    { label: "Details Course Template" },
  ];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Creación de nuevo curso plantilla</h1>
      <div className="flex flex-col">
        <OnProgressPage locale={locale} safePlace={true} />
      </div>
    </div>
  );
}
