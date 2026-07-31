import FinanceDashboard from "@/components/dashboard/finance/FinanceDashboard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function FinancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="container mx-auto max-w-7xl px-4 py-8 text-slate-800 md:px-8">
      <Breadcrumbs items={[{ label: "Economía" }]} locale={locale} />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-semibold text-slate-950">Economía</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumen de cobros y créditos devengados por clases.
        </p>
      </div>
      <FinanceDashboard />
    </main>
  );
}
