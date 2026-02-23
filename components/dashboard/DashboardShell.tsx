import { Topbar } from "./Topbar";

export const DashboardShell = ({
  children,
  locale,
  role,
  userName,
}: {
  children: React.ReactNode;
  locale: string;
  role: "teacher" | "admin" | "student";
  userName: string;
}) => {
  return (
    <div className="w-full min-h-screen bg-white">
      <Topbar locale={locale} userName={userName} role={role} />
      {children}
    </div>
  );
};
