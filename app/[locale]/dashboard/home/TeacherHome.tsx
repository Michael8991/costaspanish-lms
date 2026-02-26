import { GoogleConnected, Hello } from "@/components";
import TeacherTodaySchedule from "@/components/dashboard/teacher/TeacherTodaySchedule";
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
      <div className="text-black">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          Hola, {session.user.name}!
          <Hello />
        </h1>
        <p className="text-sm text-gray-500 italic">{formattedDate}</p>
      </div>
      <div className="w-full my-4 text-black flex flex-col bg-[#30343f] p-3 rounded-lg shadow-xs">
        <div className="flex mb-2 items-center justify-between">
          <p className="font-semibold my-2 text-white">Today&apos;s Schedule</p>
          <GoogleConnected />
        </div>

        <div>
          <TeacherTodaySchedule />
        </div>
      </div>
    </div>
  );
}
