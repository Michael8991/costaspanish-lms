import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import AdminHome from "./home/AdminHome";
import TeacherHome from "./home/TeacherHome";
import StudentHome from "./home/StudentHome";

export default async function DashboardPage({
  params,
}: {
  params: { locale: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const role = session.user.role;

  if (role === "admin") return <AdminHome locale={params.locale} />;
  if (role === "teacher") return <TeacherHome locale={params.locale} />;

  return <StudentHome locale={params.locale} />;
}
