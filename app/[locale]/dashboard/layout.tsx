import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DashboardShell } from "@/components";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);
  if (!session) redirect(`/login?callbackUrl=/${locale}/dashboard`);

  return (
    <DashboardShell
      locale={locale}
      role={session.user.role}
      userName={session.user.name ?? session.user.email ?? "User"}
    >
      {children}
    </DashboardShell>
  );
}
