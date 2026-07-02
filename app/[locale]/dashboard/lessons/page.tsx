import LessonsTable from "@/components/dashboard/lessons/LessonsTable";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function AddCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [
    { label: "Lessons", href: `/${locale}/dashboard/lessons` },
  ];

  //GET

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Lessons</h1>
      <div className="flex flex-col">
        <LessonsTable />
      </div>
    </div>
  );
}
