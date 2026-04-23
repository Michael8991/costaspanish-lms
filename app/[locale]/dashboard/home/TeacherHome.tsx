import { GoogleConnected, Hello } from "@/components";
import TeacherTodaySchedule from "@/components/dashboard/teacher/TeacherTodaySchedule";
import { OnProgressPage } from "@/components/ui/onProgressPage/OnProgressPage";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function TeacherHome({ locale }: { locale: string }) {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const today = new Date();

  const formattedDate = today.toLocaleDateString(
    locale === "es" ? "es-ES" : "en-GB",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      {/* Header de bienvenida */}
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          Hola, {session.user.name}!
          <Hello />
        </h1>
        <p className="mt-0.5 text-sm text-gray-400 italic capitalize">
          {formattedDate}
        </p>
      </div>

      {/* Card del horario */}
      <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header de la card */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-[#30343f] px-5 py-4">
          <div className="flex items-center gap-2.5">
            {/* Dot decorativo */}
            <span className="h-2 w-2 rounded-full bg-[#9e2727] animate-pulse" />
            <p className="font-semibold text-white tracking-wide text-sm">
              Today&apos;s Schedule
            </p>
          </div>
          <GoogleConnected />
        </div>

        {/* Contenido */}
        <div className="p-4">
          <TeacherTodaySchedule />
        </div>
      </div>
      <OnProgressPage locale={locale} />
    </div>
  );
}
