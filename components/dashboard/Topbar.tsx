"use client";

import { Bell, ChevronDown, Cog, SquareArrowRightExit } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export const Topbar = ({
  userName,
  locale,
  role,
}: {
  userName: string;
  locale: string;
  role?: "teacher" | "admin" | "student";
}) => {
  return (
    <div className="flex w-full max-h-25 bg-[#30343f] shadow-md">
      <div className="logoContainer max-h-25 grid grid-cols-2 lg:grid-cols-3 py-1 px-10 w-full">
        <div className="flex">
          <div className="relative w-23 h-23">
            <Image
              src="/assets/LogoCostaSpanishRojoCoralFuerte.png"
              alt="Logo Costa Spanish"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        <div className="navBarContainer flex w-full items-center justify-center gap-10">
          <Link href={`{locale}/dashboard`}>Home</Link>
          <Link href={`${locale}/dashboard`}>Home</Link>
          <Link href={`${locale}/dashboard`}>Home</Link>
        </div>
        <div className="userPanelContainer flex w-full items-center justify-end">
          <div className="p-2 border-[#9e2727] border-2 rounded-lg me-2">
            <Bell />
          </div>
          <div className="relative flex rounded-lg bg-[#9e2727] py-2 px-6 align-middle items-center gap-2 hover:bg-[#9e4141] hover:cursor-pointer transition duration-200 ease-in-out">
            <div className="flex flex-col">
              <p>{userName}</p>
              <p className="text-gray-200 italic text-sm ">
                {role} of CostaSpanish
              </p>
            </div>
            <ChevronDown />
          </div>
          <div className="absolute flex flex-col rounded-lg bg-[#9e2727] py-3 px-4 mt-60 right-10 min-w-51 shadow-lg gap-3">
            <Link
              href={`#`}
              className="flex gap-2 items-start px-2 py-1 hover:bg-[#a85d5d] rounded-lg align-middle transition duration-200 ease-in-out "
            >
              <Cog />
              Settings
            </Link>
            <Link
              href={`#`}
              className="flex gap-2 items-start px-2 py-1 hover:bg-[#a85d5d] rounded-lg align-middle transition duration-200 ease-in-out "
            >
              <SquareArrowRightExit />
              Log Out
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
