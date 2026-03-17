import AddResourceForm from "@/components/dashboard/resources/AddResourceForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function AddResourcePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const breadcrumbItems = [
    { label: "Resources", href: `/${locale}/dashboard/resources` },
    { label: "New Resource" },
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <AddResourceForm />
    </div>
  );
}
