"use client";

import {
  Bell,
  ChevronDown,
  LucideIcon,
  Settings,
  SquareArrowRightExit,
  User,
  Menu, // 🔥 Añadido para el menú hamburguesa
  X, // 🔥 Añadido para cerrar el menú hamburguesa
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
const navMenuItemsTeacher: NavMenuItem[] = [
  { label: "Home", href: "/dashboard" },
  { label: "Course", href: "/course" },
  { label: "Calendar", href: "/calendar" },
  { label: "Material", href: "/material" },
  { label: "Students", href: "/dashboard/students" },
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsOpen((prev) => !prev);
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev);

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

  const activeNavItems =
    role === "teacher" || role === "admin" ? navMenuItemsTeacher : navMenuItems;

  return (
    <div className="relative flex flex-col w-full bg-[#30343f] shadow-md z-50">
      <div className="flex justify-between items-center lg:grid lg:grid-cols-3 py-2 px-4 md:px-10 w-full min-h-25 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="relative w-30 h-20 md:w-37.5 md:h-20">
            <Image
              src="/assets/LogoCostaSpanishRojoCoralFuerte.png"
              alt="Logo Costa Spanish"
              fill
              className="object-contain"
              priority
            />
          </div>
          <button
            className="lg:hidden text-white p-1 focus:outline-none"
            onClick={toggleMobileMenu}
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        <div className="hidden lg:flex w-full items-center justify-center gap-6 xl:gap-5">
          {activeNavItems.map((item, index) => (
            <Link
              key={index}
              className="hover:bg-[#55565a] text-white py-2 px-4 rounded-lg transition-all duration-200 ease-in-out font-medium"
              href={withLocale(item.href)}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex w-full items-center justify-end gap-2 md:gap-4">
          <div className="p-2 border-[#9e2727] border-2 rounded-lg text-white hover:bg-[#9e2727] transition cursor-pointer hidden sm:block">
            <Bell size={20} />
          </div>

          <div ref={ref} className="relative inline-block text-center">
            <button
              onClick={toggleMenu}
              className="relative flex rounded-lg bg-[#9e2727] py-2 px-3 md:px-6 items-center gap-2 hover:bg-[#9e4141] transition duration-200 ease-in-out text-white"
            >
              <div className="hidden sm:flex flex-col text-left">
                <p className="font-semibold text-sm md:text-base truncate max-w-[100px] xl:max-w-full">
                  {userName}
                </p>
                <p className="text-gray-200 italic text-xs capitalize hidden md:block">
                  {role || "Student"} of CostaSpanish
                </p>
              </div>

              {/* Icono por defecto visible solo en móvil cuando se oculta el texto */}
              <User size={20} className="sm:hidden" />

              <ChevronDown
                size={18}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>

            {/* Dropdown del Perfil */}
            <div
              className={`
                absolute right-0 mt-3 min-w-[200px] z-50
                flex flex-col rounded-lg bg-[#9e2727] py-3 px-4 shadow-xl gap-2
                origin-top-right transform transition-all duration-200 ease-out text-white border border-[#b84242]
                ${isOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"}
              `}
            >
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={withLocale(item.href)}
                    className="flex gap-3 items-center px-3 py-2 hover:bg-[#a85d5d] rounded-lg transition duration-200 ease-in-out"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`
          lg:hidden w-full bg-[#272a33] border-t border-gray-700 overflow-hidden transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? "max-h-[400px] opacity-100 border-opacity-100" : "max-h-0 opacity-0 border-opacity-0"}
        `}
      >
        <div className="flex flex-col px-4 py-4 gap-2">
          {activeNavItems.map((item, index) => (
            <Link
              key={index}
              className="text-white hover:bg-[#55565a] py-3 px-4 rounded-lg transition-colors font-medium"
              href={withLocale(item.href)}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.label}
            </Link>
          ))}

          <div className="sm:hidden border-t border-gray-600 mt-2 pt-4 flex items-center gap-3 px-4 text-white">
            <Bell size={20} />
            <span>Notificaciones</span>
          </div>
        </div>
      </div>
    </div>
  );
};
