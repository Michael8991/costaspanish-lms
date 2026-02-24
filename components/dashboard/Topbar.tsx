"use client";

import {
  Bell,
  ChevronDown,
  LucideIcon,
  Settings,
  SquareArrowRightExit,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MenuItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const menuItems: MenuItem[] = [
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
  { label: "Log out", href: "/logout", icon: SquareArrowRightExit },
];

type NavMenuItem = {
  label: string;
  href: string;
};

const navMenuItems: NavMenuItem[] = [
  { label: "Home", href: "/dashboard" },
  { label: "Course", href: "/course" },
  { label: "Calendar", href: "/calendar" },
  { label: "Material", href: "/material" },
];

export const Topbar = ({
  userName,
  locale,
  role,
}: {
  userName: string;
  locale: string;
  role?: "teacher" | "admin" | "student";
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  const ref = useRef<HTMLDivElement>(null);

  const withLocale = (path: string) =>
    `/${locale}${path.startsWith("/") ? path : `/${path}`}`;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
          {navMenuItems.map((item, index) => (
            <Link
              key={index}
              className="hover:bg-[#55565a] py-2 px-4 rounded-lg transition-all duration-200 ease-in-out"
              href={withLocale(item.href)}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="userPanelContainer flex w-full items-center justify-end">
          <div className="p-2 border-[#9e2727] border-2 rounded-lg me-2">
            <Bell />
          </div>
          <div ref={ref} className="relative inline-block text-center">
            <button
              onClick={toggleMenu}
              className="relative flex rounded-lg bg-[#9e2727] py-2 px-6 items-center gap-2 hover:bg-[#9e4141] transition duration-200 ease-in-out hover:cursor-pointer"
            >
              <div className="flex flex-col text-left">
                <p>{userName}</p>
                <p className="text-gray-200 italic text-sm">
                  {role} of CostaSpanish
                </p>
              </div>

              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            <div
              className={`
                absolute right-0 mt-2 min-w-51 z-50
                flex flex-col rounded-lg bg-[#9e2727] py-3 px-4 shadow-lg gap-3
                origin-top-right transform transition-all duration-200 ease-out
                ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
              `}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={withLocale(item.href)}
                    className="flex gap-2 items-center px-2 py-1 hover:bg-[#a85d5d] rounded-lg transition duration-200 ease-in-out"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
