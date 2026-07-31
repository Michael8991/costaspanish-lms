import ClassBookPageClient from "@/components/dashboard/class-book/ClassBookPageClient";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role === "student") redirect(`/${locale}/dashboard`);

  return (
    <main className="container mx-auto max-w-screen-2xl px-4 py-8 text-slate-800 md:px-8">
      <Breadcrumbs items={[{ label: "Libro de clases" }]} locale={locale} />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-semibold text-slate-950">
          Libro de clases
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Consulta clases planificadas y completadas por curso.
        </p>
      </div>
      <ClassBookPageClient locale={locale} />
    </main>
  );
}
