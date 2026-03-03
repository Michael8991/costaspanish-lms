import Breadcrumbs from "@/components/ui/Breadcrumbs";
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
      <div>HJola</div>
    </div>
  );
}
