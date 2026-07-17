"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

export const btnBaseStyles =
  "flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all";

export const btnVariants = {
  primary: "bg-[#9e2727] text-white hover:bg-[#8d2323]",
  secondary:
    "cursor-pointer border border-gray-200 bg-white text-gray-900 transition hover:bg-gray-50",
};

interface AddButtonLinkProps {
  text: string;
  alternativeText?: string;
  link: string;
}

export default function AddButtonLink({
  text,
  link,
  alternativeText = "Nuevo",
}: AddButtonLinkProps) {
  return (
    <Link href={link} className={`${btnBaseStyles} ${btnVariants.primary}`}>
      <Plus size={16} />
      <span className="hidden sm:inline">{text}</span>
      <span className="sm:hidden">{alternativeText}</span>
    </Link>
  );
}

export type ViewMode = "day" | "week" | "month";

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

interface ViewModeSwitcherProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

export function ViewModeSwitcher({ value, onChange }: ViewModeSwitcherProps) {
  const currentIndex = Math.max(
    0,
    VIEW_MODES.findIndex((mode) => mode.value === value),
  );

  const currentMode = VIEW_MODES[currentIndex];

  const goPrevious = () => {
    const previousIndex =
      currentIndex === 0 ? VIEW_MODES.length - 1 : currentIndex - 1;

    onChange(VIEW_MODES[previousIndex].value);
  };

  const goNext = () => {
    const nextIndex =
      currentIndex === VIEW_MODES.length - 1 ? 0 : currentIndex + 1;

    onChange(VIEW_MODES[nextIndex].value);
  };

  return (
    <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white text-sm font-medium shadow-sm">
      <button
        type="button"
        onClick={goPrevious}
        className="flex cursor-pointer items-center justify-center rounded-l-xl px-2 py-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        aria-label="Vista anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        className="min-w-24 border-x border-gray-200 px-4 py-2 text-gray-900"
        aria-label={`Vista actual: ${currentMode.label}`}
      >
        {currentMode.label}
      </button>

      <button
        type="button"
        onClick={goNext}
        className="flex cursor-pointer items-center justify-center rounded-r-xl p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
        aria-label="Vista siguiente"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
