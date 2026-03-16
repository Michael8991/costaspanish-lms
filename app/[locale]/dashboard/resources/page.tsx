import ResourcesTable from "@/components/dashboard/resources/ResourcesTable";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function ResourcesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [{ label: "Resources" }];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Resources Collection</h1>
      <ResourcesTable />
    </div>
  );
}
