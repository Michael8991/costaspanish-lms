import FormNewStudent from "@/components/dashboard/teacher/students/FormNewStudent";

export default async function newStudentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <h1 className="text-2xl font-bold">New students form</h1>
      <FormNewStudent locale={locale} />
    </div>
  );
}
