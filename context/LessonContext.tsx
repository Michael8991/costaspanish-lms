"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, useContext, useMemo } from "react";

import { dateValueToLocalDate, formatLocalDateValue } from "@/lib/utils/lesson-datetime";
import {
  getLessonViewNavigationDate,
  getTodayLessonDateValue,
  type LessonCalendarView,
} from "@/lib/utils/lesson-calendar";

export type LessonViewMode = LessonCalendarView;

interface LessonContextValue {
  locale: string;
  viewMode: LessonViewMode;
  selectedDate: Date;
  selectedDateValue: string;
  setViewMode: (value: LessonViewMode) => void;
  setSelectedDate: (date: Date) => void;
  navigateTo: (date: Date, view?: LessonViewMode) => void;
  goToday: () => void;
  goPrevious: () => void;
  goNext: () => void;
}

const LessonContext = createContext<LessonContextValue | null>(null);

interface LessonProviderProps {
  children: React.ReactNode;
  locale: string;
  initialViewMode: LessonViewMode;
  initialDateValue: string;
}

export function LessonProvider({
  children,
  locale,
  initialViewMode,
  initialDateValue,
}: LessonProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedDate = useMemo(
    () => dateValueToLocalDate(initialDateValue) ?? new Date(),
    [initialDateValue],
  );

  const updateUrl = (view: LessonViewMode, date: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", view);
    params.set("date", formatLocalDateValue(date));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const navigateTo = (date: Date, view = initialViewMode) => {
    updateUrl(view, date);
  };

  const value: LessonContextValue = {
    locale,
    viewMode: initialViewMode,
    selectedDate,
    selectedDateValue: initialDateValue,
    setViewMode: (view) => updateUrl(view, selectedDate),
    setSelectedDate: (date) => updateUrl(initialViewMode, date),
    navigateTo,
    goToday: () => {
      const today = dateValueToLocalDate(getTodayLessonDateValue());
      if (today) updateUrl(initialViewMode, today);
    },
    goPrevious: () =>
      updateUrl(
        initialViewMode,
        getLessonViewNavigationDate(initialViewMode, selectedDate, -1),
      ),
    goNext: () =>
      updateUrl(
        initialViewMode,
        getLessonViewNavigationDate(initialViewMode, selectedDate, 1),
      ),
  };

  return (
    <LessonContext.Provider value={value}>{children}</LessonContext.Provider>
  );
}

export function useLesson() {
  const context = useContext(LessonContext);

  if (!context) {
    throw new Error("useLesson must be used inside LessonProvider");
  }

  return context;
}
