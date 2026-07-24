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
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <Breadcrumbs items={breadcrumbItems} locale={locale} />
      <h1 className="text-2xl">Estudiantes</h1>
      <p className="text-sm font-light">
        Un resumen rápido de todos nuestros estudiantes, su información y
        planes.
      </p>
      <StudentsOverview locale={locale} />
    </div>
  );
}
