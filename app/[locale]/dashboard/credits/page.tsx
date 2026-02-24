import { Hello } from "@/components";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export default async function CreditsPage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;
  return (
    <div className="container my-10 w-full flex align-middle mx-auto min-h-screen text-black">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Icons</h1>
        <div className="flex gap-2 text-sm items-center">
          <Hello />
          <a
            href="https://iconscout.com/icons/hola"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Hola
          </a>{" "}
          by{" "}
          <a
            href="https://iconscout.com/es/contributors/fluent-emoji/:assets"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Fluent Emoji
          </a>{" "}
          (
          <a
            href="https://www.microsoft.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Microsoft
          </a>
          )
        </div>
      </div>
    </div>
  );
}
