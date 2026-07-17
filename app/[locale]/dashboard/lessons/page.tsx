import LessonsHeader from "@/components/dashboard/lessons/LessonsHeader";
import LessonsTable from "@/components/dashboard/lessons/LessonsTable";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LessonProvider } from "@/context/LessonContext";

export default async function LessonsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [
    { label: "Lessons", href: `/${locale}/dashboard/lessons` },
  ];

  return (
    <LessonProvider>
      <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
        <Breadcrumbs items={breadcrumbItems} locale={locale} />
        <div className="mb-6">
          <h1 className="text-2xl">Lecciones</h1>
          <p>Planea, revisa y administra el programa de lecciones.</p>
        </div>
        <div className="flex flex-col">
          <LessonsHeader locale={locale} />
          <LessonsTable locale={locale} />
        </div>
      </div>
    </LessonProvider>
  );
}
