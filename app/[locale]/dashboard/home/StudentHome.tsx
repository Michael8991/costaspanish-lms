import { Hello } from "@/components";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function StudentHome({ locale }: { locale: string }) {
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
    </div>
  );
}
