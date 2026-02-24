import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import AdminHome from "./home/AdminHome";
import TeacherHome from "./home/TeacherHome";
import StudentHome from "./home/StudentHome";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const { locale } = await params;

  const role = session.user.role;

  if (role === "admin") return <AdminHome locale={locale} />;
  if (role === "teacher") return <TeacherHome locale={locale} />;

  return <StudentHome locale={locale} />;
}
