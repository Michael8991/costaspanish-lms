import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { OnProgressPage } from "@/components/ui/onProgressPage/OnProgressPage";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const breadcrumbItems = [{ label: "Calendar" }];
  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Calendar Collection</h1>
      <OnProgressPage locale={locale} />
    </div>
  );
}
