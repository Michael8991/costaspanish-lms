import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({
  items,
  locale,
}: {
  items: BreadcrumbItem[];
  locale: string;
}) {
  return (
    <nav className="flex items-center text-sm text-gray-500 font-medium w-full my-1">
      <Link
        href={`/${locale}/dashboard`}
        className="hover:text-[#9e2727] transition-colors flex items-center gap-1"
      >
        <Home size={14} />
        <span className="hidden sm:inline">Dashboard</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight size={14} className="mx-2 text-gray-400 shrink-0" />

          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-[#9e2727] transition-colors whitespace-nowrap"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 truncate max-w-30 sm:max-w-none">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
