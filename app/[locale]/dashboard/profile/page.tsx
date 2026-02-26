import { authOptions } from "@/lib/auth";
import { Globe, Mail, Shield, User } from "lucide-react";
import { getServerSession } from "next-auth";
export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  return (
    <div className="container mx-auto py-8 px-4 md:px-8 text-gray-800 max-w-6xl">
      <div className="w-full flex flex-col items-start">
        <h1 className="w-full text-2xl text-black font-bold">
          Account Settings
        </h1>
        <div className="w-full text-black rounded-lg border border-gray-200 p-4 mt-4">
          <h2 className="text-xl font-black">Basic details</h2>
          <div className="flex flex-col my-2">
            <p className="flex gap-2 mb-1 items-center">
              <User size={18} />
              Name
            </p>
            <p className="border border-gray-200 py-2 px-4 w-fit rounded-lg">
              {session.user.name}
            </p>
          </div>
          <div className="flex flex-col my-2">
            <p className="flex gap-2 mb-1 items-center">
              <Shield size={18} />
              Role
            </p>
            <p className="border border-gray-200 py-2 px-4 w-fit rounded-lg">
              {session.user.role}
            </p>
          </div>
          <div className="flex flex-col my-2">
            <p className="flex gap-2 mb-1 items-center">
              <Mail size={18} />
              Email
            </p>
            <p className="border border-gray-200 py-2 px-4 w-fit rounded-lg">
              {session.user.email}
            </p>
          </div>
          <div className="flex flex-col my-2">
            <p className="flex gap-2 mb-1 items-center">
              <Globe size={18} />
              Preferred language
            </p>
            <p className="border border-gray-200 py-2 px-4 w-fit rounded-lg">
              {session.user.preferredLanguage}
            </p>
          </div>
        </div>
        <div className="w-full text-black rounded-lg border border-gray-200 p-4 mt-4">
          <h2 className="text-xl font-black">Delete profile</h2>
          <p className="text-md text-black">
            Delete your account and all your source data. This is irreversible.
          </p>
          <div className="w-full flex items-center justify-center mt-2">
            <button className="py-2 px-4 bg-red-600 rounded-lg text-white shadow-md hover:cursor-pointer hover:bg-red-700 transition-all duration-200 ease-in-out">
              Delete account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
