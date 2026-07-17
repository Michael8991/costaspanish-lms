import EditLessonClient from "@/components/dashboard/lessons/edit/EditLessonClient";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  const breadcrumbItems = [
    { label: "Lessons", href: `/${locale}/dashboard/lessons` },
    { label: "Lesson detail", href: `/${locale}/dashboard/lessons/${id}` },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8 text-gray-800 md:px-8">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <EditLessonClient lessonId={id} locale={locale} />
    </div>
  );
}
