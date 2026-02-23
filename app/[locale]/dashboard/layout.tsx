import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?callbackUrl=/${params.locale}/dashboard`);

  return (
    <DashboardShell
      locale={params.locale}
      role={session.user.role}
      userName={session.user.name ?? session.user.name ?? "User"}
    >
      {children}
    </DashboardShell>
  );
}
