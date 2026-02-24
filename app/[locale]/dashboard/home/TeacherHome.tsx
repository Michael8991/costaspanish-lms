import { Hello } from "@/components";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Link from "next/link";

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
    <div className="w-full container mx-auto my-10">
      <div className="text-black">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          Hola, {session.user.name}!
          <Hello />
        </h1>
        <p className="text-sm text-gray-500 italic">{formattedDate}</p>
      </div>
      <div className="w-full my-4 text-black flex flex-col">
        <p className="font-bold my-2">Today&apos;s Schedule</p>
        <div>
          <Link
            href="/api/integrations/google/start"
            className="inline-flex items-center rounded-md border px-4 py-2 text-sm"
          >
            Connect Google Calendar
          </Link>
        </div>
      </div>
    </div>
  );
}
