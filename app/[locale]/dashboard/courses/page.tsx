import Breadcrumbs from "@/components/ui/Breadcrumbs";
import QuickStats from "../../../../components/dashboard/courses/QuickStats";
import CoursesTable from "@/components/dashboard/courses/CoursesTable";

export default async function CoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [{ label: "Courses" }];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Courses Collection</h1>
      <div className="flex flex-col">
        <QuickStats />
        <CoursesTable locale={locale} />
      </div>
    </div>
  );
}
