"use client";

import FullCalendar, {
  type CalendarRef,
  type EventClickInfo,
  type EventDisplayInfo,
  type EventInput,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import esLocale from "@fullcalendar/react/locales/es";
import enGbLocale from "@fullcalendar/react/locales/en-gb";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import classicThemePlugin from "@fullcalendar/react/themes/classic";
import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";

import LessonCalendarEvent from "@/components/dashboard/lessons/calendar/LessonCalendarEvent";
import { useLesson } from "@/context/LessonContext";
import type { LessonListDTO } from "@/lib/dto/lesson.dto";
import { getLessonCalendarHours } from "@/lib/utils/lesson-calendar";
import { getLessonCalendarCopy } from "@/lib/utils/lesson-calendar-i18n";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import "./lessons-calendar.css";

interface LessonsCalendarProps {
  lessons: LessonListDTO[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const VIEW_BY_MODE = {
  day: "timeGridDay",
  week: "timeGridWeek",
  month: "dayGridMonth",
} as const;

export default function LessonsCalendar({
  lessons,
  isLoading,
  error,
  onRetry,
}: LessonsCalendarProps) {
  const calendarRef = useRef<CalendarRef>(null);
  const router = useRouter();
  const { locale, viewMode, selectedDate, navigateTo } = useLesson();
  const copy = getLessonCalendarCopy(locale);
  const calendarView = viewMode === "list" ? "timeGridWeek" : VIEW_BY_MODE[viewMode];
  const calendarHours = useMemo(
    () => getLessonCalendarHours(lessons),
    [lessons],
  );
  const events = useMemo<EventInput[]>(
    () =>
      lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        start: lesson.scheduledStart,
        end: lesson.scheduledEnd,
        allDay: false,
        url: `/${locale}/dashboard/lessons/${lesson.id}`,
        extendedProps: { lesson },
      })),
    [lessons, locale],
  );

  useEffect(() => {
    const api = calendarRef.current?.getApi();
    if (!api) return;

    if (api.view.type !== calendarView) api.changeView(calendarView);
    api.gotoDate(selectedDate);
  }, [calendarView, selectedDate]);

  const getAccessibleEventLabel = (info: EventDisplayInfo) => {
    const lesson = info.event.extendedProps.lesson as LessonListDTO;
    const start = new Date(lesson.scheduledStart);
    const end = new Date(lesson.scheduledEnd);
    const resolvedLocale = locale === "es" ? "es-ES" : "en-GB";
    const date = new Intl.DateTimeFormat(resolvedLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    }).format(start);
    const timeFormatter = new Intl.DateTimeFormat(resolvedLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });

    return copy.viewLesson(
      lesson.title,
      date,
      `${timeFormatter.format(start)}–${timeFormatter.format(end)}`,
    );
  };

  const handleEventClick = (info: EventClickInfo) => {
    info.jsEvent.preventDefault();
    const lesson = info.event.extendedProps.lesson as LessonListDTO;
    router.push(`/${locale}/dashboard/lessons/${lesson.id}`);
  };

  return (
    <section
      data-testid="lessons-calendar"
      data-calendar-view={viewMode}
      aria-busy={isLoading}
      className="lessons-calendar-surface relative min-w-0 overflow-hidden rounded-xl border border-gray-100/80 bg-white shadow-sm"
    >
      <div
        className={`lessons-calendar-horizontal-scroll ${
          viewMode === "week" ? "is-week" : ""
        }`}
      >
        <div className="lessons-calendar-shell">
          <FullCalendar
          ref={calendarRef}
          plugins={[
            classicThemePlugin,
            dayGridPlugin,
            timeGridPlugin,
            interactionPlugin,
          ]}
          locale={locale === "es" ? esLocale : enGbLocale}
          timeZone="local"
          initialView={calendarView}
          initialDate={selectedDate}
          headerToolbar={false}
          height="100%"
          firstDay={1}
          weekends
          allDaySlot={false}
          nowIndicator
          nowIndicatorSnap="auto"
          slotDuration="00:30:00"
          slotHeaderInterval="01:00:00"
          slotMinHeight={28}
          slotMinTime={calendarHours.slotMinTime}
          slotMaxTime={calendarHours.slotMaxTime}
          scrollTime="08:00:00"
          scrollTimeReset={false}
          slotEventOverlap={false}
          eventMinHeight={24}
          eventShortHeight={34}
          eventInteractive
          editable={false}
          selectable={false}
          fixedWeekCount
          showNonCurrentDates
          dayMaxEvents={3}
          eventOrder="start,title"
          eventOrderStrict
          displayEventEnd
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          slotHeaderFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          dayHeaderFormat={{ weekday: "short", day: "numeric" }}
          events={events}
          eventContent={(info) => (
            <LessonCalendarEvent info={info} locale={locale} />
          )}
          eventClass={(info) => {
            const lesson = info.event.extendedProps.lesson as LessonListDTO;
            return [
              "lesson-calendar-event",
              `lesson-calendar-event--${lesson.status}`,
              info.view.type === "dayGridMonth"
                ? "lesson-calendar-event--month"
                : "lesson-calendar-event--timegrid",
            ].join(" ");
          }}
          eventDidMount={(info) => {
            const label = getAccessibleEventLabel(info);
            info.el.setAttribute("aria-label", label);
            info.el.setAttribute("title", label);
          }}
          eventClick={handleEventClick}
          dateClick={(info) => navigateTo(info.date, "day")}
          moreLinkContent={(info) => copy.more(info.num)}
          moreLinkHint={(count) => copy.moreHint(count)}
          moreLinkClick={(info) => {
            navigateTo(info.date, "day");
            return "timeGridDay";
          }}
          viewClass="lessons-calendar-view"
          tableClass="lessons-calendar-table"
          dayHeaderClass={(info) =>
            [
              "lessons-calendar-day-header",
              info.isToday ? "is-today" : "",
            ].join(" ")
          }
          dayCellClass={(info) =>
            [
              "lessons-calendar-day-cell",
              info.isToday ? "is-today" : "",
              info.isOther ? "is-outside-month" : "",
            ].join(" ")
          }
          slotLaneClass="lessons-calendar-slot-lane"
          slotHeaderClass="lessons-calendar-slot-header"
          moreLinkClass="lessons-calendar-more-link"
          nowIndicatorLineClass="lessons-calendar-now-line"
          nowIndicatorDotClass="lessons-calendar-now-dot"
          />
        </div>
      </div>

      {isLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-2 border-b border-gray-100 bg-white/90 px-4 py-2 text-xs font-medium text-gray-600 backdrop-blur-sm">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-b-[#9e2727]" />
          {copy.loading}
        </div>
      )}

      {!isLoading && !error && lessons.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 flex justify-center px-4">
          <span className="rounded-full border border-gray-200/80 bg-white/90 px-3 py-1.5 text-xs text-gray-500 shadow-sm backdrop-blur-sm">
            {copy.emptyCalendar}
          </span>
        </div>
      )}

      {!isLoading && error && (
        <div className="absolute inset-x-4 top-16 z-20 mx-auto flex max-w-lg flex-col items-center gap-2 rounded-xl border border-red-100 bg-white/95 p-4 text-center shadow-lg backdrop-blur-sm">
          <p className="text-sm font-medium text-red-700">{copy.loadError}</p>
          <p className="text-xs text-gray-500">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            {copy.retry}
          </button>
        </div>
      )}
    </section>
  );
}
