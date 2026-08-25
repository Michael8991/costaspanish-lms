import { redirect } from "next/navigation";

import LessonsWorkspace from "@/components/dashboard/lessons/LessonsWorkspace";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { LessonProvider } from "@/context/LessonContext";
import {
  getTodayLessonDateValue,
  isLessonCalendarView,
  isValidLessonDateValue,
} from "@/lib/utils/lesson-calendar";

export default async function LessonsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const rawView = typeof query.view === "string" ? query.view : undefined;
  const rawDate = typeof query.date === "string" ? query.date : undefined;
  const viewMode = isLessonCalendarView(rawView) ? rawView : "week";
  const dateValue = isValidLessonDateValue(rawDate)
    ? rawDate!
    : getTodayLessonDateValue();

  if (rawView !== viewMode || rawDate !== dateValue) {
    const normalized = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (key === "view" || key === "date" || value === undefined) return;
      normalized.set(key, Array.isArray(value) ? value[0] : value);
    });
    normalized.set("view", viewMode);
    normalized.set("date", dateValue);
    redirect(`/${locale}/dashboard/lessons?${normalized.toString()}`);
  }
  const breadcrumbItems = [
    { label: "Lessons", href: `/${locale}/dashboard/lessons` },
  ];

  return (
    <LessonProvider
      locale={locale}
      initialViewMode={viewMode}
      initialDateValue={dateValue}
    >
      <div className="container mx-auto min-w-0 max-w-[1600px] px-3 py-6 text-gray-800 sm:px-4 md:px-8 md:py-8">
        <Breadcrumbs items={breadcrumbItems} locale={locale} />
        <div className="mb-5">
          <h1 className="text-2xl font-semibold text-gray-950">
            {locale === "es" ? "Lecciones" : "Lessons"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {locale === "es"
              ? "Planea, revisa y administra el programa de lecciones."
              : "Plan, review and manage the lesson schedule."}
          </p>
        </div>
        <LessonsWorkspace />
      </div>
    </LessonProvider>
  );
}
