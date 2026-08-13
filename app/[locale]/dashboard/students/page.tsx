import StudentsOverview from "@/components/dashboard/teacher/students/StudentsOverview";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function StudentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { locale } = await params;
  if (!session?.user) return null;

  if (!session?.user || session.user.role === "student") {
    redirect(`/${locale}/dashboard`);
  }

  const breadcrumbItems = [
    { label: "Students", href: `/${locale}/dashboard/students` },
  ];
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#F9FAFB]">
      <div className="container mx-auto max-w-6xl px-4 py-5 text-gray-800 md:px-8 md:py-8">
        <Breadcrumbs items={breadcrumbItems} locale={locale} />
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Estudiantes
        </h1>
        <p className="mt-1 text-sm font-normal text-gray-500">
          Un resumen rápido de todos nuestros estudiantes, su información y
          planes.
        </p>
        <StudentsOverview locale={locale} />
      </div>
    </main>
  );
}
