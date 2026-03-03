import StudentsTable from "@/components/dashboard/teacher/students/StudentsTable";
import SummaryStudentsData from "@/components/dashboard/teacher/students/SummaryStudentsData";
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
      <h1 className="text-2xl">Students Overview</h1>
      <p className="italic text-sm font-light">
        A quick summary of all ours students, their information and plans
      </p>
      <SummaryStudentsData />
      <StudentsTable locale={locale} />
    </div>
  );
}
