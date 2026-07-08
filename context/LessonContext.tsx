"use client";

import { createContext, useContext, useState } from "react";

export type LessonViewMode = "day" | "week" | "month";

interface LessonContextValue {
  viewMode: LessonViewMode;
  setViewMode: (value: LessonViewMode) => void;

  selectedDate: Date;
  setSelectedDate: (date: Date) => void;

  goToday: () => void;
  goPrevious: () => void;
  goNext: () => void;
}

const LessonContext = createContext<LessonContextValue | null>(null);

function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function addMonths(date: Date, amount: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + amount);
  return d;
}

export function LessonProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<LessonViewMode>("week");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const goToday = () => {
    setSelectedDate(new Date());
  };

  const goPrevious = () => {
    setSelectedDate((current) => {
      if (viewMode === "day") return addDays(current, -1);
      if (viewMode === "week") return addDays(current, -7);
      return addMonths(current, -1);
    });
  };

  const goNext = () => {
    setSelectedDate((current) => {
      if (viewMode === "day") return addDays(current, 1);
      if (viewMode === "week") return addDays(current, 7);
      return addMonths(current, 1);
    });
  };

  return (
    <LessonContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectedDate,
        setSelectedDate,
        goToday,
        goPrevious,
        goNext,
      }}
    >
      {children}
    </LessonContext.Provider>
  );
}

export function useLesson() {
  const context = useContext(LessonContext);

  if (!context) {
    throw new Error("useLesson must be used inside LessonProvider");
  }

  return context;
}
