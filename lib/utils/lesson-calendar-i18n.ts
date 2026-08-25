import type { LessonCalendarView } from "@/lib/utils/lesson-calendar";

const COPY = {
  es: {
    views: { day: "Día", week: "Semana", month: "Mes", list: "Lista" },
    today: "Hoy",
    newLesson: "Nueva lección",
    newLessonShort: "Nueva",
    previous: {
      day: "Día anterior",
      week: "Semana anterior",
      month: "Mes anterior",
      list: "Semana anterior",
    },
    next: {
      day: "Día siguiente",
      week: "Semana siguiente",
      month: "Mes siguiente",
      list: "Semana siguiente",
    },
    loading: "Cargando lecciones…",
    emptyCalendar: "No hay lecciones en este periodo",
    emptyList: "No hay lecciones programadas en esta semana.",
    loadError: "No se pudieron cargar las lecciones.",
    retry: "Reintentar",
    prepared: "Preparada",
    needsPreparation: "Por preparar",
    more: (count: number) => `+${count} más`,
    moreHint: (count: number) => `Ver ${count} lecciones más`,
    viewLesson: (title: string, date: string, time: string) =>
      `Ver lección ${title}, ${date}, ${time}`,
  },
  en: {
    views: { day: "Day", week: "Week", month: "Month", list: "List" },
    today: "Today",
    newLesson: "New lesson",
    newLessonShort: "New",
    previous: {
      day: "Previous day",
      week: "Previous week",
      month: "Previous month",
      list: "Previous week",
    },
    next: {
      day: "Next day",
      week: "Next week",
      month: "Next month",
      list: "Next week",
    },
    loading: "Loading lessons…",
    emptyCalendar: "There are no lessons in this period",
    emptyList: "There are no scheduled lessons in this week.",
    loadError: "Lessons could not be loaded.",
    retry: "Retry",
    prepared: "Prepared",
    needsPreparation: "Needs preparation",
    more: (count: number) => `+${count} more`,
    moreHint: (count: number) => `View ${count} more lessons`,
    viewLesson: (title: string, date: string, time: string) =>
      `View lesson ${title}, ${date}, ${time}`,
  },
} as const;

export function getLessonCalendarCopy(locale: string) {
  return locale === "es" ? COPY.es : COPY.en;
}

export function getLessonViewLabel(locale: string, view: LessonCalendarView) {
  return getLessonCalendarCopy(locale).views[view];
}
