import FirstStepAddLesson from "@/components/dashboard/lessons/add/FirstStepAddLesson";
import SecondStepAddLesson from "@/components/dashboard/lessons/add/SecondStepAddLesson";
import ThirdStepAddLesson from "@/components/dashboard/lessons/add/ThirdStepAddLesson";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function AddLessonPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [
    { label: "Lecciones", href: `/${locale}/dashboard/lessons` },
    { label: "Agregar Lección" },
  ];

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <div className="mb-6">
        <h1 className="text-2xl">Agregar Lección</h1>
      </div>
      <div className="w-full flex-col items-center">
        <FirstStepAddLesson />
        <SecondStepAddLesson />
        <ThirdStepAddLesson />
      </div>
    </div>
  );
}
