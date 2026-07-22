"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Settings,
  SquareArrowRightExit,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type TopbarProps = {
  userName: string;
  locale: string;
  role?: "teacher" | "admin" | "student";
};

type MenuItem =
  | {
      type: "link";
      label: string;
      href: string;
      icon: LucideIcon;
    }
  | {
      type: "action";
      id: "logout";
      label: string;
      icon: LucideIcon;
    };

type NavMenuItem = {
  label: string;
  href: string;
};

const menuItems: MenuItem[] = [
  {
    type: "link",
    label: "Perfil",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    type: "link",
    label: "Configuración",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    type: "action",
    id: "logout",
    label: "Cerrar sesión",
    icon: SquareArrowRightExit,
  },
];

const navMenuItems: NavMenuItem[] = [
  { label: "Inicio", href: "/dashboard" },
  { label: "Cursos", href: "/dashboard/courses" },
  { label: "Libro de clases", href: "/dashboard/calendar" },
  { label: "Recursos", href: "/dashboard/resources" },
  { label: "Estudiantes", href: "/dashboard/students" },
  { label: "Lecciones", href: "/dashboard/lessons" },
];

const roleLabels: Record<NonNullable<TopbarProps["role"]>, string> = {
  teacher: "Profesora",
  admin: "Administración",
  student: "Estudiante",
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export const Topbar = ({ userName, locale, role }: TopbarProps) => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const displayName = userName.trim() || "Usuario";
  const initials = getInitials(userName);
  const roleLabel = role ? roleLabels[role] : "Estudiante";
  const hasNotifications = true; // TODO: conectar con el estado real de notificaciones.

  const withLocale = (path: string) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const localePrefix = `/${locale}`;

    if (
      normalizedPath === localePrefix ||
      normalizedPath.startsWith(`${localePrefix}/`)
    ) {
      return normalizedPath;
    }

    return `${localePrefix}${normalizedPath}`;
  };

  const isNavItemActive = (item: NavMenuItem) => {
    const href = withLocale(item.href);

    if (item.href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const toggleMenu = () => {
    setIsOpen((current) => !current);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((current) => !current);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    void signOut({ callbackUrl: "/login" });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#30343f]">
      <div className="relative mx-auto flex h-16 w-full max-w-screen-2xl items-center px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-32 flex-1 items-center gap-2 sm:min-w-40 sm:gap-3 lg:min-w-56">
          <Link
            href={withLocale("/dashboard")}
            aria-label="Ir al inicio del dashboard"
            className="relative h-10 w-24 shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040] focus-visible:ring-offset-2 focus-visible:ring-offset-[#30343f] lg:h-12 lg:w-32"
          >
            <span className="absolute inset-0 overflow-hidden rounded-md">
              <span className="absolute top-1/2 left-0 h-[54px] w-full -translate-y-1/2 lg:h-[72px]">
                <Image
                  src="/assets/LogoCostaSpanishVersionVerticalv2.png"
                  alt="CostaSpanish Academy"
                  fill
                  sizes="(min-width: 1024px) 128px, 96px"
                  className="object-contain object-left"
                  priority
                />
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-label={
              isMobileMenuOpen
                ? "Cerrar menú de navegación"
                : "Abrir menú de navegación"
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            className="grid size-10 shrink-0 place-items-center rounded-full text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040] focus-visible:ring-offset-2 focus-visible:ring-offset-[#30343f] lg:hidden"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav
          aria-label="Navegación principal"
          className="hidden shrink-0 items-center gap-0.5 lg:flex xl:gap-1"
        >
          {navMenuItems.map((item) => {
            const href = withLocale(item.href);
            const isActive = isNavItemActive(item);

            return (
              <Link
                key={item.href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`relative whitespace-nowrap rounded-md px-2.5 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040] focus-visible:ring-offset-2 focus-visible:ring-offset-[#30343f] xl:px-3 xl:text-sm ${
                  isActive
                    ? "bg-white/6 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-2 right-3 left-3 h-0.5 rounded-full bg-[#ef4444]"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex min-w-32 flex-1 items-center justify-end gap-1 sm:min-w-40 sm:gap-2 lg:min-w-56">
          <button
            type="button"
            aria-label="Notificaciones"
            title="Notificaciones"
            className="relative grid size-10 shrink-0 place-items-center rounded-full text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040] focus-visible:ring-offset-2 focus-visible:ring-offset-[#30343f]"
          >
            <Bell size={19} />
            {hasNotifications && (
              <span
                aria-hidden="true"
                className="absolute top-2 right-2 size-2 rounded-full bg-[#e34040] ring-2 ring-[#30343f]"
              />
            )}
          </button>

          <div ref={userMenuRef} className="relative min-w-0">
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={isOpen}
              aria-haspopup="menu"
              aria-controls="user-menu"
              className={`flex min-h-10 max-w-52 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040] focus-visible:ring-offset-2 focus-visible:ring-offset-[#30343f] ${
                isOpen ? "bg-white/10" : ""
              }`}
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e34040]/15 text-xs font-semibold text-[#ff6b6b] ring-1 ring-[#e34040]/30">
                {initials}
              </span>
              <span className="hidden max-w-28 truncate text-sm font-medium text-white md:block 2xl:max-w-36">
                {displayName}
              </span>
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={`shrink-0 text-gray-400 transition-transform duration-150 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div
              id="user-menu"
              role="menu"
              aria-hidden={!isOpen}
              className={`absolute top-full right-0 z-50 mt-2 w-60 max-w-[calc(100vw-2rem)] origin-top-right rounded-xl border border-white/10 bg-[#272a33] p-2 text-white shadow-xl transition-all duration-150 ease-out ${
                isOpen
                  ? "visible translate-y-0 scale-100 opacity-100"
                  : "pointer-events-none invisible -translate-y-1 scale-95 opacity-0"
              }`}
            >
              <div className="border-b border-white/10 px-2 pt-1 pb-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#e34040]/15 text-xs font-semibold text-[#ff6b6b] ring-1 ring-[#e34040]/30">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-400">{roleLabel}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;

                  if (item.type === "action") {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="menuitem"
                        tabIndex={isOpen ? 0 : -1}
                        onClick={handleLogout}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-300 transition-colors duration-150 hover:bg-[#e34040]/10 hover:text-[#ff7b7b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040]"
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span>{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={withLocale(item.href)}
                      role="menuitem"
                      tabIndex={isOpen ? 0 : -1}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-300 transition-colors duration-150 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040]"
                    >
                      <Icon size={17} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        id="mobile-navigation"
        aria-hidden={!isMobileMenuOpen}
        className={`overflow-hidden border-t bg-[#272a33] transition-all duration-200 ease-out lg:hidden ${
          isMobileMenuOpen
            ? "visible max-h-[32rem] border-white/10 opacity-100"
            : "pointer-events-none invisible max-h-0 border-transparent opacity-0"
        }`}
      >
        <nav
          aria-label="Navegación móvil"
          className="mx-auto flex max-w-screen-2xl flex-col gap-1 px-3 py-3 sm:px-6"
        >
          {navMenuItems.map((item) => {
            const href = withLocale(item.href);
            const isActive = isNavItemActive(item);

            return (
              <Link
                key={item.href}
                href={href}
                tabIndex={isMobileMenuOpen ? 0 : -1}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`relative min-h-11 rounded-lg px-4 py-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e34040] focus-visible:ring-inset ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-[#e34040]"
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
