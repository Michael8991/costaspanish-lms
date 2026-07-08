"use client";

import { useLesson } from "@/context/LessonContext";
import AddButtonLink, {
  ViewModeSwitcher,
} from "@/components/ui/buttons/CustomizedButtons";

interface LessonHeaderProps {
  locale: string;
}

function capitalizeFirst(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getMonthYearLabel(date: Date) {
  const label = date.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  return capitalizeFirst(label);
}

function getMonthShortLabel(date: Date) {
  return date
    .toLocaleDateString("es-ES", {
      month: "short",
    })
    .replace(".", "")
    .toUpperCase();
}

function getDayNumberLabel(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
  });
}

function formatFullDay(date: Date) {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDayMonth(date: Date) {
  const day = date.getDate();

  const month = date.toLocaleDateString("es-ES", {
    month: "long",
  });

  return `${day} ${month}`;
}

function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const day = d.getDay(); // 0 domingo, 1 lunes...
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);

  return d;
}

function endOfWeekSunday(date: Date) {
  const start = startOfWeekMonday(date);
  const end = new Date(start);

  end.setDate(start.getDate() + 6);

  return end;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getRangeLabel(viewMode: "day" | "week" | "month", selectedDate: Date) {
  if (viewMode === "day") {
    return formatFullDay(selectedDate);
  }

  if (viewMode === "week") {
    const start = startOfWeekMonday(selectedDate);
    const end = endOfWeekSunday(selectedDate);

    return `${formatDayMonth(start)} - ${formatDayMonth(end)}`;
  }

  const start = startOfMonth(selectedDate);
  const end = endOfMonth(selectedDate);

  return `${formatDayMonth(start)} - ${formatDayMonth(end)}`;
}

export default function LessonsHeader({ locale }: LessonHeaderProps) {
  const { viewMode, setViewMode, selectedDate } = useLesson();

  const link = `/${locale}/dashboard/lessons/add`;

  const monthShortLabel = getMonthShortLabel(selectedDate);
  const dayNumberLabel = getDayNumberLabel(selectedDate);
  const monthYearLabel = getMonthYearLabel(selectedDate);
  const rangeLabel = getRangeLabel(viewMode, selectedDate);

  return (
    <div className="my-3 flex w-full items-center justify-between">
      <div className="flex items-center justify-center gap-2">
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 px-4 py-2">
          <span className="text-sm font-bold uppercase text-gray-500">
            {monthShortLabel}
          </span>

          <span className="text-lg font-bold text-gray-900">
            {dayNumberLabel}
          </span>
        </div>

        <div className="flex flex-col justify-center">
          <span className="text-lg font-bold text-gray-900">
            {monthYearLabel}
          </span>

          <span className="text-sm text-gray-500">{rangeLabel}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3">
        <ViewModeSwitcher value={viewMode} onChange={setViewMode} />

        <AddButtonLink
          text="Nueva lección"
          alternativeText="Nueva"
          link={link}
        />
      </div>
    </div>
  );
}
